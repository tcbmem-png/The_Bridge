import type { Answers, AnswerKey } from "../../lib/engine/types";

type Choice<V extends string> = { value: V; label: string };
type Question<K extends AnswerKey> = {
  key: K;
  label: string;
  choices: ReadonlyArray<Choice<NonNullable<Answers[K]>>>;
};

type Group = {
  title: string;
  questions: Question<AnswerKey>[];
};

const GROUPS: Group[] = [
  {
    title: "Billing / RCM",
    questions: [
      {
        key: "rcm_owner",
        label: "Who runs professional-fee billing?",
        choices: [
          { value: "in_house", label: "In-house" },
          { value: "vendor", label: "Vendor / RCM partner" },
          { value: "hospital_billed", label: "Hospital-billed" },
        ],
      },
      {
        key: "rcm_history",
        label: "Claim history depth?",
        choices: [
          { value: "24_36mo", label: "24–36 months" },
          { value: "12mo", label: "12 months" },
          { value: "lt_12mo", label: "Less than 12 months" },
        ],
      },
    ] as Question<AnswerKey>[],
  },
  {
    title: "Reporting",
    questions: [
      {
        key: "reporting",
        label: "Reporting platform?",
        choices: [
          { value: "ps_one", label: "PowerScribe One" },
          { value: "ps_360", label: "PowerScribe 360" },
          { value: "other", label: "Other" },
        ],
      },
      {
        key: "mpower",
        label: "mPower analytics?",
        choices: [
          { value: "used", label: "In use" },
          { value: "unused", label: "Licensed but unused" },
          { value: "no", label: "Not licensed" },
        ],
      },
    ] as Question<AnswerKey>[],
  },
  {
    title: "RIS / PACS",
    questions: [
      {
        key: "read_loc",
        label: "Where do they read?",
        choices: [
          { value: "hospital_epic", label: "Hospital Epic" },
          { value: "own_ris", label: "Group RIS" },
          { value: "both", label: "Both" },
        ],
      },
      {
        key: "pacs_ts",
        label: "PACS timestamp export?",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ] as Question<AnswerKey>[],
  },
  {
    title: "Data capability",
    questions: [
      {
        key: "bi_tool",
        label: "Existing BI?",
        choices: [
          { value: "power_bi", label: "Power BI" },
          { value: "tableau", label: "Tableau" },
          { value: "none", label: "None" },
        ],
      },
      {
        key: "warehouse",
        label: "Data warehouse?",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        key: "analyst",
        label: "Analyst on staff or contract?",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ] as Question<AnswerKey>[],
  },
  {
    title: "Governance",
    questions: [
      {
        key: "baa",
        label: "Vendor BAA process?",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        key: "deid_ok",
        label: "OK with a de-identified extract?",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "needs_review", label: "Needs review" },
        ],
      },
    ] as Question<AnswerKey>[],
  },
];

type Props = {
  answers: Answers;
  onChange: (next: Answers) => void;
  onReset: () => void;
};

export function Questionnaire({ answers, onChange, onReset }: Props) {
  return (
    <div className="rounded-xl border border-ink/15 bg-paper p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Questionnaire · 11 inputs
        </div>
        <button
          type="button"
          onClick={onReset}
          className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55 underline-offset-4 hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 space-y-7">
        {GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend className="font-display text-lg text-ink">{group.title}</legend>
            <div className="mt-3 space-y-4">
              {group.questions.map((q) => {
                const current = answers[q.key];
                return (
                  <div key={q.key}>
                    <label className="text-sm text-ink/80">{q.label}</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.choices.map((c) => {
                        const selected = current === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() =>
                              onChange({
                                ...answers,
                                [q.key]: selected ? undefined : c.value,
                              })
                            }
                            className={[
                              "rounded-full border px-3 py-1.5 text-xs transition-colors",
                              selected
                                ? "border-ink bg-ink text-paper"
                                : "border-ink/25 bg-paper text-ink hover:border-ink/55",
                            ].join(" ")}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
