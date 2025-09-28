"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { createMainThreadRunner, type WorkerLike } from "@/lib/sim/mainThreadRunner";
import type { SimWorkerResponse } from "@/lib/sim/messages";
import { describeSchema, type FieldDescriptor } from "@/lib/forms/schema";
import { runBaseline } from "@/lib/validation/baseline";

bootModels();

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
  const baselineStatus = useSimStore((state) => state.baselineStatus);
  const baselineMetrics = useSimStore((state) => state.baselineMetrics);

  const model = useMemo(() => models.find((item) => item.id === modelId) ?? models[0], [modelId, models]);
  const schema = model?.schema;
  const resolver = useMemo(() => (schema ? zodResolver(schema) : undefined), [schema]);

  const form = useForm<Record<string, unknown>>({
    resolver: resolver as any,
    defaultValues: params as Record<string, unknown>,
    mode: "onBlur",
  });
  const watchedValues = form.watch();

  const fieldGroups = useMemo(() => (schema ? describeSchema(schema) : { basic: [], advanced: [] }), [schema]);

  const baselineMetricsSummary = useMemo(() => {
    if (!baselineMetrics) return null;
    return Object.entries(baselineMetrics)
      .map(([key, value]) => {
        const numeric = typeof value === "number" && Number.isFinite(value);
        return key + "=" + (numeric ? value.toFixed(3) : String(value));
      })
      .join(" | ");
  }, [baselineMetrics]);

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [presetBanner, setPresetBanner] = useState<{ type: "success" | "error"; name?: string } | null>(null);
  const [baselinePending, startBaselineTransition] = useTransition();
  const workerRef = useRef<Worker | WorkerLike | null>(null);
  const initRef = useRef(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    form.reset(params as Record<string, unknown>);
  }, [form, params, modelId]);

  useEffect(() => {
    if (!presetBanner) return;
    const timer = window.setTimeout(() => setPresetBanner(null), 2400);
    return () => window.clearTimeout(timer);
  }, [presetBanner]);

  const handleWorkerMessage = useCallback(
    (message: SimWorkerResponse) => {
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
    },
    [actions]
  );

  useEffect(() => {
    if (initRef.current || models.length === 0 || scenarios.length === 0) {
      return;
    }

    const applyPreset = (payload: { modelId?: string; scenarioId?: string; params?: ModelParams; speedMultiplier?: number }) => {
      const presetModel = models.find((item) => item.id === payload.modelId) ?? models[0];
      const mergedParams = { ...presetModel.defaults, ...(payload.params ?? {}) };
      const presetScenario = scenarios.find((item) => item.id === payload.scenarioId) ?? scenarios[0];

      actions.setModel(presetModel.id, mergedParams);
      actions.setScenario(presetScenario.id);
      if (typeof payload.speedMultiplier === "number") {
        actions.setSpeedMultiplier(payload.speedMultiplier);
      }
      form.reset(mergedParams as Record<string, unknown>);
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

    if (typeof window !== "undefined") {
      try {
        const storedRaw = window.localStorage.getItem("vehicleLab:sandbox");
        if (storedRaw) {
          const stored = JSON.parse(storedRaw) as { modelId?: string; scenarioId?: string; params?: ModelParams; speedMultiplier?: number };
          applyPreset(stored);
          if (typeof stored.speedMultiplier === "number") {
            actions.setSpeedMultiplier(stored.speedMultiplier);
          }
          initRef.current = true;
          return;
        }
      } catch (storageError) {
        console.warn("Failed to restore sandbox state", storageError);
      }
    }

    applyPreset({
      modelId: models[0]?.id,
      scenarioId: scenarios[0]?.id,
      params: models[0]?.defaults,
    });
    initRef.current = true;
  }, [actions, form, models, presetParam, scenarios]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const createFallback = () => {
      const runner = createMainThreadRunner({ onMessage: handleWorkerMessage });
      workerRef.current = runner;
      setUsingFallback(true);
      return () => {
        runner.terminate();
        workerRef.current = null;
      };
    };

    try {
      if (typeof Worker !== "function") {
        return createFallback();
      }
      const worker = new Worker(new URL("../../workers/simWorker.ts", import.meta.url));
      workerRef.current = worker;
      setUsingFallback(false);
      worker.onmessage = (event: MessageEvent<SimWorkerResponse>) => {
        handleWorkerMessage(event.data);
      };
      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.warn("Simulation worker unavailable, using main-thread fallback", error);
      return createFallback();
    }
  }, [handleWorkerMessage]);

  const startSimulation = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const activeParams = params as Record<string, unknown>;
    actions.clearTelemetry();
    actions.setError(null);
    worker.postMessage({
      type: "start",
      modelId,
      params: activeParams,
      scenarioId,
      dt: typeof activeParams.dt === "number" ? activeParams.dt : undefined,
      speedMultiplier,
    });
    actions.setRunning(true);
  }, [actions, modelId, params, scenarioId, speedMultiplier]);

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
      const nextModel = models.find((item) => item.id === nextModelId);
      if (!nextModel) return;
      actions.setModel(nextModel.id, nextModel.defaults);
      form.reset(nextModel.defaults as Record<string, unknown>);
      workerRef.current?.postMessage({ type: "updateParams", params: nextModel.defaults });
    },
    [actions, form, models]
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
    form.handleSubmit((values) => {
      actions.setParams(values);
      workerRef.current?.postMessage({ type: "updateParams", params: values });
    })();
  }, [actions, form]);

  const handleDefaults = useCallback(() => {
    const currentModel = getModel(modelId);
    if (!currentModel) return;
    form.reset(currentModel.defaults as Record<string, unknown>);
    actions.setParams(currentModel.defaults);
    workerRef.current?.postMessage({ type: "updateParams", params: currentModel.defaults });
  }, [actions, form, modelId]);

  const handleSavePreset = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const defaultLabel = model?.label ?? "Preset";
    const name = window.prompt("Preset name", defaultLabel + " preset");
    if (!name) {
      return;
    }
    const payload = {
      modelId,
      scenarioId,
      params: form.getValues(),
      speedMultiplier,
    };
    try {
      const raw = window.localStorage.getItem("vehicleLab:customPresets");
      const presets = raw ? JSON.parse(raw) : [];
      presets.push({
        name,
        savedAt: new Date().toISOString(),
        payload,
      });
      const trimmed = presets.slice(-10);
      window.localStorage.setItem("vehicleLab:customPresets", JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent("vehicleLab:preset-saved", { detail: { name } }));
      setPresetBanner({ type: "success", name });
    } catch (storageError) {
      console.error("Failed to save preset", storageError);
      setPresetBanner({ type: "error" });
    }
  }, [form, model?.label, modelId, scenarioId, speedMultiplier]);


  const handleBaselineRun = useCallback(() => {
    const snapshot = form.getValues() as ModelParams;
    actions.setBaselineMetrics(null);
    actions.setBaselineStatus("running");
    startBaselineTransition(() => {
      try {
        const result = runBaseline(modelId, snapshot);
        if (!result) {
          actions.setBaselineStatus("idle");
          actions.setBaselineMetrics(null);
          return;
        }
        actions.setBaselineMetrics(result.metrics);
        actions.setBaselineStatus(result.status);
      } catch (baselineError) {
        console.error("Baseline run failed", baselineError);
        actions.setBaselineMetrics(null);
        actions.setBaselineStatus("fail");
        actions.setError(
          baselineError instanceof Error ? baselineError.message : String(baselineError)
        );
      }
    });
  }, [actions, form, modelId, startBaselineTransition]);

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

  const renderField = (field: FieldDescriptor) => {
    const errorMessage = form.formState.errors[field.name]?.message as string | undefined;

    if (field.type === "boolean") {
      return (
        <Controller
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: controllerField }) => (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(controllerField.value)}
                onChange={(event) => controllerField.onChange(event.target.checked)}
              />
              {field.label}
            </label>
          )}
        />
      );
    }

    if (field.type === "enum" && field.options) {
      return (
        <label key={field.name} className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-300">
          {field.label}
          <select
            {...form.register(field.name)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "number") {
      return (
        <label key={field.name} className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-300">
          <span>{field.label}</span>
          <input
            type="number"
            {...form.register(field.name, { valueAsNumber: true })}
            min={field.min}
            max={field.max}
            step={field.step ?? 0.01}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {errorMessage && <span className="text-xs text-red-500">{errorMessage}</span>}
        </label>
      );
    }

    return (
      <label key={field.name} className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-300">
        {field.label}
        <input
          type="text"
          {...form.register(field.name)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {errorMessage && <span className="text-xs text-red-500">{errorMessage}</span>}
      </label>
    );
  };

  const basicContent = fieldGroups.basic.map(renderField);
  const advancedContent = fieldGroups.advanced.map(renderField);

  const shareConfig = useMemo(
    () => ({ modelId, scenarioId, params: watchedValues }),
    [modelId, scenarioId, watchedValues]
  );

  useEffect(() => {
    if (!initRef.current || typeof window === "undefined") {
      return;
    }
    try {
      const snapshot = {
        modelId,
        scenarioId,
        params: form.getValues(),
        speedMultiplier,
      };
      window.localStorage.setItem("vehicleLab:sandbox", JSON.stringify(snapshot));
    } catch (storageError) {
      console.warn("Failed to persist sandbox state", storageError);
    }
  }, [form, modelId, scenarioId, speedMultiplier, watchedValues]);

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
        baselineBadge={{ status: baselinePending ? "running" : baselineStatus, onRun: handleBaselineRun }}
      />
      {error && (
        <div className="bg-red-100 px-6 py-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">
          {error}
        </div>
      )}
      {presetBanner && (
        <div
          className={
            presetBanner.type === "success"
              ? "bg-sky-50 px-6 py-2 text-xs text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
              : "bg-rose-50 px-6 py-2 text-xs text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
          }
        >
          {presetBanner.type === "success"
            ? 'Preset ' + (presetBanner.name ?? '') + ' saved to this browser'
            : 'Failed to save preset'}
        </div>
      )}

      {baselineMetricsSummary && (baselineStatus === "pass" || baselineStatus === "fail") && (
        <div
          className={
            baselineStatus === "pass"
              ? "bg-emerald-50 px-6 py-2 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-rose-50 px-6 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-200"
          }
        >
          Baseline metrics: {baselineMetricsSummary}
        </div>
      )}
      {usingFallback && (
        <div className="bg-amber-50 px-6 py-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Running on main-thread fallback. Performance may degrade.
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
          basicContent={basicContent}
          advancedContent={advancedContent}
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
