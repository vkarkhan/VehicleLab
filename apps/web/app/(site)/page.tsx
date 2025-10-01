import dynamic from "next/dynamic";
import Link from "next/link";

import { Card } from "@/components/Card";
import { PingButton } from "@/components/ping-button";
import { Section } from "@/components/Section";
import { getBlogPosts, getGuides } from "@/lib/contentlayer";
import { TERMINOLOGY } from "@/src/constants/terminology";

const HeroVisual = dynamic(async () => {
  const mod = await import("@/components/hero-visual");
  return mod.HeroVisual;
}, {
  ssr: false,
  loading: () => (
    <div className="relative aspect-video w-full overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-gradient-to-br from-white via-slate-100 to-slate-200 opacity-80 shadow-soft dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" />
  )
});

export default function HomePage() {
  const guides = getGuides().slice(0, 3);
  const posts = getBlogPosts().slice(0, 2);

  return (
    <div className="space-y-24 pb-20">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 py-24 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-900">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.24),_transparent_60%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" aria-hidden />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div className="flex-1 max-w-2xl space-y-8">
            <span className="inline-flex select-none items-center gap-2 rounded-full border border-transparent bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[0_10px_30px_-24px_rgba(79,70,229,0.6)] backdrop-blur-sm dark:bg-white/10 dark:text-slate-200">
              VehicleLab Platform
            </span>
            <h1 className="font-display text-4xl leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              A premium vehicle dynamics sandbox for modern racing and research teams.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Build intuition faster with live telemetry, rich reporting, and collaborative exports. Tune tyres, aero, and weight distribution while the preview responds instantly to every tweak.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/sim"
                aria-label="Launch the live sandbox"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-brand-700 to-brand-500 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_22px_60px_-35px_rgba(79,70,229,0.85)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_-34px_rgba(79,70,229,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:from-white dark:via-brand-200 dark:to-brand-500 dark:text-slate-900"
              >
                Launch live sandbox
              </Link>
              <Link
                href="/docs/models/comparison"
                aria-label="Compare VehicleLab models"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.6)] transition duration-300 hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200"
              >
                Compare models
              </Link>
              <Link
                href="/guides"
                aria-label="Open the VehicleLab guides"
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
              >
                Read guides
                <span aria-hidden>{"->"}</span>
              </Link>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No installs, just open the browser and start iterating.
            </p>
          </div>
          <div className="flex-1">
            <div className="relative rounded-3xl border border-white/60 bg-white/60 p-6 shadow-[0_30px_60px_-40px_rgba(79,70,229,0.6)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/40">
              <HeroVisual />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Visualise yaw rate, lateral acceleration, and slip angles as you iterate on your setup. The sandbox updates in real-time with every control input.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <PingButton />
      </section>

      <Section
        id="features"
        title="Built for rapid experimentation"
        description="Understand how tyres, suspension, and driver inputs interact in seconds."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            eyebrow={TERMINOLOGY.sandbox}
            title="Real-time vehicle dynamics"
            description="Manipulate mass, centre of gravity, and steering inputs in a tactile WebGL playground."
          />
          <Card
            eyebrow={TERMINOLOGY.telemetry}
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

