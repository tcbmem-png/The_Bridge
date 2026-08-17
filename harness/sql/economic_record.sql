-- ============================================================================
-- THE BRIDGE — INDEPENDENT ECONOMIC RECORD (specialty-agnostic)
-- ----------------------------------------------------------------------------
-- Purpose : Reconstruct, from a physician group's own exports, the chain
--           work performed -> claim -> adjudication -> payment -> cash,
--           and reconcile every handoff.
-- Dialect : PostgreSQL. Runs verbatim in PGlite (WASM) in the browser tab.
-- ----------------------------------------------------------------------------
-- Nothing here is specialty-specific. Service families, subspecialties and
-- encounter classes are REFERENCE data, not product ontology.
-- ----------------------------------------------------------------------------
-- LAYER MAP
--   raw   = immutable source capture (chain of custody)
--   stg   = faithfully parsed source, at source grain
--   ref   = versioned reference / dimensions (MPFS by service year, roster...)
--   core  = joined economic facts, with explicit match state per handoff
--   recon = control tie-outs (work -> claim -> 835 -> cash)
--
-- DOCTRINE ENCODED HERE
--   * Unknown is not zero. Unmatched joins stay NULL and carry a match state.
--   * A partially joined row is never called complete.
--   * No model assumption is written into a record table.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS recon;

