import Link from "next/link";

import { getModelDocs } from "@/lib/contentlayer";

export default function ModelsDocsPage() {
  const docs = getModelDocs();
  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Vehicle model library
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Browse the dynamic models available in the sandbox. Each page captures assumptions, governing equations, and preset scenarios.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={"/docs/models/" + doc.slug}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                {doc.modelId.toUpperCase()}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 transition group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                {doc.title}
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{doc.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 dark:text-brand-300">
                Read model notes -&gt;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
