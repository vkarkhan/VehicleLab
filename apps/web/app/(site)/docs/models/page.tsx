import Link from "next/link";
import { compressToEncodedURIComponent } from "lz-string";

import { getModelDocs } from "@/lib/contentlayer";
import { bootModels } from "@/lib/models";
import { getModel } from "@/lib/sim/registry";
import { getScenarioPreset } from "@/lib/scenarios";
import { TERMINOLOGY } from "@/src/constants/terminology";

bootModels();

export default function ModelsDocsPage() {
  const docs = getModelDocs();
  const rows = docs.map((doc) => {
    const model = getModel(doc.modelId);
    if (!model) {
      return {
        doc,
        sandboxHref: null as string | null,
        scenarioLabel: doc.scenarioId ?? "step-steer",
      };
    }
    const params = model.defaults ?? {};
    const scenarioId = doc.scenarioId ?? "step-steer";
    const payload = compressToEncodedURIComponent(
      JSON.stringify({ modelId: doc.modelId, scenarioId, params })
    );
    const preset = getScenarioPreset(scenarioId);
    return {
      doc,
      sandboxHref: "/sim?p=" + payload,
      scenarioLabel: preset?.label ?? scenarioId,
    };
  });

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Vehicle model library
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Browse the dynamic models available in the sandbox. Each page captures assumptions, governing equations, and preset scenarios.
        </p>
        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-gradient-to-r from-brand-500/10 via-sky-500/10 to-cyan-500/10 px-6 py-5 text-sm text-slate-700 shadow-inner dark:border-slate-800 dark:text-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Need a quick snapshot? Compare models side-by-side and launch their recommended presets without leaving the docs.
            </p>
            <Link
              href="/docs/models/comparison"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              View comparison
            </Link>
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.doc.slug}
              className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  {row.doc.modelId.toUpperCase()}
                </p>
                <div className="space-y-2">
                  <Link
                    href={"/docs/models/" + row.doc.slug}
                    className="text-2xl font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                  >
                    {row.doc.title}
                  </Link>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{row.doc.description}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide">
                <Link
                  href={"/docs/models/" + row.doc.slug}
                  className="inline-flex items-center gap-2 text-brand-600 transition hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  Read {TERMINOLOGY.modelDocs}
                  <span aria-hidden>â†’</span>
                </Link>
                {row.sandboxHref ? (
                  <Link
                    href={row.sandboxHref}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.2em] text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {row.scenarioLabel}
                    <span className="hidden sm:inline">â€” Open {TERMINOLOGY.sandbox}</span>
                    <span className="sm:hidden">Launch</span>
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
