"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Play, RefreshCcw, ToggleLeft, ToggleRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/lib/store/simStore";
import {
  runSkidpadRun,
  runStepSteerRun,
  runFrequencyRun,
  runRampToLimitRun,
} from "@/lib/scenarios/canonical";
import type {
  SkidpadConfig,
  SkidpadResult,
  StepSteerConfig,
  StepSteerResult,
  FrequencyConfig,
  FrequencyResult,
  RampConfig,
  RampResult,
} from "@/lib/scenarios/canonical";

type PlotOverlayPayload = {
  label: string;
  yawRate?: { label: string; data: { t: number; value: number }[] };
  ay?: { label: string; data: { t: number; value: number }[] };
};

type CanonicalResult =
  | { id: "skidpad"; config: SkidpadConfig; result: SkidpadResult }
  | { id: "step-steer"; config: StepSteerConfig; result: StepSteerResult }
  | { id: "frequency"; config: FrequencyConfig; result: FrequencyResult }
  | { id: "ramp-limit"; config: RampConfig; result: RampResult };

type TestCardState = {
  running: boolean;
  showOverlay: boolean;
  result: CanonicalResult | null;
};

function overlayFromResult(result: CanonicalResult): PlotOverlayPayload | null {
  switch (result.id) {
    case "skidpad": {
      const yawTheory = result.result.telemetry.map((sample) => ({
        t: sample.t,
        value: result.result.theory.yawRate,
      }));
      const ayTheory = result.result.telemetry.map((sample) => ({
        t: sample.t,
        value: result.result.theory.lateralAcceleration,
      }));
      return {
        label: "Skidpad theory",
        yawRate: { label: "Theory", data: yawTheory },
        ay: { label: "Theory", data: ayTheory },
      };
    }
    case "step-steer": {
      const dt = result.config.dt ?? 0.01;
      const yawTheory = result.result.theory.yawRate.map((value, index) => ({
        t: index * dt,
        value,
      }));
      const ayTheory = result.result.theory.ay.map((value, index) => ({
        t: index * dt,
        value,
      }));
      return {
        label: "Step-steer theory",
        yawRate: { label: "Theory", data: yawTheory },
        ay: { label: "Theory", data: ayTheory },
      };
    }
    case "frequency": {
      const run = result.result.runs[result.result.runs.length - 1];
      if (!run) return null;
      const dt = result.config.dt ?? 0.01;
      const yawTheory = run.telemetry.map((_, index) => ({
        t: index * dt,
        value:
          (result.result.theory.yawRateMag[index % result.result.theory.yawRateMag.length] || 0) *
          (result.config.amplitude || 0),
      }));
      return {
        label: "Frequency theory",
        yawRate: { label: "Linear", data: yawTheory },
      };
    }
    case "ramp-limit": {
      const ayTheory = result.result.telemetry.map((sample) => ({
        t: sample.t,
        value: Math.min(result.result.theory.ayMax, result.result.theory.linearGain * sample.steer),
      }));
      return {
        label: "Ramp theory",
        ay: { label: "Linear", data: ayTheory },
      };
    }
    default:
      return null;
  }
}