-- ============================================================================
-- RAW — chain of custody
-- ============================================================================
CREATE TABLE raw.source_file (
    file_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_type   TEXT NOT NULL,          -- encounter | 837 | 835 | bank | reference
    file_name   TEXT NOT NULL,
    sha256      TEXT,
    byte_size   BIGINT,
    row_count   BIGINT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- STG — parsed source, faithful, no logic
-- ============================================================================

-- Work performed. EHR / practice-management encounter or procedure export.
CREATE TABLE stg.encounter (
    encounter_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id   BIGINT REFERENCES raw.source_file(file_id),
    encounter_id     TEXT NOT NULL,
    patient_token    TEXT,
    physician_npi    TEXT,
    dos              DATE NOT NULL,
    facility_id      TEXT,
    pos_code         TEXT,
    encounter_class  TEXT,               -- office | inpatient | outpatient | ed | asc
    procedure_cpt    TEXT,
    units            NUMERIC(8,2) NOT NULL DEFAULT 1,
    finalized_at     TIMESTAMPTZ
);

-- What left the practice. 837 / billing-claim export, at line grain.
CREATE TABLE stg.claim_line (
    claim_line_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id    BIGINT REFERENCES raw.source_file(file_id),
    claim_id          TEXT NOT NULL,
    line_number       INT  NOT NULL,
    encounter_id      TEXT,
    patient_token     TEXT,
    dos               DATE NOT NULL,
    cpt_code          TEXT NOT NULL,
    modifier_1        TEXT,
    modifier_2        TEXT,
    pos_code          TEXT,
    facility_id       TEXT,
    rendering_npi     TEXT,
    payer_id          TEXT,
    units             NUMERIC(8,2) NOT NULL DEFAULT 1,
    charge_amount     NUMERIC(12,2) NOT NULL,
    submit_date       DATE
);

-- What the payer did. 835 remittance, at service-line grain.
CREATE TABLE stg.remit_line (
    remit_line_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id    BIGINT REFERENCES raw.source_file(file_id),
    remittance_id     TEXT,
    claim_id          TEXT NOT NULL,
    line_number       INT  NOT NULL,
    payer_id          TEXT,
    cpt_code          TEXT,
    charge_amount     NUMERIC(12,2),
    allowed_amount    NUMERIC(12,2),      -- NULL means the source did not say
    paid_amount       NUMERIC(12,2),      -- NULL means the source did not say
    patient_resp      NUMERIC(12,2),
    adjustment_amount NUMERIC(12,2),
    denial_code       TEXT,
    adjudication_status TEXT,             -- paid | denied | zero_pay | reversal
    payment_date      DATE,
    eft_trace         TEXT
);

-- What actually landed. Bank / treasury export. Optional.
CREATE TABLE stg.deposit (
    deposit_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT REFERENCES raw.source_file(file_id),
    deposit_date   DATE NOT NULL,
    eft_trace      TEXT,
    amount         NUMERIC(14,2) NOT NULL,
    description    TEXT
);

-- ============================================================================
-- REF — versioned reference / governed dimensions
-- ============================================================================
CREATE TABLE ref.mpfs_wrvu (
    cpt_code          TEXT NOT NULL,
    service_year      INT  NOT NULL,
    work_rvu          NUMERIC(8,4) NOT NULL,
    conversion_factor NUMERIC(8,4),
    PRIMARY KEY (cpt_code, service_year)
);

CREATE TABLE ref.physician (
    physician_npi TEXT PRIMARY KEY,
    physician_name TEXT,
    specialty      TEXT,
    subspecialty   TEXT,
    class          TEXT
);

CREATE TABLE ref.facility (
    facility_id   TEXT PRIMARY KEY,
    facility_name TEXT,
    facility_type TEXT               -- office | hospital | asc
);

CREATE TABLE ref.payer (
    payer_id        TEXT PRIMARY KEY,
    payer_name      TEXT,
    financial_class TEXT             -- medicare | medicare_advantage | medicaid | commercial | self_pay
);

CREATE TABLE ref.service_family (
    cpt_code       TEXT PRIMARY KEY,
    service_family TEXT NOT NULL,
    description    TEXT
);

CREATE TABLE ref.pos_code (
    pos_code    TEXT PRIMARY KEY,
    description TEXT,
    site        TEXT                 -- office | hospital | ed | asc
);

CREATE TABLE ref.denial_code (
    denial_code TEXT PRIMARY KEY,
    description TEXT,
    category    TEXT                 -- eligibility | coding | authorization | bundling | other
);

-- Optional. Never required by the MVP.
CREATE TABLE ref.coverage_event (
    coverage_id   TEXT PRIMARY KEY,
    facility_id   TEXT,
    physician_npi TEXT,
    start_at      TIMESTAMPTZ,
    end_at        TIMESTAMPTZ,
    coverage_type TEXT
);

-- ============================================================================
-- CORE — joined economic facts with EXPLICIT match state at every handoff.
-- One row per claim line, plus (below) the work that never became a claim.
-- ============================================================================

-- Remittance collapsed to one row per (claim_id, line_number) so a claim line
-- with two 835 rows is flagged 'ambiguous' rather than silently duplicated.
CREATE VIEW core.remit_rollup AS
SELECT
    claim_id,
    line_number,
    COUNT(*)                                        AS remit_row_count,
    MIN(remittance_id)                              AS remittance_id,
    MAX(payer_id)                                   AS remit_payer_id,
    COUNT(DISTINCT payer_id)                        AS distinct_remit_payers,
    SUM(allowed_amount)                             AS allowed_amount,
    SUM(paid_amount)                                AS paid_amount,
    SUM(patient_resp)                               AS patient_resp,
    SUM(adjustment_amount)                          AS adjustment_amount,
    MAX(denial_code)                                AS denial_code,
    MAX(adjudication_status)                        AS adjudication_status,
    MAX(payment_date)                               AS payment_date,
    MAX(eft_trace)                                  AS eft_trace,
    BOOL_OR(paid_amount IS NULL)                    AS paid_amount_unknown
FROM stg.remit_line
GROUP BY claim_id, line_number;

CREATE VIEW core.service_economics AS
SELECT
    c.claim_line_row_id                              AS service_id,
    c.encounter_id,
    c.claim_id,
    c.line_number                                    AS claim_line_id,
    r.remittance_id,

    c.rendering_npi                                  AS physician_id,
    c.facility_id,
    c.payer_id,
    p.financial_class,
    f.facility_type,
    pos.site                                         AS site_of_service,

    c.dos,
    date_trunc('month', c.dos)::date                 AS service_month,
    EXTRACT(YEAR FROM c.dos)::int                    AS service_year,
    c.cpt_code,
    c.modifier_1,
    c.modifier_2,
    c.pos_code,
    COALESCE(sf.service_family, 'unmapped')          AS service_family,
    (sf.cpt_code IS NOT NULL)                        AS service_family_mapped,

    c.units,
    m.work_rvu                                       AS work_rvu_unit,
    CASE WHEN m.work_rvu IS NULL THEN NULL
         ELSE ROUND(m.work_rvu * c.units, 4) END     AS work_rvu,

    c.charge_amount,
    r.allowed_amount,
    r.paid_amount,
    r.patient_resp,
    r.adjustment_amount,
    r.denial_code,
    r.adjudication_status,

    c.submit_date                                    AS claim_submit_date,
    r.payment_date,
    CASE WHEN r.payment_date IS NULL OR c.submit_date IS NULL THEN NULL
         ELSE (r.payment_date - c.submit_date) END   AS days_to_pay,

    -- Match state at each handoff. Never a boolean where ambiguity matters.
    CASE
        WHEN c.encounter_id IS NULL                     THEN 'not_applicable'
        WHEN e.match_count IS NULL OR e.match_count = 0 THEN 'unmatched'
        WHEN e.match_count > 1                          THEN 'ambiguous'
        ELSE 'matched'
    END                                              AS encounter_match_status,
    'matched'::text                                  AS claim_match_status,
    CASE
        WHEN r.claim_id IS NULL                THEN 'unmatched'
        WHEN r.remit_row_count > 1             THEN 'ambiguous'
        WHEN r.distinct_remit_payers > 1
          OR (c.payer_id IS NOT NULL AND r.remit_payer_id IS NOT NULL
              AND c.payer_id <> r.remit_payer_id)  THEN 'contradictory'
        ELSE 'matched'
    END                                              AS remittance_match_status,
    CASE
        WHEN r.eft_trace IS NULL               THEN 'not_applicable'
        WHEN d.trace_count IS NULL             THEN 'unmatched'
        WHEN d.trace_count > 1                 THEN 'ambiguous'
        ELSE 'matched'
    END                                              AS cash_match_status,

    r.eft_trace,
    (m.cpt_code IS NOT NULL)                         AS wrvu_mapped,
    (p.payer_id IS NOT NULL)                         AS payer_known,
    (ph.physician_npi IS NOT NULL)                   AS physician_known,
    (f.facility_id IS NOT NULL)                      AS facility_known,
    (pos.pos_code IS NOT NULL)                       AS pos_known
FROM stg.claim_line c
LEFT JOIN core.remit_rollup r
       ON r.claim_id = c.claim_id AND r.line_number = c.line_number
LEFT JOIN (
    SELECT encounter_id, COUNT(*) AS match_count
    FROM stg.encounter GROUP BY encounter_id
) e ON e.encounter_id = c.encounter_id
LEFT JOIN (
    SELECT eft_trace, COUNT(*) AS trace_count
    FROM stg.deposit WHERE eft_trace IS NOT NULL GROUP BY eft_trace
) d ON d.eft_trace = r.eft_trace
LEFT JOIN ref.mpfs_wrvu m
       ON m.cpt_code = c.cpt_code AND m.service_year = EXTRACT(YEAR FROM c.dos)::int
LEFT JOIN ref.service_family sf ON sf.cpt_code = c.cpt_code
LEFT JOIN ref.payer p          ON p.payer_id = c.payer_id
LEFT JOIN ref.physician ph     ON ph.physician_npi = c.rendering_npi
LEFT JOIN ref.facility f       ON f.facility_id = c.facility_id
LEFT JOIN ref.pos_code pos     ON pos.pos_code = c.pos_code;

-- Work that never became a claim. This is the row set the funnel's first GAP
-- is made of; it is a record fact, not an inference.
CREATE VIEW core.unbilled_work AS
SELECT e.*
FROM stg.encounter e
WHERE NOT EXISTS (
    SELECT 1 FROM stg.claim_line c WHERE c.encounter_id = e.encounter_id
);

-- ============================================================================
-- RECON — the tie-outs. Every handoff, with the gap made explicit.
-- ============================================================================

CREATE VIEW recon.funnel AS
WITH enc AS (SELECT COUNT(*) n FROM stg.encounter),
     enc_claimed AS (
        SELECT COUNT(*) n FROM stg.encounter e
        WHERE EXISTS (SELECT 1 FROM stg.claim_line c WHERE c.encounter_id = e.encounter_id)
     ),
     lines AS (SELECT COUNT(*) n, SUM(charge_amount) amt FROM stg.claim_line),
     adjud AS (
        SELECT COUNT(*) n FROM core.service_economics
        WHERE remittance_match_status IN ('matched','ambiguous','contradictory')
     ),
     allowed AS (SELECT SUM(allowed_amount) amt FROM core.service_economics),
     paid AS (SELECT SUM(paid_amount) amt FROM core.service_economics),
     cash AS (SELECT SUM(amount) amt FROM stg.deposit)
SELECT 'work_performed'  AS step, 1 AS ord, (SELECT n FROM enc) AS unit_count, NULL::numeric AS amount
UNION ALL SELECT 'work_claimed',     2, (SELECT n FROM enc_claimed), NULL
UNION ALL SELECT 'claim_lines',      3, (SELECT n FROM lines),  (SELECT amt FROM lines)
UNION ALL SELECT 'adjudicated',      4, (SELECT n FROM adjud),  NULL
UNION ALL SELECT 'allowed',          5, NULL,                   (SELECT amt FROM allowed)
UNION ALL SELECT 'paid',             6, NULL,                   (SELECT amt FROM paid)
UNION ALL SELECT 'bank_cash',        7, NULL,                   (SELECT amt FROM cash)
ORDER BY ord;

-- Panel 1 — work -> claims
CREATE VIEW recon.work_to_claims AS
SELECT
    (SELECT COUNT(*) FROM stg.encounter)                                    AS encounters_loaded,
    (SELECT COUNT(*) FROM stg.claim_line WHERE encounter_id IS NOT NULL)    AS claim_lines_with_encounter,
    (SELECT COUNT(*) FROM core.unbilled_work)                               AS unmatched_work,
    (SELECT COUNT(*) FROM core.service_economics WHERE encounter_match_status = 'unmatched')  AS claims_without_work,
    (SELECT COUNT(*) FROM core.service_economics WHERE encounter_match_status = 'ambiguous')  AS duplicate_matches;

-- Panel 2 — claims -> adjudication
CREATE VIEW recon.claims_to_adjudication AS
SELECT
    COUNT(*)                                                               AS submitted_lines,
    COUNT(*) FILTER (WHERE remittance_match_status <> 'unmatched')         AS matched_remit_lines,
    COUNT(*) FILTER (WHERE remittance_match_status = 'unmatched')          AS unadjudicated,
    COUNT(*) FILTER (WHERE adjudication_status = 'denied')                 AS denied,
    COUNT(*) FILTER (WHERE adjudication_status = 'zero_pay')               AS zero_pay,
    COUNT(*) FILTER (WHERE remittance_match_status = 'contradictory')      AS contradictory,
    COUNT(*) FILTER (WHERE remittance_match_status = 'ambiguous')          AS ambiguous,
    SUM(charge_amount) FILTER (WHERE remittance_match_status = 'unmatched') AS unadjudicated_charges
FROM core.service_economics;

-- Panel 3 — adjudication -> payment
CREATE VIEW recon.adjudication_to_payment AS
SELECT
    SUM(allowed_amount)     AS allowed,
    SUM(paid_amount)        AS payer_paid,
    SUM(patient_resp)       AS patient_responsibility,
    SUM(adjustment_amount)  AS adjustments,
    SUM(charge_amount) FILTER (WHERE remittance_match_status <> 'unmatched') AS adjudicated_charges,
    COUNT(*) FILTER (WHERE allowed_amount IS NULL AND remittance_match_status <> 'unmatched') AS allowed_unknown_lines
FROM core.service_economics;

-- Panel 4 — payment -> cash
CREATE VIEW recon.payment_to_cash AS
SELECT
    (SELECT SUM(paid_amount) FROM core.service_economics)                       AS remit_paid,
    (SELECT COUNT(*) FROM stg.deposit)                                          AS deposit_rows,
    (SELECT SUM(amount) FROM stg.deposit)                                       AS bank_deposits,
    (SELECT SUM(paid_amount) FROM core.service_economics
      WHERE cash_match_status = 'unmatched')                                    AS paid_not_in_bank,
    (SELECT SUM(amount) FROM stg.deposit d
      WHERE d.eft_trace IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM stg.remit_line r WHERE r.eft_trace = d.eft_trace)) AS bank_not_in_remit;

