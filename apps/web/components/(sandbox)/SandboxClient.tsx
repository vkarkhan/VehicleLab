"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MathUtils } from "three";

import { CanvasWatermark } from "@/components/CanvasWatermark";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ShareButton } from "@/components/ShareButton";
import { ChartPanel } from "@/components/ChartPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SandboxState } from "@/lib/stateSchema";
import { defaultSandboxState, serializeStateToSearchParams } from "@/lib/stateSchema";
import { roundTo } from "@/lib/utils";
import { speedToMetersPerSecond } from "@/lib/physics";
import { useVehicleSimulation } from "./useVehicleSimulation";
import { ValidationPanel } from "./ValidationPanel";
import type { ValidationRunResult } from "@/lib/validation/runner";

const SandboxCanvas = dynamic(() => import("./SandboxCanvas").then((mod) => mod.SandboxCanvas), {
  ssr: false
});

const GRAVITY = 9.80665;
const DEGREE_SYMBOL = "\u00B0";

const scenarioOptions = [
  { value: "skidpad", label: "Skidpad" },
  { value: "lane-change", label: "Lane change" },
  { value: "no-steer", label: "No-steer flat" }
] as const;

const cameraOptions = [
  { value: "top", label: "Top" },
  { value: "chase", label: "Chase" },
  { value: "free", label: "Free" }
] as const;

const displayOptions = [
  {
    key: "showTrack" as const,
    label: "Track + contact patches",
    description: "Toggle the asphalt plane and wheel footprints."
  },
  {
    key: "showForceArrows" as const,
    label: "Force arrows",
    description: "Draw lateral tyre forces as arrows."
  }
];

