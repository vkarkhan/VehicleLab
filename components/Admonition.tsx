import type { ReactNode } from "react";

interface AdmonitionProps {
  type?: "tip" | "note" | "warning";
  title?: string;
  children: ReactNode;
}

const styles: Record<string, string> = {
  tip: "border-brand-300/60 bg-brand-500/5 text-brand-700 dark:text-brand-200",
  note: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  warning: "border-amber-300/80 bg-amber-500/10 text-amber-700 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
};

export function Admonition({ type = "note", title, children }: AdmonitionProps) {
  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm shadow-sm ${styles[type]}`}>
      {title && <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>}
      <div className="mt-2 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}
