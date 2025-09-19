import type { Metadata } from "next";

import { SandboxClient } from "@/components/(sandbox)/SandboxClient";
import profile from "@/content/profile.json";
import { defaultSandboxState, parseStateFromSearchParams } from "@/lib/stateSchema";

export const metadata: Metadata = {
  title: "Sandbox",
  description: "Interactive 3D vehicle dynamics sandbox."
};

interface VehicleLabPageProps {
  searchParams?: Record<string, string | string[]>;
}

export default function VehicleLabPage({ searchParams }: VehicleLabPageProps) {
  const initialState = searchParams ? parseStateFromSearchParams(searchParams) : defaultSandboxState;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 space-y-4">
        <span className="inline-flex items-center rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          VehicleLab
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">3D Vehicle Dynamics Sandbox</h1>
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          Manipulate mass, grip, steering inputs, and manoeuvres to visualise handling balance in real time. Charts update as you explore.
        </p>
      </div>
      <SandboxClient initialState={initialState} enable3D={profile.enable3D} />
    </div>
  );
}
