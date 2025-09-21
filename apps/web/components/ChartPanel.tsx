"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { InfoTooltip } from "@/components/InfoTooltip";
import type { SimulationSample } from "@/lib/physics";

interface ChartPanelProps {
  samples: SimulationSample[];
  dataKey: keyof Pick<SimulationSample, "lateralAcceleration" | "yawRate">;
  title: string;
  unit: string;
  formatter?: (value: number) => number;
  info?: string;
}

export function ChartPanel({ samples, dataKey, title, unit, formatter, info }: ChartPanelProps) {
  const data = samples.map((sample) => ({
    time: sample.time,
    value: formatter ? formatter(sample[dataKey]) : sample[dataKey]
  }));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
          {info ? <InfoTooltip content={info} label={`${title} info`} /> : null}
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
            <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