-- Panel 5 — reference integrity
CREATE VIEW recon.reference_integrity AS
SELECT
    COUNT(*)                                            AS claim_lines,
    COUNT(*) FILTER (WHERE wrvu_mapped)                 AS wrvu_mapped_lines,
    COUNT(*) FILTER (WHERE NOT wrvu_mapped)             AS unmapped_cpt_lines,
    COUNT(DISTINCT cpt_code) FILTER (WHERE NOT wrvu_mapped) AS unmapped_cpt_codes,
    COUNT(*) FILTER (WHERE NOT physician_known)         AS unknown_physician_lines,
    COUNT(*) FILTER (WHERE NOT payer_known)             AS unknown_payer_lines,
    COUNT(*) FILTER (WHERE NOT facility_known)          AS unknown_facility_lines,
    COUNT(*) FILTER (WHERE NOT pos_known)               AS unknown_pos_lines,
    COUNT(*) FILTER (WHERE NOT service_family_mapped)   AS unmapped_family_lines
FROM core.service_economics;

-- Which source files are present at all.
CREATE VIEW recon.source_status AS
SELECT 'encounter' AS source, (SELECT COUNT(*) FROM stg.encounter)  AS row_count
UNION ALL SELECT '837',        (SELECT COUNT(*) FROM stg.claim_line)
UNION ALL SELECT '835',        (SELECT COUNT(*) FROM stg.remit_line)
UNION ALL SELECT 'mpfs',       (SELECT COUNT(*) FROM ref.mpfs_wrvu)
UNION ALL SELECT 'bank',       (SELECT COUNT(*) FROM stg.deposit)
UNION ALL SELECT 'physician',  (SELECT COUNT(*) FROM ref.physician)
UNION ALL SELECT 'payer',      (SELECT COUNT(*) FROM ref.payer)
UNION ALL SELECT 'facility',   (SELECT COUNT(*) FROM ref.facility);

