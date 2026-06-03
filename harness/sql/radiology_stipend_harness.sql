-- ============================================================================
-- RADIOLOGY ER STIPEND HARNESS  —  STARTER SCHEMA + RECONCILIATION
-- ----------------------------------------------------------------------------
-- Purpose : Produce audit-grade ER wRVU and ER professional collections where
--           every aggregate drills to its source 835/837 line AND ties to cash.
-- Dialect : PostgreSQL (portable; maps 1:1 to dbt models / Snowflake / BigQuery).
-- ----------------------------------------------------------------------------
-- PHI WARNING: 837, 835, and RIS exports are PHI end-to-end. Encrypt at rest and
--   in transit, restrict and log all access, and execute BAAs with any vendor or
--   cloud in the data path BEFORE loading a single file.
-- ----------------------------------------------------------------------------
-- LAYER MAP (also the dbt mapping):
--   raw   = immutable source capture (chain of custody)        -> dbt sources
--   stg   = faithfully parsed source, claim-line grain         -> staging models
--   ref   = versioned reference / dimensions (MPFS by year...) -> seeds
--   core  = enriched fact (one row per service line) + views   -> marts
--   recon = control tie-outs (cash / charges / volume)         -> models + tests
-- The audit value is NOT the dashboard. It is: immutable provenance +
-- deterministic transforms + reconciliation to an independent control (the bank).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS recon;

-- ============================================================================
-- RAW  —  chain of custody. Files live in WORM / object-lock storage as-received;
-- this registry is what makes every downstream number traceable to an artifact.
-- ============================================================================
CREATE TABLE raw.source_file (
    file_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_type    TEXT NOT NULL CHECK (file_type IN ('837','835','ris_exam','bank_stmt')),
    file_name    TEXT NOT NULL,
    storage_uri  TEXT NOT NULL,        -- e.g. s3://harness-raw/... (object-lock ON)
    sha256       CHAR(64) NOT NULL,    -- integrity hash computed at ingest
    byte_size    BIGINT NOT NULL,
    period_start DATE,                 -- service / posting period the file covers
    period_end   DATE,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ingested_by  TEXT NOT NULL
);

-- ============================================================================
-- STG  —  parsed source at claim-LINE grain. Faithful to source; no logic yet.
-- ============================================================================

-- Billed lines, parsed from the 837 (what was sent to the payer).
CREATE TABLE stg.claim_837 (
    billed_line_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT NOT NULL REFERENCES raw.source_file(file_id),
    claim_id       TEXT NOT NULL,
    line_number    INT  NOT NULL,
    accession      TEXT,                       -- links to the RIS exam
    patient_token  TEXT,                       -- de-identified surrogate, NOT MRN
    dos            DATE NOT NULL,              -- date of service (drives MPFS year)
    pos_code       TEXT NOT NULL,              -- place of service; '23' = ER
    facility_id    TEXT,
    rendering_npi  TEXT,
    cpt_code       TEXT NOT NULL,
    modifiers      TEXT,                        -- e.g. 26,50,RT
    units          NUMERIC(8,2) NOT NULL DEFAULT 1,
    charge_amount  NUMERIC(12,2) NOT NULL,
    payer_id       TEXT,
    UNIQUE (claim_id, line_number, source_file_id)
);

-- Remittance lines, parsed from the 835 (what was paid + how adjusted).
CREATE TABLE stg.remit_835 (
    remit_line_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id   BIGINT NOT NULL REFERENCES raw.source_file(file_id),
    claim_id         TEXT NOT NULL,
    line_number      INT  NOT NULL,
    cpt_code         TEXT,
    charge_amount    NUMERIC(12,2),
    allowed_amount   NUMERIC(12,2),
    paid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    patient_resp     NUMERIC(12,2) NOT NULL DEFAULT 0,
    adj_group_code   TEXT,                       -- CO / PR / OA / PI
    carc_codes       TEXT,                        -- claim adjustment reason codes
    rarc_codes       TEXT,                        -- remittance advice remark codes
    check_eft_trace  TEXT,                        -- 835 trace # -> ties to the bank
    payment_date     DATE,
    payer_id         TEXT,
    posted_at        TIMESTAMPTZ
);

