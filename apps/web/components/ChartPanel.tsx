"use client";

import { useMemo } from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { InfoTooltip } from "@/components/InfoTooltip";
import type { SimulationSample } from "@/lib/physics";

interface OverlayPoint {
  time: number;
  value: number;
}

interface ChartPanelProps {
  samples: SimulationSample[];
  dataKey: keyof Pick<SimulationSample, "lateralAcceleration" | "yawRate">;
  title: string;
  unit: string;
  formatter?: (value: number) => number;
  info?: string;
  overrideSeries?: OverlayPoint[];
  expectedSeries?: OverlayPoint[];
  measuredLabel?: string;
  expectedLabel?: string;
}

export function ChartPanel({
  samples,
  dataKey,
  title,
  unit,
  formatter,
  info,
  overrideSeries,
  expectedSeries,
  measuredLabel = "Measured",
  expectedLabel = "Expected"
}: ChartPanelProps) {
  const baseSeries = useMemo(() => {
    if (overrideSeries && overrideSeries.length) {
      return overrideSeries.map((point) => ({
        time: Number(point.time.toFixed(3)),
        value: point.value
      }));
    }

    return samples
      .map((sample) => ({
        time: Number(sample.time.toFixed(3)),
        value: formatter ? formatter(sample[dataKey]) : sample[dataKey]
      }))
      .sort((a, b) => a.time - b.time);
  }, [overrideSeries, samples, dataKey, formatter]);

  const expected = useMemo(() => {
    if (!expectedSeries || !expectedSeries.length) return null;
    return expectedSeries.map((point) => ({
      time: Number(point.time.toFixed(3)),
      value: point.value
    }));
  }, [expectedSeries]);

  const chartData = useMemo(() => {
    if (!baseSeries.length) return [] as Array<{ time: number; measured: number; expected?: number }>;

    return baseSeries.map((point, index) => {
      const row: { time: number; measured: number; expected?: number } = {
        time: point.time,
        measured: point.value
      };

      if (expected && expected[index]) {
        row.expected = expected[index].value;
      }

      return row;
    });
  }, [baseSeries, expected]);

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
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.4} />
            <XAxis
              dataKey="time"
              type="number"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: "Time (s)", position: "insideBottomRight", offset: -6, fill: "#94a3b8", fontSize: 11 }}
            />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip
              formatter={(value: number, name: string) => [Number(value).toFixed(3), name]}
              labelFormatter={(value) => `${Number(value).toFixed(2)} s`}
            />
            {(expected && expected.length) ? (
              <Legend
                verticalAlign="top"
                height={24}
                wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                formatter={(value: string) => value}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="measured"
              name={measuredLabel}
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {expected && expected.length ? (
              <Line
                type="monotone"
                dataKey="expected"
                name={expectedLabel}
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
