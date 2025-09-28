"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { useSimStore } from "@/lib/store/simStore";
import type { Telemetry } from "@/lib/sim/core";

const buildSeries = (samples: readonly Telemetry[], key: keyof Telemetry) =>
  samples
    .map((sample) => {
      const value = sample[key];
      if (typeof value !== "number") {
        return null;
      }
      return {
        t: sample.t ?? 0,
        value,
      };
    })
    .filter((entry): entry is { t: number; value: number } => entry !== null);

type PlotProps = {
  title: string;
  unit: string;
  data: { t: number; value: number }[];
  color?: string;
};

const PlotCard = ({ title, unit, data, color = "#2563eb" }: PlotProps) => (
  <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {title} ({unit})
    </h4>
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#94a3b8" domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          labelFormatter={(value) => "t = " + Number(value).toFixed(2) + " s"}
          formatter={(value: number) => [value.toFixed(3), title]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const BUFFERED_SAMPLE_COUNT = 600;

export const BottomPlots = () => {
  const samples = useSimStore((state) => state.telemetry.samples);
  const [collapsed, setCollapsed] = useState(false);

  const trimmed = useMemo(() => samples.slice(-BUFFERED_SAMPLE_COUNT), [samples]);

  const yawRateSeries = useMemo(() => buildSeries(trimmed, "r"), [trimmed]);
  const aySeries = useMemo(() => buildSeries(trimmed, "ay"), [trimmed]);
  const betaSeries = useMemo(() => buildSeries(trimmed, "beta"), [trimmed]);

  return (
    <div
      className={cn(
        "border-t border-slate-200 bg-white/90 backdrop-blur transition-[max-height] duration-200 dark:border-slate-800 dark:bg-slate-950/90",
        collapsed ? "max-h-12" : "max-h-96"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          Mini plots {collapsed ? "(show)" : "(hide)"}
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500" data-test="telemetry-sample-count">{trimmed.length} samples</span>
      </div>
      {!collapsed && (
        <div className="grid gap-4 px-4 pb-4 md:grid-cols-3">
          <PlotCard title="Yaw rate" unit="rad/s" data={yawRateSeries} />
          <PlotCard title="Lateral accel" unit="m/s^2" data={aySeries} color="#7c3aed" />
          <PlotCard title="Sideslip" unit="rad" data={betaSeries} color="#16a34a" />
        </div>
      )}
    </div>
  );
};