-- Exam / productivity rows, parsed from the RIS export.
CREATE TABLE stg.ris_exam (
    exam_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id   BIGINT NOT NULL REFERENCES raw.source_file(file_id),
    accession        TEXT NOT NULL,
    dos              DATE NOT NULL,
    exam_cpt         TEXT,
    modality         TEXT,
    ordering_location TEXT,                       -- another ER signal if POS is dirty
    pos_code         TEXT,
    facility_id      TEXT,
    rendering_npi    TEXT,
    finalized_at     TIMESTAMPTZ
);

-- ============================================================================
-- REF  —  versioned reference data. The MPFS table is keyed BY SERVICE YEAR so
-- the 2024 / 2025 (-2.83% CF) / 2026 (-2.5% efficiency adj) differences are
-- explicit and reproducible — never a hidden assumption.
-- ============================================================================
CREATE TABLE ref.mpfs_wrvu (
    cpt_code          TEXT NOT NULL,
    service_year      INT  NOT NULL,
    work_rvu          NUMERIC(8,4) NOT NULL,     -- WORK RVU per unit (not total RVU)
    conversion_factor NUMERIC(8,4),              -- documentation / context only
    PRIMARY KEY (cpt_code, service_year)
);

CREATE TABLE ref.pos_code (
    pos_code    TEXT PRIMARY KEY,
    description TEXT,
    is_er       BOOLEAN NOT NULL DEFAULT FALSE
);
-- Seed the ER definition explicitly:
INSERT INTO ref.pos_code (pos_code, description, is_er) VALUES
    ('23','Emergency Room - Hospital', TRUE),
    ('22','On Campus-Outpatient Hospital', FALSE),
    ('21','Inpatient Hospital', FALSE),
    ('11','Office', FALSE)
ON CONFLICT (pos_code) DO NOTHING;

CREATE TABLE ref.payer (
    payer_id        TEXT PRIMARY KEY,
    payer_name      TEXT,
    financial_class TEXT     -- Commercial / Medicare / Medicaid / SelfPay / Other
);

CREATE TABLE ref.provider (
    rendering_npi TEXT PRIMARY KEY,
    provider_name TEXT,
    subspecialty  TEXT
);

CREATE TABLE ref.facility (
    facility_id   TEXT PRIMARY KEY,
    facility_name TEXT,
    is_er_site    BOOLEAN NOT NULL DEFAULT FALSE   -- fallback ER flag if POS is sparse
);

-- ============================================================================
-- CORE  —  the fact. One row per BILLED service line, enriched with payment and
-- work RVU, lineage columns retained back to the raw files. Defined as a VIEW for
-- the starter; in production snapshot it per reconciliation period and FREEZE the
-- source_file_ids so a closed period can never silently change.
-- ============================================================================
CREATE OR REPLACE VIEW core.fact_service_line AS
SELECT
    c.billed_line_id,
    r.remit_line_id,                                   -- NULL = billed but unpaid/denied
    c.claim_id,
    c.line_number,
    c.accession,
    c.dos,
    EXTRACT(YEAR FROM c.dos)::INT                AS service_year,
    c.pos_code,
    COALESCE(p.is_er, f.is_er_site, FALSE)       AS is_er,
    CASE WHEN COALESCE(p.is_er, f.is_er_site, FALSE)
         THEN 'ER' ELSE 'NON_ER' END             AS segment,
    c.facility_id,
    c.rendering_npi,
    c.payer_id,
    pay.financial_class,
    c.cpt_code,
    c.modifiers,
    c.units,
    -- WORK RVU at the line: per-unit work RVU (year-correct) * units.
    -- NOTE: modifier-driven adjustments (e.g. -50 bilateral, MPPR on payment) are a
    -- documented refinement; the starter takes work_rvu * units. Keep that explicit.
    ROUND(m.work_rvu * c.units, 4)               AS work_rvu,
    c.charge_amount,
    r.allowed_amount,
    COALESCE(r.paid_amount, 0)                   AS paid_amount,
    COALESCE(r.patient_resp, 0)                  AS patient_resp,
    r.carc_codes,
    r.rarc_codes,
    r.check_eft_trace,                           -- lineage to the deposit
    r.payment_date,
    c.source_file_id                             AS src_file_837,  -- lineage to raw 837
    r.source_file_id                             AS src_file_835   -- lineage to raw 835
FROM      stg.claim_837 c
LEFT JOIN stg.remit_835 r  ON r.claim_id = c.claim_id AND r.line_number = c.line_number
LEFT JOIN ref.mpfs_wrvu  m  ON m.cpt_code = c.cpt_code
                            AND m.service_year = EXTRACT(YEAR FROM c.dos)::INT
