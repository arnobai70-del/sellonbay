import type { ReactNode } from 'react';

/* Shell for the legal drafts. Every one carries the lawyer-review tag until a lawyer has signed it off. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{title}</h1>
        <p className="stamp muted">[LAWYER REVIEW] Draft, last updated October 2026. Plain-English text, not final legal advice.</p>
      </div>
      <div className="prose">{children}</div>
    </div>
  );
}
