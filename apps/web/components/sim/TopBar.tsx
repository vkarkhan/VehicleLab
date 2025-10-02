"use client";

import Link from "next/link";
import { useMemo, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";
import type { ScenarioPreset } from "@/lib/scenarios";
import type { ModelDef } from "@/lib/sim/core";
import { useSimStore } from "@/lib/store/simStore";
import { createVehicleParams } from "@/lib/vehicle/params";
import { computeUndersteerGradient, steadyStateSteerAngle } from "@/lib/vehicle/understeer";
import { TERMINOLOGY } from "@/src/constants/terminology";

import type { ShareConfig } from "./ShareLink";
import { ShareLink } from "./ShareLink";

type TopBarProps = {
  models: ModelDef[];
  scenarios: ScenarioPreset<any>[];
  modelId: string;
  scenarioId: string;
  running: boolean;
  speedMultiplier: number;
  onModelChange: (id: string) => void;
  onScenarioChange: (id: string) => void;
  onToggleRun: () => void;
  onReset: () => void;
  onSpeedChange: (multiplier: number) => void;
  lateralUnit: "g" | "mps2";
  onLateralUnitChange: (unit: "g" | "mps2") => void;
  shareConfig: ShareConfig;
  baselineBadge?: {
    status: "idle" | "running" | "pass" | "fail";
    onRun?: () => void;
  };
};

export const TopBar = ({
  models,
  scenarios,
  modelId,
  scenarioId,
  running,
  speedMultiplier,
  onModelChange,
  onScenarioChange,
  onToggleRun,
  onReset,
  onSpeedChange,
  lateralUnit,
  onLateralUnitChange,
  shareConfig,
  baselineBadge,
}: TopBarProps) => {
  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onModelChange(event.target.value);
  };

  const activeModel = models.find((item) => item.id === modelId);
  const lastTelemetry = useSimStore((state) => state.lastTelemetry);
  const storeParams = useSimStore((state) => state.params);

  const steadyStateReadout = useMemo(() => {
    const paramObject = storeParams as Record<string, unknown>;
    const yawRate = lastTelemetry?.r ?? 0;
    const speed = typeof paramObject.v === "number" ? paramObject.v : undefined;
    const hasLinearParams =
      typeof paramObject.m === "number" &&
      typeof paramObject.Iz === "number" &&
      typeof paramObject.a === "number" &&
      typeof paramObject.b === "number" &&
      typeof paramObject.Cf === "number" &&
      typeof paramObject.Cr === "number" &&
      typeof speed === "number";

    if (!hasLinearParams || !speed || Math.abs(yawRate) < 1e-5) {
      return { understeer: null as number | null, delta: null as number | null };
    }

    try {
      const vehicleParams = createVehicleParams({
        m: paramObject.m as number,
        Iz: paramObject.Iz as number,
        a: paramObject.a as number,
        b: paramObject.b as number,
        Cf: paramObject.Cf as number,
        Cr: paramObject.Cr as number,
        mu: (paramObject.mu as number) ?? 1,
        track: (paramObject.trackWidth as number) ?? 1.6,
        hCg: (paramObject.hCg as number) ?? 0.55,
      });
      const understeer = computeUndersteerGradient(vehicleParams);
      const radius = speed / yawRate;
      if (!Number.isFinite(radius)) {
        return { understeer, delta: null as number | null };
      }
      const delta = steadyStateSteerAngle(speed, radius, vehicleParams);
      return { understeer, delta };
    } catch (error) {
      console.warn("Unable to compute steady-state metrics", error);
      return { understeer: null as number | null, delta: null as number | null };
    }
  }, [lastTelemetry, storeParams]);

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300" htmlFor="sim-model">
          Model
        </label>
        <select
          id="sim-model"
          value={modelId}
          onChange={handleModelChange}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none transition hover:border-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Scenario
        </span>
        <div className="flex rounded-md border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          {scenarios.map((scenario) => {
            const active = scenarioId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onScenarioChange(scenario.id)}
                className={cn(
                  "rounded-sm px-3 py-1 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onToggleRun} title={running ? "Pause simulation" : "Start simulation"}>
          {running ? "Pause" : "Run"}
        </Button>
        <Button size="sm" variant="outline" onClick={onReset} title="Reset simulation">
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Speed {speedMultiplier.toFixed(2)}x
        </span>
        <Slider
          value={[speedMultiplier]}
          min={0.25}
          max={2}
          step={0.05}
          className="w-32"
          onValueChange={(values) => onSpeedChange(values[0] ?? 1)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Lateral accel</span>
        <InfoTooltip
          content="Switch between gravitational units and metric acceleration for telemetry and plots."
          label="Lateral acceleration units"
        />
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          <button
            type="button"
            onClick={() => {
              if (lateralUnit !== "g") onLateralUnitChange("g");
            }}
            className={cn(
              "rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              lateralUnit === "g"
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "hover:text-slate-900 dark:hover:text-white"
            )}
            aria-pressed={lateralUnit === "g"}
          >
            g
          </button>
          <button
            type="button"
            onClick={() => {
              if (lateralUnit !== "mps2") onLateralUnitChange("mps2");
            }}
            className={cn(
              "rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              lateralUnit === "mps2"
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "hover:text-slate-900 dark:hover:text-white"
            )}
            aria-pressed={lateralUnit === "mps2"}
          >
            m/s^2
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
        <div>
          U {steadyStateReadout.understeer !== null ? steadyStateReadout.understeer.toFixed(4) : "—"} rad/g
        </div>
        <div>
          δ<sub>ss</sub> {steadyStateReadout.delta !== null ? (steadyStateReadout.delta * 57.2958).toFixed(1) : "—"}°
        </div>
      </div>

      {baselineBadge && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/70 px-3 py-1 text-sm dark:border-slate-800 dark:bg-slate-900/70">
          <span>Baseline</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
              baselineBadge.status === "pass" && "border-emerald-500 bg-emerald-100 text-emerald-700 dark:border-emerald-400/80 dark:bg-emerald-900/40 dark:text-emerald-200",
              baselineBadge.status === "fail" && "border-rose-500 bg-rose-100 text-rose-700 dark:border-rose-400/80 dark:bg-rose-900/40 dark:text-rose-200",
              baselineBadge.status === "running" && "border-sky-500 bg-sky-100 text-sky-700 dark:border-sky-400/80 dark:bg-sky-900/40 dark:text-sky-200",
              baselineBadge.status === "idle" && "border-slate-400 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300"
            )}
          >
            {baselineBadge.status === "pass" && "PASS"}
            {baselineBadge.status === "fail" && "FAIL"}
            {baselineBadge.status === "running" && "RUNNING"}
            {baselineBadge.status === "idle" && "IDLE"}
          </span>
          {baselineBadge.onRun && (
            <Button
              size="sm"
              variant="ghost"
              onClick={baselineBadge.onRun}
              disabled={baselineBadge.status === "running"}
              title="Run baseline validation"
            >
              Run Baseline
            </Button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {activeModel?.docsSlug && (
          <Link
            href={activeModel.docsSlug}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
          >
            {TERMINOLOGY.modelDocs}
          </Link>
        )}
        <ShareLink config={shareConfig} />
      </div>
    </div>
  );
};