LEFT JOIN ref.pos_code   p  ON p.pos_code = c.pos_code
LEFT JOIN ref.facility   f  ON f.facility_id = c.facility_id
LEFT JOIN ref.payer      pay ON pay.payer_id = c.payer_id;

-- ----------------------------------------------------------------------------
-- SEGMENTATION  —  the two numbers the valuator needs, by month and segment.
-- This is the headline output: ER wRVU and ER professional collections.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW core.segment_monthly AS
SELECT
    date_trunc('month', dos)::DATE   AS service_month,
    segment,
    COUNT(*)                          AS line_count,
    SUM(work_rvu)                     AS wrvu,
    SUM(charge_amount)                AS charges,
    SUM(paid_amount)                  AS collections,
    CASE WHEN SUM(work_rvu) > 0
         THEN ROUND(SUM(paid_amount) / SUM(work_rvu), 2) END AS yield_per_wrvu
FROM core.fact_service_line
GROUP BY 1, 2;

-- ============================================================================
-- RECON  —  the control layer. This is what makes an auditor trust the numbers:
-- collections tie to posted cash tie to the bank; charges tie to billing; volume
-- ties to the RIS. Variances are surfaced and signed off, not buried.
-- ============================================================================

-- Bank deposits, parsed from the bank statement (independent control total).
CREATE TABLE recon.bank_deposit (
    deposit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT NOT NULL REFERENCES raw.source_file(file_id),
    deposit_date   DATE NOT NULL,
    eft_trace      TEXT,                 -- matches stg.remit_835.check_eft_trace
    amount         NUMERIC(12,2) NOT NULL
);

-- TIE-OUT A — 835 paid  vs  bank deposits, by EFT trace. The single most
-- persuasive control: did the money we say we collected actually land?
CREATE OR REPLACE VIEW recon.cash_tieout AS
SELECT
    COALESCE(r.check_eft_trace, b.eft_trace)         AS eft_trace,
    SUM(r.paid_amount)                               AS posted_835,
    MAX(b.bank_amount)                               AS bank_deposit,
    SUM(r.paid_amount) - COALESCE(MAX(b.bank_amount),0) AS variance
FROM        stg.remit_835 r
FULL JOIN ( SELECT eft_trace, SUM(amount) AS bank_amount
            FROM recon.bank_deposit GROUP BY eft_trace ) b
       ON b.eft_trace = r.check_eft_trace
GROUP BY COALESCE(r.check_eft_trace, b.eft_trace)
HAVING ABS(SUM(r.paid_amount) - COALESCE(MAX(b.bank_amount),0)) > 0.005;  -- show breaks only

-- TIE-OUT B — exam volume in the fact vs the RIS productivity export.
-- Catches under-capture (services performed but never billed = lost wRVU/$).
CREATE OR REPLACE VIEW recon.volume_tieout AS
SELECT
    date_trunc('month', e.dos)::DATE AS service_month,
    COUNT(DISTINCT e.accession)      AS ris_exams,
    COUNT(DISTINCT f.accession)      AS billed_accessions,
    COUNT(DISTINCT e.accession) - COUNT(DISTINCT f.accession) AS unbilled_gap
FROM      stg.ris_exam e
LEFT JOIN core.fact_service_line f ON f.accession = e.accession
GROUP BY 1;

-- Period control log: store each period's tie-out result + sign-off. Closed,
-- signed periods are the artifacts a valuator re-performs against.
CREATE TABLE recon.control_result (
    control_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_start   DATE NOT NULL,
    period_end     DATE NOT NULL,
    control_name   TEXT NOT NULL,         -- 'cash_tieout' / 'volume_tieout' / 'charge_tieout'
    expected_value NUMERIC(14,2),
    actual_value   NUMERIC(14,2),
    variance       NUMERIC(14,2),
    status         TEXT CHECK (status IN ('PASS','EXCEPTION','RESOLVED')),
    note           TEXT,
    reviewed_by    TEXT,
    reviewed_at    TIMESTAMPTZ
);

