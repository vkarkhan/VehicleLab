type DtBounds = {
  min: number;
  max: number;
  recommended: number;
};

const DT_BOUNDS: Record<string, DtBounds> = {
  lin2dof: { min: 0.002, max: 0.02, recommended: 0.01 },
  unicycle: { min: 0.005, max: 0.05, recommended: 0.02 },
};

export type DtGuardResult = {
  dt: number;
  clamped: boolean;
  message?: string;
};

export function enforceDtBounds(modelId: string, requestedDt: number): DtGuardResult {
  const bounds = DT_BOUNDS[modelId];
  if (!bounds) {
    return { dt: requestedDt, clamped: false };
  }
  const clampedDt = Math.min(Math.max(requestedDt, bounds.min), bounds.max);
  const clamped = clampedDt !== requestedDt;
  let message: string | undefined;
  if (clamped) {
    message = [
      "Time step clamped for stability.",
      "Allowed range: [",
      bounds.min.toFixed(3),
      ", ",
      bounds.max.toFixed(3),
      "] s",
    ].join("");
  }
  return { dt: clampedDt, clamped, message };
}

export function getRecommendedDt(modelId: string): number | undefined {
  const bounds = DT_BOUNDS[modelId];
  return bounds ? bounds.recommended : undefined;
}