-- ============================================================================
-- PHASE 2 — PORTED AUDIT MACHINERY
-- ----------------------------------------------------------------------------
-- Everything below implements audit invariants, not specialty logic:
--   * chain of custody on raw bytes;
--   * deterministic repairs, recorded, never silent;
--   * rows that fail a constraint are PARKED and counted, never dropped;
--   * every row lands in exactly one visible disposition (no-swallow);
--   * cash is a separate evidence class from payer remittance;
--   * unknown payer / facility / reference stays unknown — never a default.
-- ============================================================================

-- Chain of custody, extended. sha256 is over the raw bytes AS RECEIVED,
-- before any parsing or repair.
ALTER TABLE raw.source_file ADD COLUMN stage            TEXT;
ALTER TABLE raw.source_file ADD COLUMN source_key       TEXT;
ALTER TABLE raw.source_file ADD COLUMN detection_status TEXT;  -- detected | ambiguous | unrecognized
ALTER TABLE raw.source_file ADD COLUMN parser_version   TEXT;
ALTER TABLE raw.source_file ADD COLUMN contract_version TEXT;

-- Rows that could not be staged. Parked and visible: a rejected row is a
-- finding, not a silent deletion.
CREATE TABLE raw.rejected_row (
    rejected_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT REFERENCES raw.source_file(file_id),
    source_key     TEXT,
    row_index      INT,
    reason         TEXT NOT NULL,
    payload        TEXT
);

