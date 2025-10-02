import Link from "next/link";

import { getTestDocs } from "@/lib/contentlayer";

export default function TestsDocsPage() {
  const docs = getTestDocs();

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Canonical reference tests</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Each test bundles a canonical manoeuvre, analytic predictions, and sandbox links so you can validate models without
          re-creating tooling.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {docs.map((doc) => (
            <article
              key={doc.slug}
              className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{doc.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{doc.description}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide">
                <Link
                  href={"/docs/tests/" + doc.slug}
                  className="inline-flex items-center gap-2 text-brand-600 transition hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  Read test doc
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={"/sim#reference-test-" + doc.slug}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.2em] text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Run in sandbox
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
