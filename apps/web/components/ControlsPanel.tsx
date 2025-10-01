"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SandboxState } from "@/lib/stateSchema";

interface ControlsPanelProps {
  manoeuvre: SandboxState["manoeuvre"];
  skidpadRadius: SandboxState["skidpadRadius"];
  duration: SandboxState["duration"];
  cameraMode: SandboxState["cameraMode"];
  showTrack: SandboxState["showTrack"];
  alignmentDebug: SandboxState["alignmentDebug"];
  showForceArrows: SandboxState["showForceArrows"];
  showSkidMarks: SandboxState["showSkidMarks"];
  showZeroSteerBaseline: SandboxState["showZeroSteerBaseline"];
  onScenarioChange: (manoeuvre: SandboxState["manoeuvre"]) => void;
  onSkidpadRadiusChange: (radius: SandboxState["skidpadRadius"]) => void;
  onDurationChange: (duration: SandboxState["duration"]) => void;
  onCameraModeChange: (mode: SandboxState["cameraMode"]) => void;
  onDisplayToggle: <K extends "showTrack" | "alignmentDebug" | "showForceArrows" | "showSkidMarks" | "showZeroSteerBaseline">(
    key: K,
    value: SandboxState[K]
  ) => void;
}

const radioBaseClasses = "flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800";
const radioActiveClasses = "data-[active=true]:border-brand-500 data-[active=true]:bg-brand-500 data-[active=true]:text-white";
const radioInactiveClasses = "data-[active=false]:bg-white/60 data-[active=false]:text-slate-600 dark:data-[active=false]:bg-slate-900/40 dark:data-[active=false]:text-slate-300";

export function ControlsPanel({
  manoeuvre,
  skidpadRadius,
  duration,
  cameraMode,
  showTrack,
  alignmentDebug,
  showForceArrows,
  showSkidMarks,
  showZeroSteerBaseline,
  onScenarioChange,
  onSkidpadRadiusChange,
  onDurationChange,
  onCameraModeChange,
  onDisplayToggle
}: ControlsPanelProps) {
  const baseId = useId();

  return (
    <aside className="w-full max-w-sm space-y-6 rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
      <section aria-labelledby={`${baseId}-scenario`} className="space-y-4">
        <div>
          <h3 id={`${baseId}-scenario`} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Scenario
          </h3>
        </div>
        <div role="radiogroup" aria-labelledby={`${baseId}-scenario`} className="flex gap-2">
          {([
            { value: "skidpad", label: "Skidpad", hint: "Constant-radius steering input for load transfer studies" },
            { value: "lane-change", label: "Lane change", hint: "ISO double lane-change steering profile over the window" }
          ] as const).map((option) => {
            const isActive = manoeuvre === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-active={isActive}
                title={option.hint}
                className={`${radioBaseClasses} ${radioActiveClasses} ${radioInactiveClasses}`}
                onClick={() => {
                  if (!isActive) onScenarioChange(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {manoeuvre === "skidpad" ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <Label htmlFor={`${baseId}-skidpad-radius`} className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Skidpad radius (m)
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                id={`${baseId}-skidpad-radius`}
                value={[skidpadRadius]}
                min={10}
                max={60}
                step={1}
                onValueChange={([value]) => onSkidpadRadiusChange(value)}
              />
              <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{Math.round(skidpadRadius)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
            <p>A pre-programmed double lane-change steering trace is applied across the window below.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keep the window short for an FIA-style test or lengthen to study recovery.
            </p>
          </div>
        )}
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <Label htmlFor={`${baseId}-window`} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Simulation window (s)
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              id={`${baseId}-window`}
              value={[duration]}
              min={4}
              max={20}
              step={1}
              onValueChange={([value]) => onDurationChange(value)}
            />
            <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{Math.round(duration)}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby={`${baseId}-camera`} className="space-y-4">
        <h3 id={`${baseId}-camera`} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Camera
        </h3>
        <div role="radiogroup" aria-labelledby={`${baseId}-camera`} className="grid grid-cols-3 gap-2">
          {([
            { value: "top", label: "Top" },
            { value: "chase", label: "Chase" },
            { value: "free", label: "Free" }
          ] as const).map((option) => {
            const isActive = cameraMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-active={isActive}
                className={`${radioBaseClasses} ${radioActiveClasses} ${radioInactiveClasses} text-center`}
                onClick={() => {
                  if (!isActive) onCameraModeChange(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Chase locks to body yaw with a soft follow. Top frames the asphalt. Free keeps orbit controls enabled.
        </p>
      </section>

      <section aria-labelledby={`${baseId}-display`} className="space-y-4">
        <h3 id={`${baseId}-display`} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Display
        </h3>
        <div className="space-y-3">
          {([
            {
              key: "showTrack" as const,
              label: "Show track and contact patches",
              description: "Toggle the asphalt plane and wheel footprints."
            },
            {
              key: "alignmentDebug" as const,
              label: "Alignment debug",
              description: "Reveal wheel centres and ground guides."
            },
            {
              key: "showForceArrows" as const,
              label: "Force arrows",
              description: "Draw lateral force vectors at each tyre."
            },
            {
              key: "showSkidMarks" as const,
              label: "Skid marks",
              description: "Leave fading tyre trails proportional to slip."
            },
            {
              key: "showZeroSteerBaseline" as const,
              label: "Zero-steer baseline",
              description: "Overlay the straight-ahead trajectory for comparison."
            }
          ]).map((item) => {
            const checked =
              item.key === "showTrack"
                ? showTrack
                : item.key === "alignmentDebug"
                  ? alignmentDebug
                  : item.key === "showForceArrows"
                    ? showForceArrows
                    : item.key === "showSkidMarks"
                      ? showSkidMarks
                      : showZeroSteerBaseline;
            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(value) => onDisplayToggle(item.key, value)}
                  aria-label={item.label}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Units info" className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        Lateral acceleration shows a/g. 1 g = 9.81 m/s^2.
      </section>
    </aside>
  );
}