const advancedToggles = [
  {
    key: "alignmentDebug" as const,
    label: "Alignment debug",
    description: "Visualise wheel centres and ground guides."
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
];

const radioBaseClasses =
  "flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800";
const radioActiveClasses = "data-[active=true]:border-brand-500 data-[active=true]:bg-brand-500 data-[active=true]:text-white";
const radioInactiveClasses =
  "data-[active=false]:bg-white/60 data-[active=false]:text-slate-600 dark:data-[active=false]:bg-slate-900/40 dark:data-[active=false]:text-slate-300";

interface SandboxClientProps {
  initialState: SandboxState;
  enable3D: boolean;
  isPro?: boolean;
}

export function SandboxClient({ initialState, enable3D, isPro = false }: SandboxClientProps) {
  const [state, setState] = useState<SandboxState>(initialState);
  const { samples, telemetry } = useVehicleSimulation(state);
  const vehicleSpeedMps = useMemo(() => speedToMetersPerSecond(state.speed), [state.speed]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationRunResult | null>(null);

  useEffect(() => {
    const params = serializeStateToSearchParams(state);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    const timeout = setTimeout(() => {
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
      if (typeof window !== "undefined") {
        const fullUrl = `${window.location.origin}${url}`;
        setShareUrl(fullUrl);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [pathname, router, state, startTransition]);

  useEffect(() => {
    if (shareUrl) return;
    if (typeof window !== "undefined") {
      const params = serializeStateToSearchParams(state).toString();
      const url = params ? `${window.location.origin}${pathname}?${params}` : `${window.location.origin}${pathname}`;
      setShareUrl(url);
    }
  }, [pathname, shareUrl, state]);

  const balance = useMemo(() => {
    const gradient = telemetry.understeerGradient;
    if (gradient > 0.02) {
      return { label: "Understeer", tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200" };
    }
    if (gradient < -0.02) {
      return { label: "Oversteer", tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200" };
    }
    return { label: "Neutral", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" };
  }, [telemetry.understeerGradient]);

  const slipAngles = useMemo(() => {
    const overall = Math.max(
      -90,
      Math.min(
        90,
        MathUtils.radToDeg(
          Math.atan2(telemetry.lateralVelocity, Math.max(Math.abs(telemetry.longitudinalSpeed), 0.01))
        )
      )
    );
    const front = Math.max(-90, Math.min(90, MathUtils.radToDeg(telemetry.frontSlipAngle)));
    const rear = Math.max(-90, Math.min(90, MathUtils.radToDeg(telemetry.rearSlipAngle)));
    return { overall, front, rear };
  }, [telemetry.frontSlipAngle, telemetry.lateralVelocity, telemetry.longitudinalSpeed, telemetry.rearSlipAngle]);

  const lateralUnitLabel = state.lateralUnit === "g" ? "g" : "m/s^2";
  const lateralTooltip = "Value = a/g. g = 9.81 m/s^2 (gravitational acceleration).";
  const lateralValue = roundTo(
    state.lateralUnit === "g" ? telemetry.lateralAcceleration / GRAVITY : telemetry.lateralAcceleration,
    2
  );
  const lateralFormatter = state.lateralUnit === "g" ? (value: number) => value / GRAVITY : undefined;

  const validationYawSeries = useMemo(() => {
    if (!validationResult) return null;
    const measured = validationResult.series.time.map((time, index) => ({
      time,
      value: validationResult.series.measuredYawRate[index]
    }));
    const expected = validationResult.series.time.map((time, index) => ({
      time,
      value: validationResult.series.expectedYawRate[index]
    }));
    return { measured, expected };
  }, [validationResult]);

  const validationLateralSeries = useMemo(() => {
    if (!validationResult) return null;
    const useG = state.lateralUnit === "g";
    const measuredSeries = useG
      ? validationResult.series.measuredLateralAccelG
      : validationResult.series.measuredLateralAccel;
    const expectedSeries = useG
      ? validationResult.series.expectedLateralAccelG
      : validationResult.series.expectedLateralAccel;
    const measured = validationResult.series.time.map((time, index) => ({
      time,
      value: measuredSeries[index]
    }));
    const expected = validationResult.series.time.map((time, index) => ({
      time,
      value: expectedSeries[index]
    }));
    return { measured, expected };
  }, [state.lateralUnit, validationResult]);
  const handleStateChange = (partial: Partial<SandboxState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const handleScenarioChange = (value: SandboxState["manoeuvre"]) => {
    if (value === state.manoeuvre) return;
    const next: Partial<SandboxState> = { manoeuvre: value };
    if (value === "no-steer") {
      next.steeringMode = "step";
      next.steeringAmplitude = 0;
    }
    handleStateChange(next);
  };

  const handleDisplayToggle = <K extends (typeof displayOptions)[number]["key"]>(key: K, value: SandboxState[K]) => {
    handleStateChange({ [key]: value } as Partial<SandboxState>);
  };

  const handleAdvancedToggle = <K extends typeof advancedToggles[number]["key"]>(key: K, value: SandboxState[K]) => {
    handleStateChange({ [key]: value } as Partial<SandboxState>);
  };

  const handleExportCsv = () => {
    if (!samples.length) return;
    const header = [
      "time_s",
      "lateral_accel_mps2",
      "lateral_accel_g",
      "yaw_rate_rad_s",
      "front_slip_deg",
      "rear_slip_deg"
    ];
    const rows = samples.map((sample) => {
      const lateralG = sample.lateralAcceleration / GRAVITY;
      const frontSlip = MathUtils.radToDeg(sample.frontSlipAngle);
      const rearSlip = MathUtils.radToDeg(sample.rearSlipAngle);
      return [
        sample.time.toFixed(3),
        sample.lateralAcceleration.toFixed(3),
        lateralG.toFixed(3),
        sample.yawRate.toFixed(3),
        frontSlip.toFixed(3),
        rearSlip.toFixed(3)
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehiclelab-telemetry-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `vehiclelab-snapshot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12" aria-busy={isPending}>
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              {enable3D ? (
                <SandboxCanvas
                  telemetry={telemetry}
                  showTrack={state.showTrack}
                  watermark={<CanvasWatermark visible={!isPro} />}
                  canvasRef={canvasRef}
                  wheelRadiusMeters={state.wheelRadiusMeters}
                  rideHeightMeters={state.rideHeightMeters}
                  alignmentDebug={state.alignmentDebug}
                  camberDeg={state.visualCamberDeg}
                  crownDeg={state.visualCrownDeg}
                  vehicleSpeedMps={vehicleSpeedMps}
                  frontWeightDistribution={state.weightDistributionFront}
                  cameraMode={state.cameraMode}
                  showForceArrows={state.showForceArrows}
                  showSkidMarks={state.showSkidMarks}
                  showZeroSteerBaseline={state.showZeroSteerBaseline}
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  3D sandbox is disabled in profile configuration.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Yaw rate</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{roundTo(telemetry.yawRate, 2)} rad/s</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lateral accel</p>
                  <InfoTooltip content={lateralTooltip} label="Lateral acceleration units" />
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {lateralValue} {lateralUnitLabel}
                  </p>
                  <div
                    role="group"
                    aria-label="Lateral acceleration units"
                    className="flex items-center gap-1 rounded-full bg-slate-200/70 p-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    <InfoTooltip content="g = 9.81 m/s^2 (gravitational acceleration)" label="g definition" />
                    <button
                      type="button"
                      onClick={() => {
                        if (state.lateralUnit !== "g") handleStateChange({ lateralUnit: "g" });
                      }}
                      data-active={state.lateralUnit === "g"}
                      aria-pressed={state.lateralUnit === "g"}
                      className="rounded-full px-2.5 py-1 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:shadow-sm dark:data-[active=true]:bg-slate-900 dark:data-[active=true]:text-white"
                    >
                      g
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (state.lateralUnit !== "mps2") handleStateChange({ lateralUnit: "mps2" });
                      }}
                      data-active={state.lateralUnit === "mps2"}
                      aria-pressed={state.lateralUnit === "mps2"}
                      className="rounded-full px-2.5 py-1 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:shadow-sm dark:data-[active=true]:bg-slate-900 dark:data-[active=true]:text-white"
                    >
                      m/s^2
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Balance</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${balance.tone}`}>
                  {balance.label}
                </span>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gradient: {roundTo(telemetry.understeerGradient, 3)} deg/g</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Slip angles</h3>
                  <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    {roundTo(slipAngles.overall, 1)}{DEGREE_SYMBOL}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Front</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{roundTo(slipAngles.front, 1)}{DEGREE_SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{roundTo(slipAngles.rear, 1)}{DEGREE_SYMBOL}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Front load</p>
                    <InfoTooltip
                      content={`Front utilisation ${(telemetry.frontUtilization * 100).toFixed(0)}%\nRear utilisation ${(telemetry.rearUtilization * 100).toFixed(0)}%`}
                      label="Axle utilisation"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{roundTo(telemetry.frontLoadPercent, 1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${roundTo(telemetry.frontLoadPercent, 1)}%` }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear load</p>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{roundTo(telemetry.rearLoadPercent, 1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100"
                    style={{ width: `${roundTo(telemetry.rearLoadPercent, 1)}%` }}
                  />
                </div>
              </div>
            </div>

            <ValidationPanel state={state} onResult={(result) => setValidationResult(result)} />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Telemetry charts</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!samples.length}>
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPng} disabled={!samples.length}>
                    Export PNG
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartPanel
                  samples={samples}
                  dataKey="lateralAcceleration"
                  title="Lateral acceleration"
                  unit={lateralUnitLabel}
                  formatter={lateralFormatter}
                  info={state.lateralUnit === "g" ? lateralTooltip : undefined}
                  overrideSeries={validationLateralSeries?.measured}
                  expectedSeries={validationLateralSeries?.expected}
                  measuredLabel={validationResult ? "Measured (validation)" : "Measured"}
                />
                <ChartPanel
                  samples={samples}
                  dataKey="yawRate"
                  title="Yaw rate"
                  unit="rad/s"
                  overrideSeries={validationYawSeries?.measured}
                  expectedSeries={validationYawSeries?.expected}
                  measuredLabel={validationResult ? "Measured (validation)" : "Measured"}
                />
              </div>
            </div>
          </div>
        </div>
        <aside className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scenario</h3>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {scenarioOptions.map((option) => {
                const isActive = state.manoeuvre === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    data-active={isActive}
                    className={`${radioBaseClasses} ${radioActiveClasses} ${radioInactiveClasses}`}
                    onClick={() => handleScenarioChange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <Label htmlFor="sandbox-speed">Speed (km/h)</Label>
            <div className="flex items-center gap-3">
              <Slider
                id="sandbox-speed"
                value={[state.speed]}
                min={0}
                max={240}
                step={1}
                onValueChange={([value]) => handleStateChange({ speed: value })}
              />
              <Input
                type="number"
                min={0}
                max={240}
                value={roundTo(state.speed, 0)}
                onChange={(event) => handleStateChange({ speed: Number(event.target.value) })}
                className="w-24"
              />
            </div>
          </section>

          {state.manoeuvre === "skidpad" ? (
            <section className="space-y-3">
              <Label htmlFor="sandbox-radius">Radius (m)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  id="sandbox-radius"
                  value={[state.skidpadRadius]}
                  min={10}
                  max={120}
                  step={1}
                  onValueChange={([value]) => handleStateChange({ skidpadRadius: value })}
                />
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={roundTo(state.skidpadRadius, 0)}
                  onChange={(event) => handleStateChange({ skidpadRadius: Number(event.target.value) })}
                  className="w-24"
                />
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <Label htmlFor="sandbox-duration">Duration (s)</Label>
            <div className="flex items-center gap-3">
              <Slider
                id="sandbox-duration"
                value={[state.duration]}
                min={2}
                max={20}
                step={0.5}
                onValueChange={([value]) => handleStateChange({ duration: value })}
              />
              <Input
                type="number"
                min={2}
                max={20}
                step={0.5}
                value={roundTo(state.duration, 1)}
                onChange={(event) => handleStateChange({ duration: Number(event.target.value) })}
                className="w-24"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Camera</h3>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {cameraOptions.map((option) => {
                const isActive = state.cameraMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    data-active={isActive}
                    className={`${radioBaseClasses} ${radioActiveClasses} ${radioInactiveClasses} text-center`}
                    onClick={() => handleStateChange({ cameraMode: option.value })}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <details className="space-y-3 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Display overlays</summary>
            <div className="mt-3 space-y-3">
              {displayOptions.map((item) => {
                const checked = state[item.key];
                return (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <Switch checked={checked} onCheckedChange={(value) => handleDisplayToggle(item.key, value)} />
                  </div>
                );
              })}
            </div>
          </details>

          <details className="space-y-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Advanced</summary>
            <div className="mt-3 space-y-5">
              <div className="space-y-3">
                <Label htmlFor="sandbox-mass">Mass (kg)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-mass"
                    value={[state.mass]}
                    min={600}
                    max={2200}
                    step={10}
                    onValueChange={([value]) => handleStateChange({ mass: value })}
                  />
                  <Input
                    type="number"
                    min={600}
                    max={2200}
                    value={roundTo(state.mass, 0)}
                    onChange={(event) => handleStateChange({ mass: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-cg">Centre of gravity height (m)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-cg"
                    value={[state.cgHeight]}
                    min={0.3}
                    max={0.9}
                    step={0.01}
                    onValueChange={([value]) => handleStateChange({ cgHeight: Number(value.toFixed(2)) })}
                  />
                  <Input
                    type="number"
                    min={0.3}
                    max={0.9}
                    step={0.01}
                    value={roundTo(state.cgHeight, 2)}
                    onChange={(event) => handleStateChange({ cgHeight: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-weight">Front weight distribution (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-weight"
                    value={[state.weightDistributionFront * 100]}
                    min={35}
                    max={65}
                    step={1}
                    onValueChange={([value]) => handleStateChange({ weightDistributionFront: value / 100 })}
                  />
                  <Input
                    type="number"
                    min={35}
                    max={65}
                    value={roundTo(state.weightDistributionFront * 100, 0)}
                    onChange={(event) => handleStateChange({ weightDistributionFront: Number(event.target.value) / 100 })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-tyre">Tyre grip (mu)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-tyre"
                    value={[state.tyreGrip]}
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    onValueChange={([value]) => handleStateChange({ tyreGrip: Number(value.toFixed(2)) })}
                  />
                  <Input
                    type="number"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={roundTo(state.tyreGrip, 2)}
                    onChange={(event) => handleStateChange({ tyreGrip: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-amplitude">Steering amplitude (deg)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-amplitude"
                    value={[state.steeringAmplitude]}
                    min={0}
                    max={20}
                    step={0.5}
                    onValueChange={([value]) => handleStateChange({ steeringAmplitude: value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={roundTo(state.steeringAmplitude, 1)}
                    onChange={(event) => handleStateChange({ steeringAmplitude: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-frequency">Sine frequency (Hz)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-frequency"
                    value={[state.sineFrequency]}
                    min={0}
                    max={2}
                    step={0.05}
                    onValueChange={([value]) => handleStateChange({ sineFrequency: Number(value.toFixed(2)) })}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.05}
                    value={roundTo(state.sineFrequency, 2)}
                    onChange={(event) => handleStateChange({ sineFrequency: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-ride">Ride height (m)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-ride"
                    value={[state.rideHeightMeters]}
                    min={0}
                    max={0.4}
                    step={0.01}
                    onValueChange={([value]) => handleStateChange({ rideHeightMeters: Number(value.toFixed(2)) })}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={0.4}
                    step={0.01}
                    value={roundTo(state.rideHeightMeters, 2)}
                    onChange={(event) => handleStateChange({ rideHeightMeters: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sandbox-wheel">Wheel radius (m)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="sandbox-wheel"
                    value={[state.wheelRadiusMeters]}
                    min={0.25}
                    max={0.45}
                    step={0.005}
                    onValueChange={([value]) => handleStateChange({ wheelRadiusMeters: Number(value.toFixed(3)) })}
                  />
                  <Input
                    type="number"
                    min={0.25}
                    max={0.45}
                    step={0.005}
                    value={roundTo(state.wheelRadiusMeters, 3)}
                    onChange={(event) => handleStateChange({ wheelRadiusMeters: Number(event.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sandbox-camber">Visual camber (deg)</Label>
                  <Input
                    id="sandbox-camber"
                    type="number"
                    min={-5}
                    max={5}
                    step={0.1}
                    value={roundTo(state.visualCamberDeg, 1)}
                    onChange={(event) => handleStateChange({ visualCamberDeg: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sandbox-crown">Road crown (deg)</Label>
                  <Input
                    id="sandbox-crown"
                    type="number"
                    min={-3}
                    max={3}
                    step={0.1}
                    value={roundTo(state.visualCrownDeg, 1)}
                    onChange={(event) => handleStateChange({ visualCrownDeg: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {advancedToggles.map((item) => {
                  const checked = state[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      </div>
                      <Switch checked={checked} onCheckedChange={(value) => handleAdvancedToggle(item.key, value)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <ShareButton url={shareUrl || ""} />
            <Button variant="ghost" size="sm" onClick={() => setState(defaultSandboxState)}>
              Reset
            </Button>
            <Link
              href="/guides"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"
            >
              Guides
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