-- Deterministic repairs. Allowed. Never invisible.
CREATE TABLE raw.repair (
    repair_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT REFERENCES raw.source_file(file_id),
    source_key     TEXT,
    row_index      INT,
    target_table   TEXT,
    row_key        TEXT,
    field          TEXT NOT NULL,
    rule           TEXT NOT NULL,
    original       TEXT,
    normalized     TEXT
);

-- Governed method configuration. A load-bearing election (which bank rows are
-- professional collections, what runout means) is a declared config value with
-- a status, not a hardcoded constant.
CREATE TABLE ref.method_config (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    definition  TEXT,
    status      TEXT,     -- record | model | fixture | pilot_question
    source      TEXT
);

-- CARC / RARC preserved on ingest even though MVP analysis is basic.
ALTER TABLE stg.remit_line ADD COLUMN carc_code TEXT;
ALTER TABLE stg.remit_line ADD COLUMN rarc_code TEXT;

-- Deposit classification is explicit. NULL means "no governed rule applied" —
-- it never silently means "collections".
ALTER TABLE stg.deposit ADD COLUMN classification      TEXT;
ALTER TABLE stg.deposit ADD COLUMN classification_rule TEXT;

-- ----------------------------------------------------------------------------
-- Optional Stage-3 evidence class: the vendor's own raw account.
-- Present as schema so the ladder is real even before a group loads one.
-- ----------------------------------------------------------------------------
CREATE TABLE stg.rcm_ledger (
    ledger_row_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT REFERENCES raw.source_file(file_id),
    claim_id       TEXT,
    line_number    INT,
    posted_amount  NUMERIC(12,2),
    writeoff_amount NUMERIC(12,2),
    writeoff_reason TEXT,
    fee_amount     NUMERIC(12,2),
    post_date      DATE,
    status         TEXT
);

