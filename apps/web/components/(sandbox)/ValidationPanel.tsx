"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SandboxState } from "@/lib/stateSchema";
import {
  defaultValidationParams,
  validationCases,
  type ValidationCaseDefinition,
  type ValidationCaseId,
  type ValidationParams
} from "@/lib/validation/cases";
import { runValidation, type ValidationRunResult } from "@/lib/validation/runner";

interface ValidationPanelProps {
  state: SandboxState;
  onResult: (result: ValidationRunResult) => void;
  initialCaseId?: ValidationCaseId;
}

interface ValidationFieldState {
  value: number;
  field: ValidationCaseDefinition["fields"][number];
}

const gravityNote = "Sampling after 1 s settle. RMSE and mean error computed against expected profile.";

export function ValidationPanel({ state, onResult, initialCaseId = "no-steer-flat" }: ValidationPanelProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<ValidationCaseId>(initialCaseId);
  const [fields, setFields] = useState<Record<string, ValidationFieldState>>(() => {
    const definition = validationCases[initialCaseId];
    const defaults = defaultValidationParams[initialCaseId];
    return definition.fields.reduce<Record<string, ValidationFieldState>>((acc, field) => {
      const key = field.key;
      const defaultValue = defaults[key as keyof ValidationParams] ?? field.defaultValue;
      acc[key] = {
        value: defaultValue ?? field.defaultValue,
        field
      };
      return acc;
    }, {});
  });
  const [lastResult, setLastResult] = useState<ValidationRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = validationCases[selectedCaseId];

  useEffect(() => {
    const nextDefinition = validationCases[selectedCaseId];
    const defaults = defaultValidationParams[selectedCaseId];
    const nextFields = nextDefinition.fields.reduce<Record<string, ValidationFieldState>>((acc, field) => {
      const key = field.key;
      const defaultValue = defaults[key as keyof ValidationParams] ?? field.defaultValue;
      acc[key] = {
        value: defaultValue ?? field.defaultValue,
        field
      };
      return acc;
    }, {});
    setFields(nextFields);
  }, [selectedCaseId]);

  const params: ValidationParams = useMemo(() => {
    const base: ValidationParams = { ...defaultValidationParams[selectedCaseId] };
    definition.fields.forEach((field) => {
      const stateEntry = fields[field.key];
      base[field.key] = stateEntry ? stateEntry.value : field.defaultValue;
    });
    return base;
  }, [definition.fields, fields, selectedCaseId]);

  const handleRun = () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      const result = runValidation(selectedCaseId, { state, params });
      setLastResult(result);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run validation");
    } finally {
      setIsRunning(false);
    }
  };

  const metrics = lastResult?.metrics;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Validation</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Run canonical manoeuvres and overlay expected traces on the charts.
          </p>
        </div>
        <Link
          href="/guides/vehicle-model"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
        >
          Model guide -&gt;
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <Label htmlFor="validation-case">Test case</Label>
          <select
            id="validation-case"
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value as ValidationCaseId)}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          >
            {Object.values(validationCases).map((testCase) => (
              <option key={testCase.id} value={testCase.id}>
                {testCase.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">{definition.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {definition.fields.map((field) => {
            const stateEntry = fields[field.key];
            const value = stateEntry?.value ?? field.defaultValue;
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`validation-${field.key}`} className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {field.label} <span className="text-xs text-slate-500 dark:text-slate-400">({field.unit})</span>
                </Label>
                <Input
                  id={`validation-${field.key}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={value}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    setFields((prev) => ({
                      ...prev,
                      [field.key]: {
                        value: Number.isFinite(parsed) ? parsed : field.defaultValue,
                        field
                      }
                    }));
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <InfoTooltip content={gravityNote} label="Validation sampling" />
          <span>Sampling at {definition.sampleRate} Hz after 1 s settle</span>
        </div>
        <Button onClick={handleRun} disabled={isRunning}>
          {isRunning ? "Running validation..." : "Run validation"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {metrics ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 text-sm dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Metric</th>
                <th className="px-4 py-3 text-left">RMSE</th>
                <th className="px-4 py-3 text-left">Mean error</th>
                <th className="px-4 py-3 text-left">Tolerance</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {([
                {
                  key: "yawRate" as const,
                  label: "Yaw rate (rad/s)",
                  metric: metrics.yawRate
                },
                {
                  key: "lateralAccelG" as const,
                  label: "Lateral accel (g)",
                  metric: metrics.lateralAccelG
                }
              ] as const).map((row) => (
                <tr key={row.key} className="bg-white/70 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">{row.metric.rmse.toFixed(3)}</td>
                  <td className="px-4 py-3">{row.metric.meanError.toFixed(3)}</td>
                  <td className="px-4 py-3">+/-{row.metric.tolerance.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        row.metric.pass
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                      }`}
                    >
                      {row.metric.pass ? "Pass" : "Fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lastResult ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Overlay applied with {lastResult.series.time.length} samples over {lastResult.params.duration.toFixed(1)} s.
        </p>
      ) : null}
    </section>
  );
}

