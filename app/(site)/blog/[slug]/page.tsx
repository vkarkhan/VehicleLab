import { notFound } from "next/navigation";

import { Mdx } from "@/components/mdx";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/contentlayer";
import { siteConfig } from "@/lib/seo";

interface BlogPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return {};
  }

  const url = `${siteConfig.url}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article"
    }
  };
}

export default function BlogPostPage({ params }: BlogPageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="pb-16 pt-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          {new Date(post.publishedAt).toLocaleDateString()}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{post.title}</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{post.description}</p>
      </div>
      <div className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6 lg:px-0">
        <Mdx code={post.body.code} />
      </div>
    </div>
  );
}
