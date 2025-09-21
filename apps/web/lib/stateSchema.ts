import { z } from "zod";

export const sandboxStateSchema = z.object({
  mass: z.coerce.number().min(400).max(3000).default(1400),
  cgHeight: z.coerce.number().min(0.2).max(1.2).default(0.55),
  weightDistributionFront: z.coerce.number().min(0.3).max(0.7).default(0.52),
  tyreGrip: z.coerce.number().min(0.5).max(1.5).default(1),
  speed: z.coerce.number().min(0).max(240).default(80),
  steeringMode: z.enum(["step", "sine"]).default("step"),
  steeringAmplitude: z.coerce.number().min(1).max(30).default(8),
  sineFrequency: z.coerce.number().min(0.1).max(2).default(0.6),
  manoeuvre: z.enum(["skidpad", "lane-change"]).default("skidpad"),
  skidpadRadius: z.coerce.number().min(10).max(80).default(20),
  duration: z.coerce.number().min(4).max(20).default(12),
  showTrack: z.coerce.boolean().default(true),
  lateralUnit: z.enum(["g", "mps2"]).default("g"),
  camber: z.coerce.number().min(-5).max(5).default(0),
  springRate: z.coerce.number().min(20).max(160).default(80),
  damper: z.coerce.number().min(1000).max(4000).default(2200),
  antiRoll: z.coerce.number().min(0).max(1).default(0.5)
});

export type SandboxState = z.infer<typeof sandboxStateSchema>;

export const defaultSandboxState = sandboxStateSchema.parse({});

type SearchParams = Record<string, string | string[] | undefined>;

export function parseStateFromSearchParams(searchParams: SearchParams): SandboxState {
  const parsed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      parsed[key] = value[value.length - 1];
    } else {
      parsed[key] = value;
    }
  }

  return sandboxStateSchema.parse(parsed);
}

export function serializeStateToSearchParams(state: SandboxState): URLSearchParams {
  const params = new URLSearchParams();
  const entries = Object.entries(state) as [keyof SandboxState, SandboxState[keyof SandboxState]][];

  for (const [key, value] of entries) {
    const defaultValue = defaultSandboxState[key];
    if (value === defaultValue) continue;

    if (typeof value === "number") {
      params.set(key, value.toFixed(3));
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}