function downloadFile(filename: string, content: BlobPart, mimetype: string) {
  const blob = new Blob([content], { type: mimetype });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportJSON(result: CanonicalResult) {
  const payload = {
    id: result.id,
    config: result.config,
    metrics: result.result.metrics,
    grades: result.result.grades,
    flags: result.result.flags,
    telemetry: result.result.telemetry,
    theory: result.result.theory,
  };
  downloadFile(result.id + "-canonical.json", JSON.stringify(payload, null, 2), "application/json");
}

function exportCSV(result: CanonicalResult) {
  const telemetry = result.result.telemetry;
  if (!telemetry.length) return;
  const headers = Object.keys(telemetry[0]);
  const lines = [headers.join(",")];
  telemetry.forEach((sample) => {
    const values = headers.map((key) => {
      const value = (sample as Record<string, number | string | undefined>)[key];
      return typeof value === "number" ? value.toFixed(6) : value || "";
    });
    lines.push(values.join(","));
  });
  downloadFile(result.id + "-telemetry.csv", lines.join("\n"), "text/csv");
}

function exportPNG(result: CanonicalResult) {
  const telemetry = result.result.telemetry;
  if (!telemetry.length) return;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const maxTime = telemetry[telemetry.length - 1].t;
  const ayValues = telemetry.map((sample) => sample.ay);
  const minAy = Math.min(...ayValues);
  const maxAy = Math.max(...ayValues);
  const scaleX = (canvas.width - 96) / Math.max(maxTime, 1e-3);
  const scaleY = (canvas.height - 96) / Math.max(maxAy - minAy, 1e-3);
  ctx.strokeStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(64, 24);
  ctx.lineTo(64, 320);
  ctx.lineTo(600, 320);
  ctx.stroke();
  ctx.strokeStyle = "#2563eb";
  ctx.beginPath();
  telemetry.forEach((sample, index) => {
    const x = 64 + sample.t * scaleX;
    const y = 320 - (sample.ay - minAy) * scaleY;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const overlay = overlayFromResult(result);
  if (overlay && overlay.ay) {
    ctx.strokeStyle = "#0ea5e9";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    overlay.ay.data.forEach((sample, index) => {
      const x = 64 + sample.t * scaleX;
      const y = 320 - (sample.value - minAy) * scaleY;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  downloadFile(result.id + "-plot.png", canvas.toDataURL("image/png"), "image/png");
}

const metricLabel: Record<string, string> = {
  yawError: "Yaw error",
  ayError: "Ay error",
  steerError: "δ error",
  finalError: "DC gain",
  settlingError: "Settling",
  overshootError: "Overshoot",
  dcGainError: "DC gain",
  peakFreqError: "Peak frequency",
  rmsError: "Magnitude RMS",
  gainError: "Linear slope",
  ayAtLimit: "ay limit",
  steerAtLimit: "Steer limit",
};

export const ReferenceTestsPanel = () => {
  const modelId = useSimStore((state) => state.modelId);
  const params = useSimStore((state) => state.params);
  const setOverlay = useSimStore((state) => state.actions.setOverlay);
  const [activeOverlayId, setActiveOverlayId] = useState<TestId | null>(null);
  const [states, setStates] = useState<Record<TestId, TestCardState>>(() =>
    Object.fromEntries(
      tests.map((test) => [test.id, { running: false, showOverlay: false, result: null }])
    ) as Record<TestId, TestCardState>
  );

  const runTest = useCallback(
    (id: TestId) => {
      setStates((prev) => ({ ...prev, [id]: { ...prev[id], running: true } }));
      try {
        let canonicalResult: CanonicalResult | null = null;
        if (id === "skidpad") {
          const config: SkidpadConfig = { ...SKIDPAD_DEFAULTS, modelId, modelParams: params };
          canonicalResult = { id, config, result: runSkidpadRun(config) };
        } else if (id === "step-steer") {
          const config: StepSteerConfig = { ...STEP_STEER_DEFAULTS, modelId, modelParams: params };
          canonicalResult = { id, config, result: runStepSteerRun(config) };
        } else if (id === "frequency") {
          const config: FrequencyConfig = { ...FREQUENCY_DEFAULTS, modelId, modelParams: params };
          canonicalResult = { id, config, result: runFrequencyRun(config) };
        } else {
          const config: RampConfig = { ...RAMP_DEFAULTS, modelId, modelParams: params };
          canonicalResult = { id, config, result: runRampToLimitRun(config) };
        }
        if (!canonicalResult) return;
        setStates((prev) => ({ ...prev, [id]: { ...prev[id], running: false, result: canonicalResult } }));
        if (states[id]?.showOverlay) {
          const overlay = overlayFromResult(canonicalResult);
          if (overlay) {
            setOverlay(overlay);
            setActiveOverlayId(id);
          }
        }
      } catch (error) {
        console.error("Reference test run failed", error);
        setStates((prev) => ({ ...prev, [id]: { ...prev[id], running: false } }));
      }
    },
    [modelId, params, setOverlay, states]
  );

  const toggleOverlay = useCallback(
    (id: TestId) => {
      setStates((prev) => ({ ...prev, [id]: { ...prev[id], showOverlay: !prev[id].showOverlay } }));
      const nextState = !states[id]?.showOverlay;
      if (!nextState) {
        setOverlay(null);
        setActiveOverlayId(null);
        return;
      }
      const result = states[id]?.result;
      if (!result) return;
      const overlay = overlayFromResult(result);
      if (overlay) {
        setOverlay(overlay);
        setActiveOverlayId(id);
      }
    },
    [setOverlay, states]
  );

  return (
    <aside className="w-[320px] min-w-[320px] max-w-[360px] border-l border-slate-200 bg-white/90 px-4 py-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-950/90">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Reference tests</h2>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Run canonical validation scenarios with theory overlays and exportable telemetry.
      </p>
      <div className="mt-4 space-y-4">
        {tests.map((test) => {
          const state = states[test.id];
          const result = state?.result;
          const grades = result?.result.grades || {};
          const metrics = result?.result.metrics || {};
          const flags = result?.result.flags || {};

          return (
            <div
              key={test.id}
              id={"reference-test-" + test.id}
              className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{test.description}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                {Object.entries(test.defaults).map(([key, value]) => (
                  <div key={key}>
                    <dt className="uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500">{key}</dt>
                    <dd>{typeof value === "number" ? value.toString() : String(value)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={state?.running} onClick={() => runTest(test.id)} className="gap-2">
                  {state?.running ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run test
                </Button>
                <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportJSON(result)}>
                  JSON
                </Button>
                <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportCSV(result)}>
                  CSV
                </Button>
                <Button size="sm" variant="outline" disabled={!result} onClick={() => result && exportPNG(result)}>
                  PNG
                </Button>
              </div>
              {result && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(grades).map(([key, pass]) => (
                      <span key={key} className={badgeClass(Boolean(pass))}>
                        {(pass ? "Pass: " : "Fail: ") + (metricLabel[key] || key)}
                      </span>
                    ))}
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{metricLabel[key] || key}</dt>
                        <dd>{typeof value === "number" ? value.toFixed(3) : String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => toggleOverlay(test.id)}
                      className="inline-flex items-center gap-1 text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
                    >
                      {state?.showOverlay && activeOverlayId === test.id ? (
                        <>
                          <ToggleRight className="h-3.5 w-3.5" /> Theory overlay
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3.5 w-3.5" /> Theory overlay
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">
                        Flags: {Object.entries(flags).filter(([, value]) => value).map(([key]) => key).join(", ") || "None"}
                      </span>
                      <Link
                        href={"/docs/tests/" + test.id}
                        className="hidden text-[10px] uppercase tracking-wide text-slate-400 transition hover:text-brand-600 dark:hover:text-brand-300 sm:inline-flex"
                      >
                        Doc
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

const badgeClass = (pass: boolean) =>
  cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
    pass
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
  );

const SKIDPAD_DEFAULTS: SkidpadConfig = {
  speed: 22,
  radius: 30,
  duration: 18,
  controller: { kp: 0.35, ki: 0.06 },
};

const STEP_STEER_DEFAULTS: StepSteerConfig = {
  speed: 20,
  delta: 5 * (Math.PI / 180),
  duration: 8,
  tStep: 1,
};

const FREQUENCY_DEFAULTS: FrequencyConfig = {
  speed: 18,
  freqs: [0.5, 0.8, 1.2],
  amplitude: 3 * (Math.PI / 180),
  cycles: 8,
  settleCycles: 3,
  dt: 0.01,
};

const RAMP_DEFAULTS: RampConfig = {
  speed: 18,
  rampRate: 0.12,
  duration: 10,
};

const tests = [
  {
    id: "skidpad" as const,
    title: "Skidpad",
    description: "Closed-loop radius hold compared with linear theory.",
    defaults: SKIDPAD_DEFAULTS,
  },
  {
    id: "step-steer" as const,
    title: "Step steer",
    description: "Small-angle steering step for DC gain and damping.",
    defaults: STEP_STEER_DEFAULTS,
  },
  {
    id: "frequency" as const,
    title: "Frequency response",
    description: "Multi-tone yaw-rate sweep across key frequencies.",
    defaults: FREQUENCY_DEFAULTS,
  },
  {
    id: "ramp-limit" as const,
    title: "Ramp to limit",
    description: "Slow steering ramp until the friction envelope is reached.",
    defaults: RAMP_DEFAULTS,
  },
] satisfies Array<{
  id: "skidpad" | "step-steer" | "frequency" | "ramp-limit";
  title: string;
  description: string;
  defaults: SkidpadConfig | StepSteerConfig | FrequencyConfig | RampConfig;
}>;

type TestId = typeof tests[number]["id"];
