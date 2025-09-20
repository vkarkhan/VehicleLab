"use client";

import { useEffect, useState } from "react";

interface AdSlotProps {
  id: string;
  className?: string;
}

export function AdSlot({ id, className }: AdSlotProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(process.env.NEXT_PUBLIC_ENABLE_ADS === "true");
  }, []);

  if (!enabled) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 ${className ?? ""}`}>
        Ads are disabled. Configure NEXT_PUBLIC_ENABLE_ADS when ready.
      </div>
    );
  }

  return (
    <div className={className}>
      <div id={id} className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-slate-100 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {/* TODO: mount Google-certified CMP + ad script */}
        Loading ad…
      </div>
    </div>
  );
}
