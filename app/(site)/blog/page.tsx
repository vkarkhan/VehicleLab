import Link from "next/link";

import { Card } from "@/components/Card";
import { Section } from "@/components/Section";
import { getBlogPosts } from "@/lib/contentlayer";

export const metadata = {
  title: "Blog",
  description: "Product updates, physics notes, and roadmap announcements."
};

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="space-y-16 py-16">
      <Section
        title="Latest from VehicleLab"
        description="Stay in the loop with release highlights, technical breakdowns, and community showcases."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Card
              key={post.slug}
              eyebrow={new Date(post.publishedAt).toLocaleDateString()}
              title={post.title}
              description={post.description}
              actions={
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200"
                >
                  Read post
                </Link>
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