CREATE TABLE stg.processed_report (
    report_row_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file_id BIGINT REFERENCES raw.source_file(file_id),
    period         TEXT,
    metric         TEXT,
    reported_value NUMERIC(16,2),
    unit           TEXT
);

-- ============================================================================
-- CORE — dispositions. Every claim line lands in exactly one.
-- ============================================================================
CREATE VIEW core.line_disposition AS
SELECT
    s.service_id,
    s.claim_id,
    s.claim_line_id,
    s.dos,
    s.cpt_code,
    s.payer_id,
    s.facility_id,
    s.charge_amount,
    s.allowed_amount,
    s.paid_amount,
    s.work_rvu,
    s.remittance_match_status,
    s.cash_match_status,
    s.adjudication_status,

    -- Identity resolution. Unknown stays unknown; nothing defaults into a
    -- segment or onto a contract.
    CASE WHEN s.payer_id IS NULL THEN 'absent'
         WHEN s.payer_known      THEN 'resolved'
         ELSE 'unresolved_identity' END                       AS payer_resolution,
    CASE WHEN s.facility_id IS NULL THEN 'absent'
         WHEN s.facility_known      THEN 'resolved'
         ELSE 'unresolved_identity' END                       AS facility_resolution,
    CASE WHEN s.pos_known OR s.facility_known THEN 'resolved'
         ELSE 'gap' END                                       AS site_resolution,
    CASE WHEN s.wrvu_mapped THEN 'covered' ELSE 'uncovered' END AS wrvu_coverage,

    EXISTS (SELECT 1 FROM raw.repair r
             WHERE r.target_table = 'stg.claim_line'
               AND r.row_key = s.claim_id || ':' || s.claim_line_id) AS repaired,

    -- The partition itself. Order matters: the first true class wins, and the
    -- classes are mutually exclusive by construction.
    CASE
        WHEN s.remittance_match_status = 'contradictory' THEN 'contradictory'
        WHEN s.remittance_match_status = 'ambiguous'     THEN 'ambiguous'
        WHEN s.remittance_match_status = 'unmatched'     THEN 'unmatched'
        WHEN NOT s.wrvu_mapped                           THEN 'uncovered'
        WHEN s.paid_amount IS NULL                       THEN 'unresolved'
        WHEN EXISTS (SELECT 1 FROM raw.repair r
                      WHERE r.target_table = 'stg.claim_line'
                        AND r.row_key = s.claim_id || ':' || s.claim_line_id)
                                                         THEN 'resolved_repaired'
        ELSE 'resolved_clean'
    END                                                       AS disposition
FROM core.service_economics s;

-- Encounter universe: every encounter lands somewhere too.
CREATE VIEW core.encounter_disposition AS
SELECT
    e.encounter_row_id,
    e.encounter_id,
    e.dos,
    CASE
        WHEN cc.n IS NULL OR cc.n = 0 THEN 'unmatched'
        WHEN cc.n > 1                 THEN 'ambiguous'
        ELSE 'resolved_clean'
    END AS disposition
FROM stg.encounter e
LEFT JOIN (
    SELECT encounter_id, COUNT(*) n FROM stg.claim_line
    WHERE encounter_id IS NOT NULL GROUP BY encounter_id
) cc ON cc.encounter_id = e.encounter_id;

-- Deposit universe. A bank row with no payer trace is not an error and not a
-- zero: it is an unmatched deposit, and it stays visible.
CREATE VIEW core.deposit_disposition AS
SELECT
    d.deposit_row_id,
    d.deposit_date,
    d.amount,
    d.eft_trace,
    COALESCE(d.classification, 'unclassified') AS classification,
    CASE
        WHEN d.eft_trace IS NULL                   THEN 'unmatched'
        WHEN t.remit_rows IS NULL                  THEN 'unmatched'
        WHEN t.deposit_rows > 1                    THEN 'ambiguous'
        ELSE 'resolved_clean'
    END AS disposition
FROM stg.deposit d
LEFT JOIN (
    SELECT r.eft_trace,
           COUNT(DISTINCT r.remit_line_row_id) AS remit_rows,
           (SELECT COUNT(*) FROM stg.deposit d2 WHERE d2.eft_trace = r.eft_trace) AS deposit_rows
    FROM stg.remit_line r WHERE r.eft_trace IS NOT NULL
    GROUP BY r.eft_trace
) t ON t.eft_trace = d.eft_trace;

