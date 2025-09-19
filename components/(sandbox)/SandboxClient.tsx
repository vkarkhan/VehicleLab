"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CanvasWatermark } from "@/components/CanvasWatermark";
import { ControlPanel } from "@/components/ControlPanel";
import { ShareButton } from "@/components/ShareButton";
import { ChartPanel } from "@/components/ChartPanel";
import { Button } from "@/components/ui/button";
import type { SandboxState } from "@/lib/stateSchema";
import { defaultSandboxState, serializeStateToSearchParams } from "@/lib/stateSchema";
import { roundTo } from "@/lib/utils";

import { useVehicleSimulation } from "./useVehicleSimulation";

const SandboxCanvas = dynamic(() => import("./SandboxCanvas").then((mod) => mod.SandboxCanvas), {
  ssr: false
});

interface SandboxClientProps {
  initialState: SandboxState;
  enable3D: boolean;
  isPro?: boolean;
}

export function SandboxClient({ initialState, enable3D, isPro = false }: SandboxClientProps) {
  const [state, setState] = useState<SandboxState>(initialState);
  const { samples, telemetry } = useVehicleSimulation(state);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string>("");

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
  }, [pathname, router, state]);

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

  const slipAngles = useMemo(() => ({
    front: roundTo((telemetry.frontSlipAngle * 180) / Math.PI, 2),
    rear: roundTo((telemetry.rearSlipAngle * 180) / Math.PI, 2)
  }), [telemetry.frontSlipAngle, telemetry.rearSlipAngle]);

  const handleStateChange = (partial: Partial<SandboxState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const handleExportCsv = () => {
    if (!samples.length) return;
    const header = ["time_s", "lateral_accel_mps2", "lateral_accel_g", "yaw_rate_rad_s", "front_slip_deg", "rear_slip_deg"];
    const rows = samples.map((sample) => {
      const lateralG = sample.lateralAcceleration / 9.81;
      const frontSlip = (sample.frontSlipAngle * 180) / Math.PI;
      const rearSlip = (sample.rearSlipAngle * 180) / Math.PI;
      return [sample.time.toFixed(3), sample.lateralAcceleration.toFixed(3), lateralG.toFixed(3), sample.yawRate.toFixed(3), frontSlip.toFixed(3), rearSlip.toFixed(3)].join(",");
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
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `vehiclelab-snapshot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
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
          <div>
            {enable3D ? (
              <SandboxCanvas
                telemetry={telemetry}
                watermark={<CanvasWatermark visible={!isPro} />}
                containerRef={canvasContainerRef}
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                3D sandbox is disabled in profile configuration.
              </div>
            )}
            <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Yaw rate</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{roundTo(telemetry.yawRate, 2)} rad/s</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lateral accel</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{roundTo(telemetry.lateralAcceleration / 9.81, 2)} g</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Balance</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${balance.tone}`}>
                  {balance.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Slip angles</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">F</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">R</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Front</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{slipAngles.front}°</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-inner dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{slipAngles.rear}°</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Front load</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${telemetry.frontLoadPercent}%` }} />
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{telemetry.frontLoadPercent}%</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rear load</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${telemetry.rearLoadPercent}%` }} />
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{telemetry.rearLoadPercent}%</p>
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
          <ChartPanel samples={samples} dataKey="lateralAcceleration" title="Lateral acceleration" unit="g" formatter={(value) => value / 9.81} />
          <ChartPanel samples={samples} dataKey="yawRate" title="Yaw rate" unit="rad/s" />
        </div>
      </div>
    </div>
  );
}
