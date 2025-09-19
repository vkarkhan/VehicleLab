import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, description, eyebrow, children, actions, className }: CardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm shadow-slate-900/5 backdrop-blur transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-brand-500/60 ${
        className ?? ""
      }`}
    >
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">{eyebrow}</span>}
      {title && <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h3>}
      {description && <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{description}</p>}
      {children && <div className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">{children}</div>}
      {actions && <div className="mt-6 flex items-center gap-3">{actions}</div>}
    </article>
  );
}
