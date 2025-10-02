import Link from "next/link";
import { compressToEncodedURIComponent } from "lz-string";

import { Button } from "@/components/ui/button";
import { TERMINOLOGY } from "@/src/constants/terminology";
import { getModelDocs } from "@/lib/contentlayer";
import { bootModels } from "@/lib/models";
import { getModel } from "@/lib/sim/registry";
import { getScenarioPreset } from "@/lib/scenarios";

bootModels();

const highlights: Record<string, { strengths: string; bestFor: string; notes?: string }> = {
  unicycle: {
    strengths: "Single-track dynamics with integrator options for controller prototyping.",
    bestFor: "Control logic, rapid prototyping, and visualising path-following without tyre models.",
  },
  lin2dof: {
    strengths: "Captures lateral load transfer cues with tyre cornering stiffness and CG geometry.",
    bestFor: "Handling balance studies, validation sweeps, and comparing measured vs. simulated telemetry.",
    notes: "Enable validation badges to benchmark skidpad targets or constant-radius runs.",
  },
};

const formatCount = (label: string, count: number) => {
  const suffix = count === 1 ? "" : "s";
  return String(count) + " " + label + suffix;
};

export default function ModelComparisonPage() {
  const docs = getModelDocs();
  const rows = docs
    .map((doc) => {
      const model = getModel(doc.modelId);
      if (!model) return null;
      const params = model.defaults ?? {};
      const scenarioId = doc.scenarioId ?? "step-steer";
      const scenario = getScenarioPreset(scenarioId);
      const stateCount = Object.keys(model.init(params as any)).length;
      const paramCount = Object.keys(params).length;
      const payload = compressToEncodedURIComponent(
        JSON.stringify({ modelId: doc.modelId, scenarioId, params })
      );
      const href = "/sim?p=" + payload;
      return {
        doc,
        model,
        scenarioLabel: scenario?.label ?? scenarioId,
        stateCount,
        paramCount,
        href,
        highlight: highlights[doc.modelId] ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="pb-20 pt-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-0">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-300">
          {TERMINOLOGY.modelDocs}
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Model comparison
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          Compare the dynamics models available in the sandbox. Each row links straight into a preset so you can
          iterate without copy/pasting parameters.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <span>Need full notes?</span>
          <Link
            href="/docs/models"
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Browse {TERMINOLOGY.modelDocs}
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-12 w-full max-w-5xl space-y-12 px-4 sm:px-6 lg:px-0">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Comparison at a glance</h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 sm:grid sm:grid-cols-[1.2fr_1fr_1fr_1fr_160px]">
              <div className="px-6 py-3">Model</div>
              <div className="px-6 py-3">States</div>
              <div className="px-6 py-3">Parameters</div>
              <div className="px-6 py-3">Best for</div>
              <div className="px-6 py-3">Open sandbox</div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row) => (
                <div
                  key={row.doc.slug}
                  className="grid gap-4 px-6 py-6 sm:grid-cols-[1.2fr_1fr_1fr_1fr_160px]"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                      {row.doc.modelId.toUpperCase()}
                    </p>
                    <Link
                      href={"/docs/models/" + row.doc.slug}
                      className="text-lg font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                    >
                      {row.doc.title}
                    </Link>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {row.highlight?.strengths ?? row.doc.description}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {formatCount("state", row.stateCount)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {formatCount("parameter", row.paramCount)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {row.highlight?.bestFor ?? row.doc.description}
                  </div>
                  <div className="flex items-center">
                    <Button asChild variant="outline" className="w-full justify-center">
                      <Link href={row.href}>Open {TERMINOLOGY.sandbox}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Scenario presets</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Each model ships with a recommended scenario that highlights its strengths. Launch a preset or tweak the
            steering input once you land in the sandbox.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {rows.map((row) => (
              <article
                key={row.doc.slug + "-scenario"}
                className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                      {row.scenarioLabel}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {row.doc.title}
                    </h3>
                  </div>
                  <code className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {row.doc.modelId}
                  </code>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {row.doc.description}
                </p>
                {row.highlight?.notes ? (
                  <div className="rounded-2xl border border-brand-500/30 bg-brand-50/60 p-4 text-xs text-slate-700 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-slate-200">
                    {row.highlight.notes}
                  </div>
                ) : null}
                <Button asChild className="mt-auto">
                  <Link href={row.href}>Open in Sandbox</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
