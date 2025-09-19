import Link from "next/link";

import { Card } from "@/components/Card";
import { Section } from "@/components/Section";
import { getBlogPosts, getGuides } from "@/lib/contentlayer";

export default function HomePage() {
  const guides = getGuides().slice(0, 3);
  const posts = getBlogPosts().slice(0, 2);

  return (
    <div className="space-y-24 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 py-24 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center rounded-full bg-brand-500/10 px-4 py-1 text-sm font-medium text-brand-600 dark:text-brand-300">
              VehicleLab
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Vehicle dynamics sandbox built for modern teams and curious engineers.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Experiment with tyre grip, weight transfer, and steering inputs in a responsive WebGL sandbox. Capture insights
              using interactive charts, export reports, and collaborate with your team.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/vehicellab"
                className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950"
              >
                Launch the sandbox
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200"
              >
                Explore guides
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-brand-500/20 via-transparent to-brand-500/10" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Visualise yaw rate, lateral acceleration, and slip angles as you iterate on your setup. The sandbox updates in
                real-time with every control input.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Section
        id="features"
        title="Built for rapid experimentation"
        description="Understand how tyres, suspension, and driver inputs interact in seconds."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            eyebrow="Sandbox"
            title="Real-time vehicle dynamics"
            description="Manipulate mass, centre of gravity, and steering inputs in a tactile WebGL playground."
          />
          <Card
            eyebrow="Telemetry"
            title="Charts that matter"
            description="Lateral acceleration, yaw rate, and slip angles sampled at 20 Hz to mirror track data."
          />
          <Card
            eyebrow="Collaboration"
            title="Shareable setups"
            description="Deep-link every sandbox state to share with teammates or embed in guides and reports."
          />
        </div>
      </Section>

      <Section
        id="content"
        title="Guides and case studies"
        description="Learn the fundamentals of handling balance, tyre grip, and transient response from our curated library."
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

      <Section
        id="pricing"
        title="Freemium with optional Pro"
        description="Start for free with exports and telemetry. Upgrade for professional workflows, watermark-free media, and more."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Freemium pricing"
            description="Start for free with watermarked exports. Upgrade to VehicleLab Pro for watermark-free PNGs, advanced suspension controls, and PDF reports."
            actions={
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950"
              >
                Compare plans
              </Link>
            }
          />
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
                  Read blog
                </Link>
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
