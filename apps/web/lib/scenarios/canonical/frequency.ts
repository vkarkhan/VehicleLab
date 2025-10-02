import { predictBode } from "@/lib/theory/frequency";
import { runSimulation, vehicleParamsFromModel, type CanonicalTelemetry } from "./common";

export type FrequencyConfig = {
  speed: number;
  freqs: number[];
  amplitude?: number;
  cycles?: number;
  settleCycles?: number;
  dt?: number;
  modelId?: string;
  modelParams?: Record<string, unknown>;
};

export type FrequencyRun = {
  frequency: number;
  telemetry: CanonicalTelemetry[];
  yawGain: number;
  yawPhase: number;
  ayGain: number;
  ayPhase: number;
  frictionLimited: boolean;
  maxSlip: number;
};

export type FrequencyResult = {
  runs: FrequencyRun[];
  theory: ReturnType<typeof predictBode>;
  metrics: Record<string, number>;
  grades: Record<string, boolean>;
  flags: Record<string, boolean>;
};

const analyseSine = (
  samples: CanonicalTelemetry[],
  omega: number,
  amplitude: number,
  startTime: number
) => {
  const window = samples.filter((sample) => sample.t >= startTime);
  if (!window.length) {
    return { yawGain: 0, yawPhase: 0, ayGain: 0, ayPhase: 0 };
  }
  let sinSq = 0;
  let cosSq = 0;
  let yawSin = 0;
  let yawCos = 0;
  let aySin = 0;
  let ayCos = 0;

  for (const sample of window) {
    const angle = omega * sample.t;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    sinSq += s * s;
    cosSq += c * c;
    yawSin += sample.yawRate * s;
    yawCos += sample.yawRate * c;
    aySin += sample.ay * s;
    ayCos += sample.ay * c;
  }

  const norm = sinSq > 0 ? sinSq : window.length / 2;
  const yawAmp = Math.sqrt(yawSin * yawSin + yawCos * yawCos) / Math.max(norm, 1e-6);
  const ayAmp = Math.sqrt(aySin * aySin + ayCos * ayCos) / Math.max(norm, 1e-6);
  const yawPhase = Math.atan2(yawCos, yawSin);
  const ayPhase = Math.atan2(ayCos, aySin);
  const yawGain = amplitude === 0 ? 0 : yawAmp / amplitude;
  const ayGain = amplitude === 0 ? 0 : ayAmp / amplitude;
  return { yawGain, yawPhase, ayGain, ayPhase };
};

export function runFrequencyRun(config: FrequencyConfig): FrequencyResult {
  const amplitude = config.amplitude ?? (2 * Math.PI) / 180;
  const cycles = config.cycles ?? 6;
  const settleCycles = config.settleCycles ?? 2;
  const dt = config.dt ?? 0.01;

  const runs: FrequencyRun[] = [];

  let referenceParams: Record<string, unknown> | null = null;

  for (const freq of config.freqs) {
    const omega = 2 * Math.PI * freq;
    const period = freq > 0 ? 1 / freq : 1;
    const duration = cycles * period;
    const settleTime = settleCycles * period;

    const sim = runSimulation({
      modelId: config.modelId,
      params: { v: config.speed, ...(config.modelParams ?? {}) },
      dt,
      duration,
      input: ({ t }) => ({ steer: amplitude * Math.sin(omega * t) }),
    });

    if (!referenceParams) {
      referenceParams = sim.params;
    }

    const response = analyseSine(sim.telemetry, omega, amplitude, settleTime);
    const frictionLimited = sim.telemetry.some((sample) => sample.frontLimited || sample.rearLimited);
    const maxSlip = Math.max(
      ...sim.telemetry.map((sample) => Math.max(Math.abs(sample.slipFront), Math.abs(sample.slipRear)))
    );

    runs.push({
      frequency: freq,
      telemetry: sim.telemetry,
      yawGain: response.yawGain,
      yawPhase: response.yawPhase,
      ayGain: response.ayGain,
      ayPhase: response.ayPhase,
      frictionLimited,
      maxSlip,
    });
  }

  const vehicle = vehicleParamsFromModel(referenceParams ?? {});
  const theory = predictBode(config.speed, config.freqs, vehicle);

  const yawGains = runs.map((run) => run.yawGain);
  const theoryYaw = theory.yawRateMag;
  const lowestIndex = 0;
  const dcGainError = yawGains.length === 0 || theoryYaw.length === 0
    ? 0
    : theoryYaw[lowestIndex] === 0
      ? 0
      : Math.abs(yawGains[lowestIndex] - theoryYaw[lowestIndex]) / Math.max(Math.abs(theoryYaw[lowestIndex]), 1e-6);

  const simPeak = yawGains.length
    ? yawGains.reduce(
        (acc, value, idx) => (value > acc.value ? { value, idx } : acc),
        { value: yawGains[0], idx: 0 }
      )
    : { value: 0, idx: 0 };
  const theoryPeak = theoryYaw.length
    ? theoryYaw.reduce(
        (acc, value, idx) => (value > acc.value ? { value, idx } : acc),
        { value: theoryYaw[0], idx: 0 }
      )
    : { value: 0, idx: 0 };
  const peakFreqError = theoryYaw.length === 0 || yawGains.length === 0
    ? 0
    : theory.freqs[theoryPeak.idx] === 0
      ? Math.abs(config.freqs[simPeak.idx] - theory.freqs[theoryPeak.idx])
      : Math.abs(config.freqs[simPeak.idx] - theory.freqs[theoryPeak.idx]) / Math.max(theory.freqs[theoryPeak.idx], 1e-6);

  let errorSum = 0;
  let errorCount = 0;
  for (let i = 0; i < Math.min(yawGains.length, theoryYaw.length); i += 1) {
    const expected = theoryYaw[i];
    if (expected === 0) continue;
    const diff = yawGains[i] - expected;
    errorSum += (diff / expected) * (diff / expected);
    errorCount += 1;
  }
  const rmsError = errorCount > 0 ? Math.sqrt(errorSum / errorCount) : 0;

  const frictionLimited = runs.some((run) => run.frictionLimited);
  const maxSlip = runs.length ? Math.max(...runs.map((run) => run.maxSlip)) : 0;
  const linearRegion = maxSlip < (6 * Math.PI) / 180;

  const grades = {
    dcGain: dcGainError <= 0.05,
    peakFrequency: peakFreqError <= 0.1,
    magnitudeRms: rmsError <= 0.15,
  };

  const metrics = {
    dcGainError,
    peakFreqError,
    rmsError,
    maxSlip,
  };

  const flags = {
    frictionLimited,
    linearRegion,
  };

  return {
    runs,
    theory,
    metrics,
    grades,
    flags,
  };
}