-- ============================================================================
-- RECON — partition checks, trace reconciliation, timing, the carve.
-- ============================================================================

-- One row per (universe, disposition). The UI sums these and asserts the
-- invariant; the invariant is never printed unless it holds.
CREATE VIEW recon.partition_class AS
SELECT 'claim_lines' AS universe, disposition, COUNT(*) AS row_count,
       ROUND(COALESCE(SUM(charge_amount),0) * 100)::bigint AS amount_cents
FROM core.line_disposition GROUP BY disposition
UNION ALL
SELECT 'encounters', disposition, COUNT(*), NULL::bigint
FROM core.encounter_disposition GROUP BY disposition
UNION ALL
SELECT 'deposits', disposition, COUNT(*),
       ROUND(COALESCE(SUM(amount),0) * 100)::bigint
FROM core.deposit_disposition GROUP BY disposition
UNION ALL
SELECT 'remit_rows',
       CASE WHEN c.claim_id IS NULL THEN 'unmappable' ELSE 'resolved_clean' END,
       COUNT(*), ROUND(COALESCE(SUM(r.paid_amount),0) * 100)::bigint
FROM stg.remit_line r
LEFT JOIN stg.claim_line c
       ON c.claim_id = r.claim_id AND c.line_number = r.line_number
GROUP BY 2
UNION ALL
SELECT 'rejected_rows', 'not_applicable', COUNT(*), NULL::bigint
FROM raw.rejected_row;

-- Population entering each reconciliation universe, straight from staging.
CREATE VIEW recon.partition_population AS
SELECT 'claim_lines' AS universe, COUNT(*)::bigint AS population FROM stg.claim_line
UNION ALL SELECT 'encounters', COUNT(*) FROM stg.encounter
UNION ALL SELECT 'deposits',   COUNT(*) FROM stg.deposit
UNION ALL SELECT 'remit_rows', COUNT(*) FROM stg.remit_line
UNION ALL SELECT 'rejected_rows', COUNT(*) FROM raw.rejected_row;

CREATE VIEW recon.partition_check AS
SELECT p.universe,
       p.population,
       COALESCE(SUM(x.row_count), 0)::bigint            AS classified,
       (p.population - COALESCE(SUM(x.row_count),0))::bigint AS unaccounted,
       (p.population = COALESCE(SUM(x.row_count),0))    AS closes
FROM recon.partition_population p
LEFT JOIN recon.partition_class x ON x.universe = p.universe
GROUP BY p.universe, p.population;

-- Payment-trace reconciliation. Payer remittance and bank cash are separate
-- facts; a trace is the only thing that joins them, and its cardinality is
-- stated explicitly rather than assumed 1:1.
CREATE VIEW recon.trace_reconciliation AS
WITH remit AS (
    SELECT eft_trace,
           COUNT(*)                          AS remit_rows,
           ROUND(SUM(COALESCE(paid_amount,0)) * 100)::bigint AS remit_paid_cents
    FROM stg.remit_line WHERE eft_trace IS NOT NULL GROUP BY eft_trace
), bank AS (
    SELECT eft_trace,
           COUNT(*)                          AS deposit_rows,
           ROUND(SUM(amount) * 100)::bigint  AS deposit_cents
    FROM stg.deposit WHERE eft_trace IS NOT NULL GROUP BY eft_trace
)
SELECT
    COALESCE(r.eft_trace, b.eft_trace)                       AS eft_trace,
    COALESCE(r.remit_rows, 0)                                AS remit_rows,
    COALESCE(b.deposit_rows, 0)                              AS deposit_rows,
    r.remit_paid_cents,
    b.deposit_cents,
    CASE
        WHEN r.eft_trace IS NULL                       THEN 'bank_only'
        WHEN b.eft_trace IS NULL                       THEN 'remit_only'
        WHEN b.deposit_rows > 1                        THEN 'ambiguous_duplicate_deposit'
        WHEN r.remit_paid_cents = b.deposit_cents      THEN 'matched'
        ELSE 'matched_amount_differs'
    END                                                      AS trace_state,
    COALESCE(b.deposit_cents,0) - COALESCE(r.remit_paid_cents,0) AS variance_cents
