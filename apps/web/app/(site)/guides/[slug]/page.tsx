import { notFound } from "next/navigation";

import { Mdx } from "@/components/mdx";
import { getGuideBySlug, getGuides } from "@/lib/contentlayer";
import { siteConfig } from "@/lib/seo";

interface GuidePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getGuides().map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: GuidePageProps) {
  const guide = getGuideBySlug(params.slug);

  if (!guide) {
    return {};
  }

  const url = `${siteConfig.url}/guides/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      type: "article"
    }
  };
}

export default function GuidePage({ params }: GuidePageProps) {
  const guide = getGuideBySlug(params.slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          {new Date(guide.publishedAt).toLocaleDateString()}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{guide.title}</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{guide.description}</p>
      </div>
      <div className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <Mdx code={guide.body.code} />
      </div>
    </div>
  );
}
