import type { VehicleParams } from "@/lib/vehicle/params";
import { buildStateSpace } from "./utils";
import {
  add,
  complex,
  div,
  magnitude,
  mul,
  phase as complexPhase,
  scale,
  sub,
} from "./complex";

export type FrequencyPrediction = {
  freqs: number[];
  yawRateMag: number[];
  yawRatePhase: number[];
  ayMag: number[];
  ayPhase: number[];
};

export function predictBode(
  speed: number,
  freqs: number[],
  vehicle: VehicleParams
): FrequencyPrediction {
  const { A, B, coeffs } = buildStateSpace(vehicle, speed);

  const yawRateMag: number[] = [];
  const yawRatePhase: number[] = [];
  const ayMag: number[] = [];
  const ayPhase: number[] = [];

  for (const f of freqs) {
    const omega = 2 * Math.PI * f;
    const jw = complex(0, omega);
    const p = sub(jw, complex(A[0][0], 0));
    const q = complex(-A[0][1], 0);
    const r = complex(-A[1][0], 0);
    const s = sub(jw, complex(A[1][1], 0));

    const det = sub(mul(p, s), mul(q, r));
    const inv00 = div(s, det);
    const inv01 = div(scale(q, -1), det);
    const inv10 = div(scale(r, -1), det);
    const inv11 = div(p, det);

    const b0 = complex(B[0], 0);
    const b1 = complex(B[1], 0);

    const state0 = add(mul(inv00, b0), mul(inv01, b1));
    const state1 = add(mul(inv10, b0), mul(inv11, b1));

    const yawTransfer = state1;

    const vyDot = mul(jw, state0);
    const ayTransfer = add(mul(complex(speed, 0), yawTransfer), vyDot);

    yawRateMag.push(magnitude(yawTransfer));
    yawRatePhase.push(complexPhase(yawTransfer));
    ayMag.push(magnitude(ayTransfer));
    ayPhase.push(complexPhase(ayTransfer));
  }

  return {
    freqs,
    yawRateMag,
    yawRatePhase,
    ayMag,
    ayPhase,
  };
}
