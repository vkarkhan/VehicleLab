import Link from "next/link";
import { notFound } from "next/navigation";
import { compressToEncodedURIComponent } from "lz-string";

import { Mdx } from "@/components/mdx";
import { bootModels } from "@/lib/models";
import { getModelDocBySlug, getModelDocs } from "@/lib/contentlayer";
import { getModel } from "@/lib/sim/registry";
import { siteConfig } from "@/lib/seo";

bootModels();

interface ModelDocPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getModelDocs().map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: ModelDocPageProps) {
  const doc = getModelDocBySlug(params.slug);
  if (!doc) {
    return {};
  }

  const url = siteConfig.url + "/docs/models/" + doc.slug;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: url },
    openGraph: {
      title: doc.title,
      description: doc.description,
      url,
      type: "article",
    },
  };
}

export default function ModelDocPage({ params }: ModelDocPageProps) {
  const doc = getModelDocBySlug(params.slug);
  if (!doc) {
    notFound();
  }

  const model = getModel(doc.modelId);
  const defaults = model?.defaults ?? {};
  const scenarioId = doc.scenarioId ?? "step-steer";
  const payload = compressToEncodedURIComponent(
    JSON.stringify({ modelId: doc.modelId, scenarioId, params: defaults })
  );
  const sandboxHref = "/sim?p=" + payload;
  const defaultIntegrator = (defaults as Record<string, unknown>).integrator ?? "rk4";
  const defaultDt = (defaults as Record<string, unknown>).dt;

  const canonicalTests = [
    { slug: "skidpad", title: "Skidpad" },
    { slug: "step-steer", title: "Step-steer" },
    { slug: "frequency", title: "Frequency response" },
    { slug: "ramp-limit", title: "Ramp to limit" },
  ];

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          {doc.modelId.toUpperCase()}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {doc.title}
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{doc.description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span>Want to benchmark against another model?</span>
          <Link
            href="/docs/models/comparison"
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            View comparison
          </Link>
        </div>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <span>Default scenario:</span>
          <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {scenarioId}
          </code>
          <Link
            href={sandboxHref}
            className="inline-flex items-center rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-500"
          >
            Open in Sandbox
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span>Validated by canonical tests</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Solver {String(defaultIntegrator)} · dt {typeof defaultDt === "number" ? defaultDt.toFixed(3) + " s" : "adaptive"}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2 text-xs">
              {canonicalTests.map((test) => (
                <li key={test.slug}>
                  <Link
                    href={"/docs/tests/" + test.slug}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {test.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/sim#reference-test-skidpad"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Run panel
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <Mdx code={doc.body.code} />
      </div>
    </div>
  );
}
