"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { describeSchema, type FieldDescriptor } from "@/lib/forms/schema";

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

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    form.reset(params as Record<string, unknown>);
  }, [form, params, modelId]);

  useEffect(() => {
    if (initRef.current || models.length === 0 || scenarios.length === 0) {
      return;
    }

    const applyPreset = (payload: { modelId?: string; scenarioId?: string; params?: ModelParams }) => {
      const presetModel = models.find((item) => item.id === payload.modelId) ?? models[0];
      const mergedParams = { ...presetModel.defaults, ...(payload.params ?? {}) };
      const presetScenario = scenarios.find((item) => item.id === payload.scenarioId) ?? scenarios[0];

      actions.setModel(presetModel.id, mergedParams);
      actions.setScenario(presetScenario.id);
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

    applyPreset({
      modelId: models[0]?.id,
      scenarioId: scenarios[0]?.id,
      params: models[0]?.defaults,
    });
    initRef.current = true;
  }, [actions, form, models, presetParam, scenarios]);

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
    console.info("TODO: preset save", form.getValues());
  }, [form]);

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
