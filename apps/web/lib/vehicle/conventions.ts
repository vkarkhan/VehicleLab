/**
 * Vehicle coordinate system conventions used across VehicleLab:
 * - x-axis points forward.
 * - y-axis points to the driver's left.
 * - z-axis points upward.
 * - Yaw angle (psi) increases counter-clockwise when viewed from above.
 * - Yaw rate 'r' is the time derivative of psi.
 */

export type VehicleConventions = {
  longitudinal: "x-forward";
  lateral: "y-left";
  vertical: "z-up";
  yawPositive: "ccw";
  yawRate: "psi-dot";
};

export const AXES: VehicleConventions = Object.freeze({
  longitudinal: "x-forward",
  lateral: "y-left",
  vertical: "z-up",
  yawPositive: "ccw",
  yawRate: "psi-dot",
});

export function assertConventions(candidate?: Partial<VehicleConventions>): true {
  if (!candidate) {
    return true;
  }

  (Object.keys(AXES) as Array<keyof VehicleConventions>).forEach((key) => {
    const expected = AXES[key];
    const actual = candidate[key];
    if (actual && actual !== expected) {
      throw new Error(
        [
          "Vehicle convention mismatch for ",
          String(key),
          ": expected ",
          String(expected),
          ", received ",
          String(actual),
        ].join("")
      );
    }
  });

  return true;
}
