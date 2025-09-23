"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { useSearchParams } from "next/navigation";

import { BottomPlots } from "@/components/sim/BottomPlots";
import { RightPanel } from "@/components/sim/RightPanel";
import { SimCanvas } from "@/components/sim/SimCanvas";
import { TopBar } from "@/components/sim/TopBar";
import { listScenarioPresets } from "@/lib/scenarios";
import { bootModels } from "@/lib/models";
import { getModel, listModels } from "@/lib/sim/registry";
import { useSimStore } from "@/lib/store/simStore";
import type { ModelParams } from "@/lib/sim/core";

bootModels();

const ensureNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const integratorOptions = [
  { label: "RK4", value: "rk4" },
  { label: "Semi-implicit", value: "semiImplicitEuler" },
];

const SimPage = () => {
  const models = useMemo(() => listModels(), []);
  const scenarios = useMemo(() => listScenarioPresets(), []);
  const searchParams = useSearchParams();
  const presetParam = searchParams?.get("p") ?? null;

  const actions = useSimStore((state) => state.actions);
  const running = useSimStore((state) => state.running);
  const modelId = useSimStore((state) => state.modelId);
  const scenarioId = useSimStore((state) => state.scenarioId);
  const params = useSimStore((state) => state.params);
  const speedMultiplier = useSimStore((state) => state.speedMultiplier);
  const error = useSimStore((state) => state.error);

  const [draftParams, setDraftParams] = useState<ModelParams>(params);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    setDraftParams(params);
  }, [params]);

  useEffect(() => {
    if (initRef.current || models.length === 0 || scenarios.length === 0) {
      return;
    }

    const applyPreset = (payload: { modelId?: string; scenarioId?: string; params?: ModelParams }) => {
      const model = models.find((item) => item.id === payload.modelId) ?? models[0];
      const mergedParams = { ...model.defaults, ...(payload.params ?? {}) };
      const scenario = scenarios.find((item) => item.id === payload.scenarioId) ?? scenarios[0];

      actions.setModel(model.id, mergedParams);
      actions.setScenario(scenario.id);
      setDraftParams(mergedParams);
    };

    if (presetParam) {
      try {
        const decoded = decompressFromEncodedURIComponent(presetParam);
        if (decoded) {
          const payload = JSON.parse(decoded);
          applyPreset(payload);
          initRef.current = true;
          return;
        }
      } catch (parseError) {
        console.warn("Failed to parse preset payload", parseError);
      }
    }

    applyPreset({
      modelId: models[0]?.id,
      scenarioId: scenarios[0]?.id,
      params: models[0]?.defaults,
    });
    initRef.current = true;
  }, [actions, models, presetParam, scenarios]);

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/simWorker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<any>) => {
      const message = event.data;
      switch (message.type) {
        case "tick":
          actions.recordTick(message.state, message.telemetry);
          break;
        case "done":
          actions.setRunning(false);
          break;
        case "error":
          actions.setRunning(false);
          actions.setError(message.message ?? "Simulation error");
          break;
        default:
          break;
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [actions]);

  const startSimulation = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    actions.clearTelemetry();
    actions.setError(null);
    worker.postMessage({
      type: "start",
      modelId,
      params: draftParams,
      scenarioId,
      dt: typeof draftParams.dt === "number" ? draftParams.dt : undefined,
      speedMultiplier,
    });
    actions.setRunning(true);
  }, [actions, draftParams, modelId, scenarioId, speedMultiplier]);

  const pauseSimulation = useCallback(() => {
    workerRef.current?.postMessage({ type: "pause" });
    actions.setRunning(false);
  }, [actions]);

  const toggleRun = useCallback(() => {
    if (running) {
      pauseSimulation();
    } else {
      startSimulation();
    }
  }, [pauseSimulation, running, startSimulation]);

  const handleReset = useCallback(() => {
    workerRef.current?.postMessage({ type: "reset" });
    actions.clearTelemetry();
    actions.setRunning(false);
  }, [actions]);

  const handleModelChange = useCallback(
    (nextModelId: string) => {
      const model = models.find((item) => item.id === nextModelId);
      if (!model) return;
      actions.setModel(model.id, model.defaults);
      setDraftParams(model.defaults);
      workerRef.current?.postMessage({ type: "updateParams", params: model.defaults });
    },
    [actions, models]
  );

  const handleScenarioChange = useCallback(
    (nextScenarioId: string) => {
      actions.setScenario(nextScenarioId);
      workerRef.current?.postMessage({ type: "updateScenario", scenarioId: nextScenarioId });
    },
    [actions]
  );

  const handleSpeedChange = useCallback(
    (multiplier: number) => {
      actions.setSpeedMultiplier(multiplier);
      workerRef.current?.postMessage({ type: "setSpeed", multiplier });
    },
    [actions]
  );

  const handleApply = useCallback(() => {
    actions.setParams(draftParams);
    workerRef.current?.postMessage({ type: "updateParams", params: draftParams });
  }, [actions, draftParams]);

  const handleDefaults = useCallback(() => {
    const model = getModel(modelId);
    if (!model) return;
    actions.setParams(model.defaults);
    setDraftParams(model.defaults);
    workerRef.current?.postMessage({ type: "updateParams", params: model.defaults });
  }, [actions, modelId]);

  const handleSavePreset = useCallback(() => {
    console.info("TODO: preset save", draftParams);
  }, [draftParams]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        running ? pauseSimulation() : startSimulation();
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleReset();
      }
      if (event.key >= "1" && event.key <= "9") {
        const index = Number(event.key) - 1;
        const preset = scenarios[index];
        if (preset) {
          event.preventDefault();
          handleScenarioChange(preset.id);
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleReset, handleScenarioChange, pauseSimulation, running, scenarios, startSimulation]);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setDraftParams((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const renderField = (entry: [string, unknown]) => {
    const [key, value] = entry;
    if (typeof value === "number") {
      return (
        <label key={key} className="flex flex-col gap-1 text-xs font-medium">
          <span className="text-slate-500 dark:text-slate-300">{key}</span>
          <input
            type="number"
            value={String(draftParams[key] ?? "")}
            onChange={(event) => handleFieldChange(key, ensureNumber(event.target.value, Number(value)))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      );
    }

    if (typeof value === "boolean") {
      return (
        <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(draftParams[key])}
            onChange={(event) => handleFieldChange(key, event.target.checked)}
          />
          {key}
        </label>
      );
    }

    if (key === "integrator") {
      return (
        <label key={key} className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-300">
          Integrator
          <select
            value={String(draftParams[key] ?? value)}
            onChange={(event) => handleFieldChange(key, event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {integratorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label key={key} className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-300">
        {key}
        <input
          type="text"
          value={String(draftParams[key] ?? "")}
          onChange={(event) => handleFieldChange(key, event.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
    );
  };

  const entries = Object.entries(draftParams ?? {});
  const splitIndex = Math.min(entries.length, 4);
  const basicEntries = entries.slice(0, splitIndex);
  const advancedEntries = entries.slice(splitIndex);

  const shareConfig = useMemo(
    () => ({ modelId, scenarioId, params: draftParams }),
    [modelId, scenarioId, draftParams]
  );

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col bg-slate-100 dark:bg-slate-950">
      <TopBar
        models={models}
        scenarios={scenarios}
        modelId={modelId}
        scenarioId={scenarioId}
        running={running}
        speedMultiplier={speedMultiplier}
        onModelChange={handleModelChange}
        onScenarioChange={handleScenarioChange}
        onToggleRun={toggleRun}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        shareConfig={shareConfig}
      />
      {error && (
        <div className="bg-red-100 px-6 py-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">
          {error}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 bg-slate-200 dark:bg-slate-900">
            <SimCanvas />
          </div>
          <BottomPlots />
        </div>
        <RightPanel
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((value) => !value)}
          basicContent={basicEntries.map(renderField)}
          advancedContent={advancedEntries.map(renderField)}
          onApply={handleApply}
          onDefaults={handleDefaults}
          onSavePreset={handleSavePreset}
          shareConfig={shareConfig}
        />
      </div>
    </div>
  );
};

export default SimPage;
