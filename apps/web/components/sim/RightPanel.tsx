"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ShareConfig } from "./ShareLink";
import { ShareLink } from "./ShareLink";

type RightPanelProps = {
  collapsed: boolean;
  onToggle: () => void;
  basicContent: ReactNode;
  advancedContent: ReactNode;
  onApply: () => void;
  onDefaults: () => void;
  onSavePreset?: () => void;
  shareConfig: ShareConfig;
};

export const RightPanel = ({
  collapsed,
  onToggle,
  basicContent,
  advancedContent,
  onApply,
  onDefaults,
  onSavePreset,
  shareConfig,
}: RightPanelProps) => {
  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-l border-slate-200 bg-white/90 transition-all dark:border-slate-800 dark:bg-slate-950/90",
        collapsed ? "w-12" : "w-80"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex h-12 items-center justify-center border-b border-slate-200 text-slate-500 transition-colors hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        aria-label={collapsed ? "Expand parameters" : "Collapse parameters"}
      >
        {collapsed ? ">" : "<"}
      </button>
      {!collapsed && (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Basic
            </h3>
            <div className="space-y-3">{basicContent}</div>
          </section>
          <section>
            <details className="rounded-md border border-slate-200 bg-slate-50 open:shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Advanced
              </summary>
              <div className="space-y-3 px-3 py-3">{advancedContent}</div>
            </details>
          </section>
        </div>
      )}
      {!collapsed && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Button size="sm" onClick={onApply} title="Apply parameter changes">
            Apply
          </Button>
          <Button size="sm" variant="outline" onClick={onDefaults} title="Reset to factory defaults">
            Factory defaults
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSavePreset?.()}
            className="col-span-1"
            title="Store preset in this browser"
          >
            Save preset
          </Button>
          <div className="col-span-1 flex justify-end">
            <ShareLink config={shareConfig} />
          </div>
        </div>
      )}
    </aside>
  );
};