-- ============================================================================
-- LINEAGE DRILL  —  the #3 gold-standard test, as a query. Given any aggregate
-- (here: ER collections for a month), return the exact constituent lines AND the
-- raw source files behind them. The sum of these rows = the dashboard number.
-- ============================================================================
-- :p_month example -> '2025-07-01'
SELECT
    f.claim_id, f.line_number, f.dos, f.pos_code, f.cpt_code,
    f.rendering_npi, f.payer_id, f.financial_class,
    f.work_rvu, f.charge_amount, f.paid_amount,
    f.carc_codes, f.check_eft_trace,
    s837.file_name AS src_837_file, s837.sha256 AS src_837_hash,
    s835.file_name AS src_835_file, s835.sha256 AS src_835_hash
FROM core.fact_service_line f
LEFT JOIN raw.source_file s837 ON s837.file_id = f.src_file_837
LEFT JOIN raw.source_file s835 ON s835.file_id = f.src_file_835
WHERE f.segment = 'ER'
  AND date_trunc('month', f.dos) = DATE :p_month
ORDER BY f.dos, f.claim_id, f.line_number;
-- Reconciliation check: SUM(paid_amount) of the rows above MUST equal
-- core.segment_monthly.collections for ('ER', :p_month). If it doesn't, the
-- harness has leakage and is not yet audit-grade.

-- Suggested indexes (performance only; not correctness):
-- CREATE INDEX ON stg.claim_837 (claim_id, line_number);
-- CREATE INDEX ON stg.remit_835 (claim_id, line_number);
-- CREATE INDEX ON stg.ris_exam (accession);

-- ============================================================================
-- ============================================================================
-- DEMO ADDENDUM  —  SYNTHETIC, NO PHI.  Added for the partner-calculator handoff
-- and a runnable proof. Everything below is fabricated; it carries no patient data
-- and needs no BAA. Real ingestion replaces the seed and keeps everything above.
--
-- This addendum adds three things, and ONLY three:
--   (1) ref.harness_config + a runout/maturity guard  (the one real gap)
--   (2) core.er_yield_period  — the named view the calculator consumes
--       (emits ER yield, non-ER yield, and wRVU per period = Y_er, Y_ne, W)
--   (3) a tiny synthetic dataset wired so the controls all tie to zero and the
--       yields land on the benchmark exactly ($28 ER / $86 non-ER)
--
-- CALCULATOR CONTRACT: the audited (left) path of the partner calculator reads
--   er_yield (Y_er), non_er_yield (Y_ne), and the wRVU columns from
--   core.er_yield_period for a chosen mature period. Nothing else crosses.
-- ============================================================================

-- (1) RUNOUT CONFIG ----------------------------------------------------------
-- A DOS cohort isn't trustworthy until A/R has run out (30-40 day A/R + denials
-- + appeals). Don't compute yield on an immature month or you understate it.
CREATE TABLE IF NOT EXISTS ref.harness_config (
    id          INT PRIMARY KEY DEFAULT 1,
    runout_days INT NOT NULL DEFAULT 120,    -- days after period end before a cohort is "mature"
    CONSTRAINT one_row CHECK (id = 1)
);
INSERT INTO ref.harness_config (id, runout_days) VALUES (1, 120)
ON CONFLICT (id) DO NOTHING;

-- (2) HANDOFF VIEW -----------------------------------------------------------
-- Pivots segment_monthly to one row per period with ER and non-ER side by side,
-- plus the maturity flag. is_mature = FALSE means "too recent to quote a yield."
CREATE OR REPLACE VIEW core.er_yield_period AS
SELECT
    s.service_month,
    MAX(CASE WHEN segment='ER'     THEN wrvu END)            AS er_wrvu,
    MAX(CASE WHEN segment='ER'     THEN collections END)     AS er_collections,
    MAX(CASE WHEN segment='ER'     THEN yield_per_wrvu END)  AS er_yield,            -- Y_er
    MAX(CASE WHEN segment='NON_ER' THEN wrvu END)            AS non_er_wrvu,
    MAX(CASE WHEN segment='NON_ER' THEN collections END)     AS non_er_collections,
    MAX(CASE WHEN segment='NON_ER' THEN yield_per_wrvu END)  AS non_er_yield,        -- Y_ne
    (CURRENT_DATE - ((s.service_month + INTERVAL '1 month')::DATE - 1))   AS days_since_period_end,
    (CURRENT_DATE - ((s.service_month + INTERVAL '1 month')::DATE - 1))
        >= (SELECT runout_days FROM ref.harness_config WHERE id=1)        AS is_mature
FROM core.segment_monthly s
GROUP BY s.service_month
ORDER BY s.service_month;

