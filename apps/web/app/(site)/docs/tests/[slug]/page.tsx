import Link from "next/link";
import { notFound } from "next/navigation";

import { Mdx } from "@/components/mdx";
import { getTestDocBySlug, getTestDocs } from "@/lib/contentlayer";
import { siteConfig } from "@/lib/seo";

interface TestDocPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getTestDocs().map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: TestDocPageProps) {
  const doc = getTestDocBySlug(params.slug);
  if (!doc) {
    return {};
  }
  const url = siteConfig.url + "/docs/tests/" + doc.slug;
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

export default function TestDocPage({ params }: TestDocPageProps) {
  const doc = getTestDocBySlug(params.slug);
  if (!doc) {
    notFound();
  }

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{doc.title}</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{doc.description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span>Ready to run the test?</span>
          <Link
            href={"/sim#reference-test-" + doc.slug}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[0.65rem] font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Open in sandbox
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <Mdx code={doc.body.code} />
      </div>
    </div>
  );
}
