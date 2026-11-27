import type { ReactNode } from "react";

export type LegalSection = { title: string; items: ReactNode[] };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-xs text-ink-muted">ปรับปรุงล่าสุด {updated}</p>
      <div className="mt-4 text-sm leading-relaxed text-ink-muted">{intro}</div>
      <div className="mt-6 space-y-4">
        {sections.map((section, i) => (
          <section key={section.title} className="card p-5">
            <h2 className="font-semibold text-ink">
              {i + 1}. {section.title}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
