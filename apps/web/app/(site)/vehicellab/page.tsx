import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Gauge, Layers, Workflow } from "lucide-react";

import { SandboxClient } from "@/components/(sandbox)/SandboxClient";
import { Button } from "@/components/ui/button";
import profile from "@/content/profile.json";
import { defaultSandboxState, parseStateFromSearchParams } from "@/lib/stateSchema";

const heroMetrics = [
  {
    label: "Reference manoeuvres",
    value: "Skidpad, lane change, zero-steer"
  },
  {
    label: "Signal coverage",
    value: "Yaw, lateral g, slip & axle load"
  },
  {
    label: "Ready exports",
    value: "CSV telemetry and PNG snapshots"
  }
] as const;

const capabilityCards = [
  {
    title: "Reference manoeuvres",
    tag: "Scenarios",
    description:
      "Swap between classic handling tests to understand balance. Each scenario tunes pathing and steering inputs for you.",
    points: ["Skidpad with adjustable radius", "ISO lane-change template", "Zero-steer flat road baseline"],
    icon: Gauge
  },
  {
    title: "Virtual instrumentation",
    tag: "Visual overlays",
    description:
      "Overlay instrumentation shaped by VehicleLab's instrumentation suite to understand forces and balance in context.",
    points: ["Force arrows and tyre footprints", "Slip angle breakdown by axle", "Front/rear load distribution bars"],
    icon: Layers
  },
  {
    title: "Validation workflows",
    tag: "Data review",
    description:
      "Pair synthetic results with track data to evaluate fidelity and produce shareable reports.",
    points: ["Upload validation runs", "Compare measured vs modelled signals", "Export CSV and snapshots on demand"],
    icon: Workflow
  }
] as const;

const workflowSteps = [
  {
    title: "Configure",
    body: "Set vehicle mass properties, tyre grip, and ride height while the preview updates instantly."
  },
  {
    title: "Simulate",
    body: "Dial in manoeuvre inputs and camera modes, then watch the three.js canvas render every trace in real time."
  },
  {
    title: "Review",
    body: "Validate against measured data, export telemetry, and share stateful URLs with teammates."
  }
] as const;

export const metadata: Metadata = {
  title: "VehicleLab Sandbox",
  description:
    "VehicleLab-native interactive 3D vehicle dynamics sandbox with telemetry, validation workflows, and export-ready reporting."
};

interface VehicleLabPageProps {
  searchParams?: Record<string, string | string[]>;
}

export default function VehicleLabPage({ searchParams }: VehicleLabPageProps) {
  const initialState = searchParams ? parseStateFromSearchParams(searchParams) : defaultSandboxState;

  return (
    <main className="pb-20">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute -right-28 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            VehicleLab
          </span>
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                VehicleLab-native vehicle dynamics sandbox
              </h1>
              <p className="max-w-2xl text-lg text-white/80">
                Bring the polish of the VehicleLab launch experience into the VehicleLab sandbox. Lead
                with a bold hero, decisive CTAs, and supporting stats that frame the simulation canvas.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
                  <Link href="#sandbox">Launch sandbox</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="#workflows">
                    Explore workflow
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <dl className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {heroMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-inner backdrop-blur"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-white/70">{item.label}</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hidden rounded-3xl border border-white/15 bg-white/5 p-6 shadow-xl backdrop-blur lg:flex lg:flex-col lg:gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Spotlight</p>
              <p className="text-xl font-semibold text-white">Real-time handling insights</p>
              <ul className="list-disc space-y-3 pl-4 text-sm text-white/80">
                <li>Dynamic balance badges for understeer, oversteer, or neutral</li>
                <li>Slip-angle breakdowns per axle</li>
                <li>Live lateral acceleration with unit switching</li>
              </ul>
              <div className="mt-auto rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg">
                Styled to echo the VehicleLab reference application cards.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Reference applications reinterpreted
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Carry VehicleLab&apos;s rhythm of feature bands with cards that explain what the sandbox offers before users
            dive into controls.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {capabilityCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {card.tag}
                </span>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                  <Icon className="h-6 w-6 text-brand-500 dark:text-brand-300" />
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{card.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflows" className="bg-slate-50 py-12 dark:bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Workflow at a glance</h2>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Echo the VehicleLab workflow story by laying out how users configure, simulate, and review within
              VehicleLab.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  Step {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sandbox" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Interactive sandbox</h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Launch the VehicleLab experience - controls, metrics, and validation presented with confident cards
            and deliberate typographic hierarchy.
          </p>
        </div>
        <SandboxClient initialState={initialState} enable3D={profile.enable3D} />
      </section>
    </main>
  );
}
