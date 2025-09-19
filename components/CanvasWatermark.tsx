"use client";

interface CanvasWatermarkProps {
  visible: boolean;
}

export function CanvasWatermark({ visible }: CanvasWatermarkProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-6">
      <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
        VehicleLab
      </span>
    </div>
  );
}
