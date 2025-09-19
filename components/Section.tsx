import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, title, description, children, className }: SectionProps) {
  return (
    <section id={id} className={`w-full py-16 ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="mb-12 max-w-2xl">
            {title && <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
            {description && (
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{description}</p>
            )}
          </div>
        )}
        <div className="grid gap-6">{children}</div>
      </div>
    </section>
  );
}