-- (3) SYNTHETIC SEED  —  fabricated; yields constructed to hit $28 / $86 exactly.
-- raw provenance (fake files; sha is filler, not a real hash)
INSERT INTO raw.source_file (file_type,file_name,storage_uri,sha256,byte_size,period_start,period_end,ingested_by) VALUES
 ('837','synthetic_837_2025.x12','s3://demo-raw/837', repeat('a',64), 1024,'2025-07-01','2025-08-31','demo'),
 ('835','synthetic_835_2025.x12','s3://demo-raw/835', repeat('b',64), 1024,'2025-07-01','2025-09-30','demo'),
 ('ris_exam','synthetic_ris_2025.csv','s3://demo-raw/ris', repeat('c',64), 1024,'2025-07-01','2025-08-31','demo'),
 ('bank_stmt','synthetic_bank_2025.csv','s3://demo-raw/bank', repeat('d',64), 1024,'2025-08-01','2025-09-30','demo');

INSERT INTO ref.mpfs_wrvu (cpt_code,service_year,work_rvu,conversion_factor) VALUES
 ('70450',2025,0.85,32.3465),  -- CT head w/o
 ('71046',2025,0.22,32.3465),  -- chest XR 2v
 ('74177',2025,1.82,32.3465),  -- CT abd/pelvis w
 ('72148',2025,1.48,32.3465),  -- MRI lumbar w/o
 ('70553',2025,2.29,32.3465)   -- MRI brain w/wo
ON CONFLICT (cpt_code,service_year) DO NOTHING;

INSERT INTO ref.payer (payer_id,payer_name,financial_class) VALUES
 ('PMCR','Medicare','Medicare'),('PCOM','BlueCross','Commercial')
ON CONFLICT (payer_id) DO NOTHING;

INSERT INTO ref.facility (facility_id,facility_name,is_er_site) VALUES
 ('F-ER','Baptist Emergency Dept', TRUE),('F-OP','Outpatient Imaging Center', FALSE)
ON CONFLICT (facility_id) DO NOTHING;

INSERT INTO ref.provider (rendering_npi,provider_name,subspecialty) VALUES
 ('1999999991','Dr A (synthetic)','Body'),('1999999992','Dr B (synthetic)','Neuro')
ON CONFLICT (rendering_npi) DO NOTHING;

-- Billed lines (837). ER on POS 23, non-ER on POS 22; all professional (mod 26).
INSERT INTO stg.claim_837 (source_file_id,claim_id,line_number,accession,patient_token,dos,pos_code,facility_id,rendering_npi,cpt_code,modifiers,units,charge_amount,payer_id)
SELECT (SELECT file_id FROM raw.source_file WHERE file_type='837'), v.* FROM (VALUES
 ('C-E-001',1,'A-E-001','TKN-1',DATE '2025-07-08','23','F-ER','1999999991','70450','26',1,120.00,'PMCR'),
 ('C-E-002',1,'A-E-002','TKN-2',DATE '2025-07-19','23','F-ER','1999999991','71046','26',1, 45.00,'PCOM'),
 ('C-E-003',1,'A-E-003','TKN-3',DATE '2025-08-03','23','F-ER','1999999992','74177','26',1,260.00,'PMCR'),
 ('C-N-001',1,'A-N-001','TKN-4',DATE '2025-07-22','22','F-OP','1999999992','72148','26',1,210.00,'PCOM'),
 ('C-N-002',1,'A-N-002','TKN-5',DATE '2025-08-11','22','F-OP','1999999992','70553','26',1,330.00,'PCOM'),
 ('C-N-003',1,'A-N-003','TKN-6',DATE '2025-08-27','22','F-OP','1999999991','74177','26',1,260.00,'PMCR')
) AS v(claim_id,line_number,accession,patient_token,dos,pos_code,facility_id,rendering_npi,cpt_code,modifiers,units,charge_amount,payer_id);