FROM remit r
FULL OUTER JOIN bank b ON b.eft_trace = r.eft_trace;

CREATE VIEW recon.trace_summary AS
SELECT trace_state,
       COUNT(*)                    AS traces,
       SUM(remit_rows)             AS remit_rows,
       SUM(deposit_rows)           AS deposit_rows,
       SUM(COALESCE(remit_paid_cents,0)) AS remit_paid_cents,
       SUM(COALESCE(deposit_cents,0))    AS deposit_cents,
       SUM(variance_cents)         AS variance_cents
FROM recon.trace_reconciliation
GROUP BY trace_state ORDER BY 2 DESC;

-- Days to pay. Two distinct measures, never conflated.
CREATE VIEW recon.days_to_pay AS
SELECT
    payer_id,
    COUNT(*) FILTER (WHERE payment_date IS NOT NULL AND claim_submit_date IS NOT NULL) AS measurable_lines,
    COUNT(*) FILTER (WHERE payment_date IS NULL OR claim_submit_date IS NULL)          AS unmeasurable_lines,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (payment_date - claim_submit_date))    AS median_submit_to_pay,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY (payment_date - claim_submit_date))   AS p25_submit_to_pay,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY (payment_date - claim_submit_date))   AS p75_submit_to_pay,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (payment_date - dos))                  AS median_dos_to_pay
FROM core.service_economics
GROUP BY payer_id;

-- The Stage-2 carve, in exact cents.
--
--   starting gap  = charges the group's own books show as work billed
--                   minus the cash that arrived
--   explained     = named slices the wire actually establishes
--   remainder     = unexplained_after, stated, never absorbed
CREATE VIEW recon.carve_inputs AS
SELECT
    ROUND(COALESCE((SELECT SUM(charge_amount) FROM stg.claim_line),0) * 100)::bigint       AS charges_cents,
    ROUND(COALESCE((SELECT SUM(amount) FROM stg.deposit
                     WHERE classification IS DISTINCT FROM 'excluded'),0) * 100)::bigint   AS bank_cash_cents,
    ROUND(COALESCE((SELECT SUM(paid_amount) FROM core.service_economics),0) * 100)::bigint AS payer_paid_cents,
    ROUND(COALESCE((SELECT SUM(adjustment_amount) FROM core.service_economics),0) * 100)::bigint AS contractual_adjustments_cents,
    ROUND(COALESCE((SELECT SUM(patient_resp) FROM core.service_economics),0) * 100)::bigint      AS patient_resp_cents,
    ROUND(COALESCE((SELECT SUM(charge_amount) FROM core.service_economics
                     WHERE adjudication_status IN ('denied','zero_pay')),0) * 100)::bigint       AS denied_charges_cents,
    ROUND(COALESCE((SELECT SUM(charge_amount) FROM core.service_economics
                     WHERE remittance_match_status = 'unmatched'),0) * 100)::bigint              AS no_remittance_charges_cents,
    ROUND(COALESCE((SELECT SUM(paid_amount) FROM core.service_economics
                     WHERE cash_match_status = 'unmatched'),0) * 100)::bigint                    AS paid_without_bank_trace_cents,
    (SELECT COUNT(*) FROM core.service_economics WHERE adjudication_status IN ('denied','zero_pay'))  AS denied_lines,
    (SELECT COUNT(*) FROM core.service_economics WHERE remittance_match_status = 'unmatched')         AS no_remittance_lines,
    (SELECT COUNT(*) FROM core.service_economics WHERE cash_match_status = 'unmatched')               AS paid_without_bank_trace_lines;

-- Repairs, summarized for the lineage rail.
CREATE VIEW recon.repair_summary AS
SELECT rule, field, COUNT(*) AS row_count
FROM raw.repair GROUP BY rule, field ORDER BY 3 DESC;

-- File-level chain of custody, as loaded.
CREATE VIEW recon.custody AS
SELECT f.file_id, f.source_key, f.stage, f.file_type, f.file_name,
       f.detection_status, f.sha256, f.byte_size, f.row_count,
       f.parser_version, f.contract_version, f.received_at,
       (SELECT COUNT(*) FROM raw.rejected_row rr WHERE rr.source_file_id = f.file_id) AS rejected_rows,
       (SELECT COUNT(*) FROM raw.repair rp WHERE rp.source_file_id = f.file_id)       AS repairs
FROM raw.source_file f
ORDER BY f.file_id;
