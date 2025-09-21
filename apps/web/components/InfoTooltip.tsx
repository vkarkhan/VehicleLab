"use client";

import { Info } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  label?: string;
  className?: string;
}

export function InfoTooltip({ content, label = "More information", className }: InfoTooltipProps) {
  const tooltipId = useId();

  return (
    <span className={cn("group relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label={label}
        title={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-white"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className="pointer-events-none absolute left-1/2 top-full z-20 w-64 -translate-x-1/2 translate-y-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-slate-900/20 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-slate-700 dark:ring-slate-700/60"
      >
        {content}
      </span>
    </span>
  );
}
