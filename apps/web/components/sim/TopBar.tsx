"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ScenarioPreset } from "@/lib/scenarios";
import type { ModelDef } from "@/lib/sim/core";

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
  shareConfig,
  baselineBadge,
}: TopBarProps) => {
  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onModelChange(event.target.value);
  };

  const activeModel = models.find((item) => item.id === modelId);

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
            Model docs
          </Link>
        )}
        <ShareLink config={shareConfig} />
      </div>
    </div>
  );
};
