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
import { simStateBus } from "@/lib/sim/stateBus";

interface VehicleSimulationResult {
  samples: SimulationSample[];
  telemetry: VehicleTelemetry;
}

const TARGET_DT = 1 / 60;
const CHART_UPDATE_INTERVAL = 1 / 20;
const SMOOTHING_WINDOW = 8;

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
  frontAxleForce: 0,
  rearAxleForce: 0,
  frontUtilization: 0,
  rearUtilization: 0,
  lateralVelocity: 0,
  longitudinalSpeed: 0,
  understeerGradient: 0,
  steeringAngle: 0
};

export function useVehicleSimulation(state: SandboxState): VehicleSimulationResult {
  const [samples, setSamples] = useState<SimulationSample[]>([]);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(initialTelemetry);
  const params = useMemo(() => createVehicleParameters(state), [state]);

  useEffect(() => {
    const vehicleState = createVehicleState();
    let latestTelemetry = initialTelemetry;

    let accumulator = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    let lastChartEmit = 0;
    let animationFrame: number;

    const smoothing = {
      lateralAcceleration: [] as number[],
      yawRate: [] as number[]
    };

    const maxSamples = Math.max(Math.round(state.duration * 20), 40);

    const run = (time: number) => {
      const frameDt = Math.min((time - lastFrame) / 1000, 0.1);
      lastFrame = time;
      accumulator += frameDt;

      const inputs = {
        speed: speedToMetersPerSecond(state.speed),
        steeringAngle: 0
      };

      while (accumulator >= TARGET_DT) {
        elapsed += TARGET_DT;
        accumulator -= TARGET_DT;

        inputs.steeringAngle = steeringForState(state, elapsed);

        const result = stepBicycleModel(vehicleState, inputs, params, TARGET_DT);
        vehicleState.yawRate = result.state.yawRate;
        vehicleState.lateralVelocity = result.state.lateralVelocity;
        latestTelemetry = result.telemetry;

        simStateBus.publish({
          telemetry: {
            t: elapsed,
            r: result.telemetry.yawRate,
            ay: result.telemetry.lateralAcceleration,
            beta: result.telemetry.slipAngle,
            psi: result.telemetry.yawRate * TARGET_DT,
          },
          state: {
            r: result.state.yawRate,
            vy: result.state.lateralVelocity,
          },
          params: state,
          modelId: "sandbox-bicycle",
          scenarioId: state.manoeuvre ?? "sandbox",
        });

        smoothing.lateralAcceleration.push(result.telemetry.lateralAcceleration);
        if (smoothing.lateralAcceleration.length > SMOOTHING_WINDOW) {
          smoothing.lateralAcceleration.shift();
        }

        smoothing.yawRate.push(result.telemetry.yawRate);
        if (smoothing.yawRate.length > SMOOTHING_WINDOW) {
          smoothing.yawRate.shift();
        }

        const smoothedLateral =
          smoothing.lateralAcceleration.reduce((acc, value) => acc + value, 0) / smoothing.lateralAcceleration.length;
        const smoothedYaw = smoothing.yawRate.reduce((acc, value) => acc + value, 0) / smoothing.yawRate.length;

        if (elapsed - lastChartEmit >= CHART_UPDATE_INTERVAL) {
          lastChartEmit = elapsed;
          const sample: SimulationSample = {
            time: elapsed,
            yawRate: smoothedYaw,
            lateralAcceleration: smoothedLateral,
            slipAngle: result.sample.slipAngle,
            frontSlipAngle: result.sample.frontSlipAngle,
            rearSlipAngle: result.sample.rearSlipAngle
          };

          setSamples((prev) => {
            const next = [...prev.slice(-maxSamples + 1), sample];
            return next;
          });
        }
      }

      setTelemetry((prev) => ({ ...prev, ...latestTelemetry }));
      animationFrame = requestAnimationFrame(run);
    };

    animationFrame = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [params, state]);

  return { samples, telemetry };
}
