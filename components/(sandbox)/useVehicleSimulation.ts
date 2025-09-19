"use client";

import { useEffect, useMemo, useState } from "react";

import type { SandboxState } from "@/lib/stateSchema";
import {
  createVehicleParameters,
  createVehicleState,
  speedToMetersPerSecond,
  steeringForState,
  stepBicycleModel,
  type SimulationSample,
  type VehicleTelemetry
} from "@/lib/physics";

interface VehicleSimulationResult {
  samples: SimulationSample[];
  telemetry: VehicleTelemetry;
}

const initialTelemetry: VehicleTelemetry = {
  yawRate: 0,
  lateralAcceleration: 0,
  slipAngle: 0,
  frontSlipAngle: 0,
  rearSlipAngle: 0,
  frontLoad: 0,
  rearLoad: 0,
  frontLoadPercent: 50,
  rearLoadPercent: 50,
  understeerGradient: 0,
  steeringAngle: 0
};

export function useVehicleSimulation(state: SandboxState): VehicleSimulationResult {
  const [samples, setSamples] = useState<SimulationSample[]>([]);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(initialTelemetry);
  const params = useMemo(() => createVehicleParameters(state), [state]);

  useEffect(() => {
    const vehicleState = createVehicleState();
    let localTelemetry = initialTelemetry;
    let elapsed = 0;
    let lastSampleTime = 0;
    let animationFrame: number;
    let lastUpdate = performance.now();

    const maxSamples = Math.round(state.duration * 20);

    const run = (time: number) => {
      const dt = Math.min((time - lastUpdate) / 1000, 0.05);
      lastUpdate = time;
      elapsed += dt;

      const steeringAngle = steeringForState(state, elapsed);
      const inputs = {
        steeringAngle,
        speed: speedToMetersPerSecond(state.speed)
      };

      const result = stepBicycleModel(vehicleState, inputs, params, dt);
      vehicleState.yawRate = result.state.yawRate;
      vehicleState.lateralVelocity = result.state.lateralVelocity;
      localTelemetry = result.telemetry;

      if (elapsed - lastSampleTime >= 0.05) {
        lastSampleTime = elapsed;
        setSamples((prev) => {
          const next: SimulationSample[] = [
            ...prev.slice(-maxSamples + 1),
            {
              ...result.sample,
              time: elapsed
            }
          ];
          return next;
        });
      }

      setTelemetry((prev) => ({ ...prev, ...localTelemetry }));
      animationFrame = requestAnimationFrame(run);
    };

    animationFrame = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [params, state]);

  return { samples, telemetry };
}
