"use client";

import { roundTo } from "@/lib/utils";

import type { NoSteerTestResult } from "@/lib/noSteerTest";

type LateralUnit = "g" | "mps2";

interface NoSteerTestCardProps {
  result: NoSteerTestResult | null;
  lateralUnit: LateralUnit;
  isRunning: boolean;
  lastRunAt?: number | null;
}

const GRAVITY = 9.80665;

function formatLateral(value: number, unit: LateralUnit) {
  if (unit === "g") {
    return `${roundTo(value / GRAVITY, 3)} g`;
  }
  return `${roundTo(value, 3)} m/s^2`;
}

function formatThreshold(result: NoSteerTestResult, unit: LateralUnit) {
  if (unit === "g") {
    return `${roundTo(result.thresholds.lateralAccelerationG, 3)} g`;
  }
  return `${roundTo(result.thresholds.lateralAcceleration, 3)} m/s^2`;
}

export function NoSteerTestCard({ result, lateralUnit, isRunning, lastRunAt }: NoSteerTestCardProps) {
  const statusLabel = result?.pass ? "Pass" : "Investigate";
  const statusTone = result?.pass
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">No-steer test (delta = 0)</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Locks steering to zero for five seconds (one second settle) and captures yaw and lateral acceleration.
          </p>
        </div>
        {result ? (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusTone}`}>
            {statusLabel}
          </span>
        ) : null}
      </div>

      {isRunning ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Running no-steer check...</p>
      ) : result ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Max |yaw rate|</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{roundTo(result.maxYawRate, 4)} rad/s</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Threshold {roundTo(result.thresholds.yawRate, 3)} rad/s</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Max |lat accel|</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{formatLateral(result.maxLateralAcceleration, lateralUnit)}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Threshold {formatThreshold(result, lateralUnit)} ({roundTo(result.thresholds.lateralAccelerationG, 3)} g)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Equivalent peak {roundTo(result.maxLateralAccelerationG, 3)} g</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Assumes steady speed and uses the current setup to integrate the bicycle model. {result.samplesEvaluated} settled samples analysed.
            {lastRunAt ? ` Last run ${new Date(lastRunAt).toLocaleTimeString()}.` : ""}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Run the no-steer test to populate results.</p>
      )}
    </div>
  );
}
