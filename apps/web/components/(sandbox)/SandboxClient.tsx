"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MathUtils } from "three";

import { CanvasWatermark } from "@/components/CanvasWatermark";
import { ControlPanel } from "@/components/ControlPanel";
import { ControlsPanel } from "@/components/ControlsPanel";
import { InfoTooltip } from "@/components/InfoTooltip";
import { NoSteerTestCard } from "@/components/(sandbox)/NoSteerTestCard";
import { ShareButton } from "@/components/ShareButton";
import { ChartPanel } from "@/components/ChartPanel";
import { Button } from "@/components/ui/button";
import type { SandboxState } from "@/lib/stateSchema";
import { defaultSandboxState, serializeStateToSearchParams } from "@/lib/stateSchema";
import { runNoSteerTest, type NoSteerTestResult } from "@/lib/noSteerTest";
import { roundTo } from "@/lib/utils";
import { speedToMetersPerSecond } from "@/lib/physics";

import { useVehicleSimulation } from "./useVehicleSimulation";

const SandboxCanvas = dynamic(() => import("./SandboxCanvas").then((mod) => mod.SandboxCanvas), {
  ssr: false
});

const GRAVITY = 9.80665;
const DEGREE_SYMBOL = "\u00B0";

interface SandboxClientProps {
  initialState: SandboxState;
  enable3D: boolean;
  isPro?: boolean;
}

function clampSlipDeg(value: number) {
  return Math.max(-90, Math.min(90, value));
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
  const [noSteerResult, setNoSteerResult] = useState<NoSteerTestResult | null>(null);
  const [noSteerLastRunAt, setNoSteerLastRunAt] = useState<number | null>(null);
  const [isNoSteerRunning, setIsNoSteerRunning] = useState(false);

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
    if (gradient > 0.02) return { label: "Understeer", tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200" };
    if (gradient < -0.02) return { label: "Oversteer", tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200" };
    return { label: "Neutral", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" };
  }, [telemetry.understeerGradient]);

  const slipAngles = useMemo(() => {
    const overall = clampSlipDeg(
      MathUtils.radToDeg(
        Math.atan2(telemetry.lateralVelocity, Math.max(Math.abs(telemetry.longitudinalSpeed), 0.01))
      )
    );
    const front = clampSlipDeg(MathUtils.radToDeg(telemetry.frontSlipAngle));
    const rear = clampSlipDeg(MathUtils.radToDeg(telemetry.rearSlipAngle));
    return { overall, front, rear };
  }, [telemetry.frontSlipAngle, telemetry.lateralVelocity, telemetry.longitudinalSpeed, telemetry.rearSlipAngle]);

  const stateSignature = useMemo(() => JSON.stringify(state), [state]);
  const lastResultSignatureRef = useRef<string | null>(null);
  const lateralUnitLabel = state.lateralUnit === "g" ? "g" : "m/s^2";
  const lateralValue = roundTo(
    state.lateralUnit === "g" ? telemetry.lateralAcceleration / GRAVITY : telemetry.lateralAcceleration,
    2
  );
  const lateralTooltip = "Value = a/g. 1 g = 9.81 m/s^2";
  const lateralFormatter = state.lateralUnit === "g" ? (value: number) => value / GRAVITY : undefined;

  useEffect(() => {
    if (isNoSteerRunning) return;
    if (lastResultSignatureRef.current && lastResultSignatureRef.current !== stateSignature) {
      setNoSteerResult(null);
      setNoSteerLastRunAt(null);
      lastResultSignatureRef.current = null;
    }
  }, [stateSignature, isNoSteerRunning]);

  const handleStateChange = (partial: Partial<SandboxState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const handleDisplayToggle = <K extends "showTrack" | "alignmentDebug" | "showForceArrows" | "showSkidMarks" | "showZeroSteerBaseline">(
    key: K,
    value: SandboxState[K]
  ) => {
    handleStateChange({ [key]: value } as Partial<SandboxState>);
  };

  const handleRunNoSteerTest = () => {
    if (isNoSteerRunning) return;
    setIsNoSteerRunning(true);
    const snapshot = { ...state };
    const signatureSnapshot = stateSignature;
    requestAnimationFrame(() => {
      const result = runNoSteerTest(snapshot);
      setNoSteerResult(result);
      setNoSteerLastRunAt(Date.now());
      lastResultSignatureRef.current = signatureSnapshot;
      setIsNoSteerRunning(false);
    });
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

  const loadTooltip = `Front utilisation ${(telemetry.frontUtilization * 100).toFixed(0)}%\nRear utilisation ${(telemetry.rearUtilization * 100).toFixed(0)}%`;
  const slipTooltip = "Slip angle = atan2(vy, |vx|). Positive = left.";

  return (
    <div className="space-y-12" aria-busy={isPending}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,360px)_1fr]">
        <div>
          <ControlPanel state={state} onChange={handleStateChange} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton url={shareUrl || ""} />
            <Button variant="ghost" size="sm" onClick={() => setState(defaultSandboxState)}>
              Reset
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div className="flex-1 space-y-4">
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
                <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  3D sandbox is disabled in profile configuration.
                </div>
              )}
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
            </div>
            <div className="xl:w-[320px] xl:flex-shrink-0">
              <ControlsPanel
                manoeuvre={state.manoeuvre}
                skidpadRadius={state.skidpadRadius}
                duration={state.duration}
                cameraMode={state.cameraMode}
                showTrack={state.showTrack}
                alignmentDebug={state.alignmentDebug}
                showForceArrows={state.showForceArrows}
                showSkidMarks={state.showSkidMarks}
                showZeroSteerBaseline={state.showZeroSteerBaseline}
                onScenarioChange={(value) => handleStateChange({ manoeuvre: value })}
                onSkidpadRadiusChange={(value) => handleStateChange({ skidpadRadius: value })}
                onDurationChange={(value) => handleStateChange({ duration: value })}
                onCameraModeChange={(mode) => handleStateChange({ cameraMode: mode })}
                onDisplayToggle={handleDisplayToggle}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">No-steer stability</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunNoSteerTest}
                disabled={isNoSteerRunning}
              >
                {isNoSteerRunning ? "Running no-steer test..." : "Run No-steer (delta = 0) test"}
              </Button>
            </div>
            <NoSteerTestCard
              result={noSteerResult}
              lateralUnit={state.lateralUnit}
              isRunning={isNoSteerRunning}
              lastRunAt={noSteerLastRunAt}
            />
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Slip angles</h3>
                <InfoTooltip content={slipTooltip} label="Slip angle info" />
              </div>
              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {slipAngles.overall}{DEGREE_SYMBOL}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Front</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{slipAngles.front}{DEGREE_SYMBOL}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{slipAngles.rear}{DEGREE_SYMBOL}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Front load</p>
                  <InfoTooltip content={loadTooltip} label="Axle utilisation" />
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${roundTo(telemetry.frontLoadPercent, 1)}%` }} />
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{roundTo(telemetry.frontLoadPercent, 1)}%</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear load</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${roundTo(telemetry.rearLoadPercent, 1)}%` }} />
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{roundTo(telemetry.rearLoadPercent, 1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          />
          <ChartPanel samples={samples} dataKey="yawRate" title="Yaw rate" unit="rad/s" />
        </div>
      </div>
    </div>
  );
}








