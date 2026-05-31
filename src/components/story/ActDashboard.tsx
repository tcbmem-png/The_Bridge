import { Placeholder } from "../Placeholder";
import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";

export function ActDashboard() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative border-b border-ink/15">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div ref={ref} className="reveal">
          <SectionTag tone="teal">The Dashboard · The fall, in numbers</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[2rem] leading-[1.1] md:text-[3rem]">
            Data becomes information.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
            One view. Joined across the systems that already record what
            happened. The number is not new. The seeing is.
          </p>
        </div>

        <div className="mt-12">
          <Placeholder label="Dashboard component" minHeight={420}>
            <div className="flex h-full min-h-[360px] flex-col items-start justify-between gap-6">
              <p className="text-sm text-ink/70">
                Awaiting component spec. This box reserves roughly the final
                footprint so the surrounding layout reads correctly.
              </p>
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
                Reserved · ~420px
              </div>
            </div>
          </Placeholder>
        </div>
      </div>
    </section>
  );
}
