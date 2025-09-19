import Link from "next/link";

import { Card } from "@/components/Card";
import { Section } from "@/components/Section";
import { getGuides } from "@/lib/contentlayer";

export const metadata = {
  title: "Guides",
  description: "Practical walkthroughs for understanding vehicle dynamics."
};

export default function GuidesPage() {
  const guides = getGuides();

  return (
    <div className="space-y-16 py-16">
      <Section
        title="Guides"
        description="Deep dives on handling balance, transient response, and tyre behaviour."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Card
              key={guide.slug}
              eyebrow={new Date(guide.publishedAt).toLocaleDateString()}
              title={guide.title}
              description={guide.description}
              actions={
                <Link
                  href={`/guides/${guide.slug}`}
                  className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200"
                >
                  Read guide
                </Link>
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
