"use client";

import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
}: TopBarProps) => {
  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onModelChange(event.target.value);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Model
        </label>
        <select
          value={modelId}
          onChange={handleModelChange}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className={ounded-sm px-3 py-1 text-sm font-medium transition-colors }
              >
                {scenario.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onToggleRun}>
          {running ? "Pause" : "Run"}
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Speed {speedMultiplier.toFixed(2)}×
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

      <div className="ml-auto">
        <ShareLink config={shareConfig} />
      </div>
    </div>
  );
};