-- Remits (835). paid = yield_target * work_rvu, so ER->$28/wRVU, non-ER->$86/wRVU.
INSERT INTO stg.remit_835 (source_file_id,claim_id,line_number,cpt_code,charge_amount,allowed_amount,paid_amount,patient_resp,adj_group_code,carc_codes,check_eft_trace,payment_date,payer_id,posted_at)
SELECT (SELECT file_id FROM raw.source_file WHERE file_type='835'), v.* FROM (VALUES
 ('C-E-001',1,'70450',120.00, 23.80, 23.80,0.00,'CO',NULL,'EFT-2507',DATE '2025-08-15','PMCR',TIMESTAMPTZ '2025-08-15 00:00+00'),
 ('C-E-002',1,'71046', 45.00,  6.16,  6.16,0.00,'CO',NULL,'EFT-2507',DATE '2025-08-15','PCOM',TIMESTAMPTZ '2025-08-15 00:00+00'),
 ('C-N-001',1,'72148',210.00,127.28,127.28,0.00,'CO',NULL,'EFT-2507',DATE '2025-08-15','PCOM',TIMESTAMPTZ '2025-08-15 00:00+00'),
 ('C-E-003',1,'74177',260.00, 50.96, 50.96,0.00,'CO',NULL,'EFT-2508',DATE '2025-09-15','PMCR',TIMESTAMPTZ '2025-09-15 00:00+00'),
 ('C-N-002',1,'70553',330.00,196.94,196.94,0.00,'CO',NULL,'EFT-2508',DATE '2025-09-15','PCOM',TIMESTAMPTZ '2025-09-15 00:00+00'),
 ('C-N-003',1,'74177',260.00,156.52,156.52,0.00,'CO',NULL,'EFT-2508',DATE '2025-09-15','PMCR',TIMESTAMPTZ '2025-09-15 00:00+00')
) AS v(claim_id,line_number,cpt_code,charge_amount,allowed_amount,paid_amount,patient_resp,adj_group_code,carc_codes,check_eft_trace,payment_date,payer_id,posted_at);

-- RIS exams (one per billed accession -> volume tie-out gap = 0)
INSERT INTO stg.ris_exam (source_file_id,accession,dos,exam_cpt,modality,ordering_location,pos_code,facility_id,rendering_npi,finalized_at)
SELECT (SELECT file_id FROM raw.source_file WHERE file_type='ris_exam'), v.* FROM (VALUES
 ('A-E-001',DATE '2025-07-08','70450','CT','ED','23','F-ER','1999999991',TIMESTAMPTZ '2025-07-08 02:10+00'),
 ('A-E-002',DATE '2025-07-19','71046','XR','ED','23','F-ER','1999999991',TIMESTAMPTZ '2025-07-19 21:40+00'),
 ('A-E-003',DATE '2025-08-03','74177','CT','ED','23','F-ER','1999999992',TIMESTAMPTZ '2025-08-03 11:05+00'),
 ('A-N-001',DATE '2025-07-22','72148','MR','OP','22','F-OP','1999999992',TIMESTAMPTZ '2025-07-22 14:00+00'),
 ('A-N-002',DATE '2025-08-11','70553','MR','OP','22','F-OP','1999999992',TIMESTAMPTZ '2025-08-11 09:30+00'),
 ('A-N-003',DATE '2025-08-27','74177','CT','OP','22','F-OP','1999999991',TIMESTAMPTZ '2025-08-27 16:20+00')
) AS v(accession,dos,exam_cpt,modality,ordering_location,pos_code,facility_id,rendering_npi,finalized_at);

-- Bank deposits matching the 835 EFT traces (cash tie-out variance = 0 -> no breaks shown)
INSERT INTO recon.bank_deposit (source_file_id,deposit_date,eft_trace,amount)
SELECT (SELECT file_id FROM raw.source_file WHERE file_type='bank_stmt'), v.* FROM (VALUES
 (DATE '2025-08-15','EFT-2507',157.24),
 (DATE '2025-09-15','EFT-2508',404.42)
) AS v(deposit_date,eft_trace,amount);

-- ----------------------------------------------------------------------------
-- DEMO ACCEPTANCE (run after load; all three must hold):
--   A. SELECT segment, wrvu, collections, yield_per_wrvu FROM core.segment_monthly;
--        -> ER yield_per_wrvu = 28.00 ; NON_ER = 86.00
--   B. SELECT * FROM recon.cash_tieout;     -> 0 rows (no breaks: 835 == bank)
--   C. SELECT * FROM recon.volume_tieout;   -> unbilled_gap = 0 every month
--   Handoff: SELECT er_yield, non_er_yield, er_wrvu, non_er_wrvu, is_mature
--            FROM core.er_yield_period;     -> 28.00 / 86.00, is_mature = TRUE
-- NOTE: not executed in this environment (no Postgres). Same dialect as the core
--   above; run as the first migration and confirm the four checks before trusting.
-- ============================================================================
