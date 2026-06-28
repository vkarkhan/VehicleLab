"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { clamp } from "@/lib/utils";
import { createVehicleParams } from "@/lib/vehicle/params";
import { computeUndersteerGradient, safeSteadyStateSteerAngle } from "@/lib/vehicle/understeer";
import { useSimStore } from "@/lib/store/simStore";
import { getModel } from "@/lib/sim/registry";
import type { Telemetry } from "@/lib/sim/core";

const lerp = (current: number, target: number, alpha: number) => current + (target - current) * alpha;

type VehicleGeometry = {
  type: "vehicle";
  length: number;
  width: number;
  wheelbase?: number;
};

type VehicleProps = {
  geometry: VehicleGeometry;
  state: Record<string, number> | null;
  wheelRadius: number;
  steerAngle: number;
};

const buildWheelPositions = (geometry: VehicleGeometry, wheelRadius: number) => {
  const wheelbase = geometry.wheelbase ?? geometry.length * 0.62;
  const halfTrack = geometry.width * 0.5 * 0.86;
  return {
    frontLeft: [wheelbase * 0.5, wheelRadius, halfTrack] as [number, number, number],
    frontRight: [wheelbase * 0.5, wheelRadius, -halfTrack] as [number, number, number],
    rearLeft: [-wheelbase * 0.5, wheelRadius, halfTrack] as [number, number, number],
    rearRight: [-wheelbase * 0.5, wheelRadius, -halfTrack] as [number, number, number],
  };
};

const Wheel = ({
  position,
  radius,
  steerAngle = 0,
}: {
  position: [number, number, number];
  radius: number;
  steerAngle?: number;
}) => (
  <group position={position} rotation={[0, steerAngle, 0]}>
    <mesh castShadow rotation={[0, 0, Math.PI * 0.5]}>
      <cylinderGeometry args={[radius, radius, radius * 0.52, 24]} />
      <meshStandardMaterial color="#111827" metalness={0.2} roughness={0.58} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI * 0.5]}>
      <cylinderGeometry args={[radius * 0.55, radius * 0.55, radius * 0.18, 12]} />
      <meshStandardMaterial color="#cbd5e1" metalness={0.45} roughness={0.25} />
    </mesh>
  </group>
);

const VehicleBody = ({ geometry, wheelRadius }: { geometry: VehicleGeometry; wheelRadius: number }) => {
  const cabinHeight = wheelRadius * 2.0;
  const roofHeight = cabinHeight + wheelRadius * 0.55;
  const cabinLength = geometry.length * 0.46;
  const cabinOffset = geometry.length * 0.08;
  const bonnetLength = geometry.length * 0.34;

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, cabinHeight * 0.34, 0]}>
        <boxGeometry args={[geometry.length, cabinHeight * 0.62, geometry.width * 0.9]} />
        <meshStandardMaterial color="#2563eb" metalness={0.22} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[cabinOffset, roofHeight * 0.5, 0]}>
        <boxGeometry args={[cabinLength, roofHeight * 0.58, geometry.width * 0.68]} />
        <meshStandardMaterial color="#93c5fd" metalness={0.18} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[bonnetLength * 0.36, cabinHeight * 0.54, 0]}>
        <boxGeometry args={[bonnetLength, cabinHeight * 0.44, geometry.width * 0.74]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.22} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[-geometry.length * 0.32, cabinHeight * 0.54, 0]}>
        <boxGeometry args={[geometry.length * 0.28, cabinHeight * 0.44, geometry.width * 0.78]} />
        <meshStandardMaterial color="#1e40af" metalness={0.22} roughness={0.48} />
      </mesh>
      <mesh position={[geometry.length * 0.49, cabinHeight * 0.7, 0]}>
        <boxGeometry args={[0.08, cabinHeight * 0.42, geometry.width * 0.62]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.15} roughness={0.3} />
      </mesh>
      <mesh position={[bonnetLength * 0.15, roofHeight * 0.62, 0]}>
        <boxGeometry args={[cabinLength * 0.62, roofHeight * 0.2, geometry.width * 0.58]} />
        <meshStandardMaterial color="#0f172a" metalness={0.22} roughness={0.18} opacity={0.68} transparent />
      </mesh>
    </group>
  );
};

const VehicleOverlays = ({ geometry, wheelRadius, steerAngle }: { geometry: VehicleGeometry; wheelRadius: number; steerAngle: number }) => (
  <group>
    <mesh position={[0, wheelRadius * 2.4, 0]}>
      <sphereGeometry args={[wheelRadius * 0.22, 16, 16]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[geometry.length * 0.36, wheelRadius * 1.75, 0]} rotation={[0, 0, -Math.PI * 0.5]}>
      <coneGeometry args={[wheelRadius * 0.2, wheelRadius * 0.72, 24]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.18} />
    </mesh>
    <mesh position={[geometry.length * 0.5, wheelRadius * 1.35, 0]} rotation={[0, steerAngle, 0]}>
      <boxGeometry args={[wheelRadius * 0.16, wheelRadius * 0.12, geometry.width * 0.9]} />
      <meshStandardMaterial color="#facc15" roughness={0.32} />
    </mesh>
  </group>
);

const Vehicle = ({ geometry, state, wheelRadius, steerAngle }: VehicleProps) => {
  const ref = useRef<THREE.Group>(null);
  const wheelPositions = useMemo(() => buildWheelPositions(geometry, wheelRadius), [geometry, wheelRadius]);

  useFrame(() => {
    if (!ref.current) return;
    const targetX = state?.x ?? 0;
    const targetZ = state?.y ?? 0;
    const targetYaw = -(state?.psi ?? 0);

    ref.current.position.x = lerp(ref.current.position.x, targetX, 0.12);
    ref.current.position.z = lerp(ref.current.position.z, targetZ, 0.12);

    const currentYaw = ref.current.rotation.y;
    let delta = targetYaw - currentYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    ref.current.rotation.y = currentYaw + delta * 0.1;
  });

  return (
    <group ref={ref} position={[0, wheelRadius + 0.02, 0]}>
      <VehicleBody geometry={geometry} wheelRadius={wheelRadius} />
      <VehicleOverlays geometry={geometry} wheelRadius={wheelRadius} steerAngle={steerAngle} />
      <Wheel position={wheelPositions.frontLeft} radius={wheelRadius} steerAngle={steerAngle} />
      <Wheel position={wheelPositions.frontRight} radius={wheelRadius} steerAngle={steerAngle} />
      <Wheel position={wheelPositions.rearLeft} radius={wheelRadius} />
      <Wheel position={wheelPositions.rearRight} radius={wheelRadius} />
    </group>
  );
};

const PathTrace = ({ samples }: { samples: readonly Telemetry[] }) => {
  const trace = useMemo(() => {
    const points = samples
      .slice(-1000)
      .filter((sample) => typeof sample.x === "number" && typeof sample.y === "number")
      .map((sample) => new THREE.Vector3(sample.x ?? 0, 0.035, sample.y ?? 0));
    if (points.length < 2) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#2563eb", transparent: true, opacity: 0.78 });
    return new THREE.Line(geometry, material);
  }, [samples]);

  if (!trace) return null;

  return <primitive object={trace} />;
};

const GroundGrid = () => {
  const helper = useMemo(() => {
    const grid = new THREE.GridHelper(160, 40, 0x64748b, 0xcbd5e1);
    grid.position.y = 0.02;
    return grid;
  }, []);

  return <primitive object={helper} />;
};

const radToDeg = (value: number) => (value * 180) / Math.PI;

export const SimCanvas = () => {
  const { lastState, lastTelemetry, modelId, params } = useSimStore((state) => ({
    lastState: state.lastState,
    lastTelemetry: state.lastTelemetry,
    modelId: state.modelId,
    params: state.params,
  }));
  const telemetrySamples = useSimStore((state) => state.telemetry.samples);

  const geometry = useMemo<VehicleGeometry>(() => {
    const model = getModel(modelId);
    return (
      model?.geometry?.(params) ?? {
        type: "vehicle",
        length: 3.8,
        width: 1.8,
      }
    );
  }, [modelId, params]);

  const wheelRadius = useMemo(() => clamp(geometry.width * 0.14, 0.18, 0.42), [geometry.width]);

  const vehicleReadouts = useMemo(() => {
    if (!lastTelemetry) {
      return {
        psi: 0,
        yawRate: 0,
        ay: 0,
        beta: 0,
        understeer: null as number | null,
        deltaSs: null as number | null,
        frictionLimited: false,
        slipWarning: false,
      };
    }

    const yawRate = lastTelemetry.r ?? 0;
    const ay = lastTelemetry.ay ?? 0;
    const beta = lastTelemetry.beta ?? 0;
    const psi = lastTelemetry.psi ?? 0;

    let understeer: number | null = null;
    let deltaSs: number | null = null;

    const paramObject = params as Record<string, unknown>;
    const hasLinearParams =
      typeof paramObject.m === "number" &&
      typeof paramObject.Iz === "number" &&
      typeof paramObject.a === "number" &&
      typeof paramObject.b === "number" &&
      typeof paramObject.Cf === "number" &&
      typeof paramObject.Cr === "number";

    const speed = typeof paramObject.v === "number" ? paramObject.v : Math.max(Math.abs((lastTelemetry.notes?.vxEffective as number) ?? 0), 1);
    if (hasLinearParams && Math.abs(speed) > 0.1 && Math.abs(yawRate) > 1e-4) {
      try {
        const vehicleParams = createVehicleParams({
          m: paramObject.m as number,
          Iz: paramObject.Iz as number,
          a: paramObject.a as number,
          b: paramObject.b as number,
          Cf: paramObject.Cf as number,
          Cr: paramObject.Cr as number,
          mu: (paramObject.mu as number) ?? 1,
          track: (paramObject.trackWidth as number) ?? 1.6,
          hCg: (paramObject.hCg as number) ?? 0.55,
        });
        understeer = computeUndersteerGradient(vehicleParams);
        const radius = speed / yawRate;
        deltaSs = safeSteadyStateSteerAngle(speed, radius, vehicleParams);
      } catch {
        understeer = null;
        deltaSs = null;
      }
    }

    const maxSlip = Math.max(
      Math.abs(lastTelemetry.frontSlipAngle ?? 0),
      Math.abs(lastTelemetry.rearSlipAngle ?? 0)
    );
    const slipWarning = maxSlip > (6 * Math.PI) / 180;
    const frictionLimited = Boolean(lastTelemetry.notes?.frontLimited || lastTelemetry.notes?.rearLimited);

    return {
      psi,
      yawRate,
      ay,
      beta,
      understeer,
      deltaSs,
      frictionLimited,
      slipWarning,
    };
  }, [lastTelemetry, params]);

  const steerAngle = useMemo(() => {
    const noteValue = lastTelemetry?.notes?.steerAngle;
    if (typeof noteValue === "number" && Number.isFinite(noteValue)) {
      return clamp(noteValue, -0.55, 0.55);
    }
    return 0;
  }, [lastTelemetry]);

  return (
    <div className="relative h-full w-full">
      <Canvas shadows className="h-full w-full" camera={{ position: [8, 7, 9], fov: 45 }}>
        <color attach="background" args={["#f8fafc"]} />
        <fog attach="fog" args={["#f8fafc", 70, 180]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[14, 18, 10]} intensity={0.75} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <spotLight position={[-16, 24, -14]} angle={0.42} intensity={0.35} />
        <GroundGrid />
        <PathTrace samples={telemetrySamples} />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[240, 240]} />
          <meshStandardMaterial color="#e8eef5" />
        </mesh>
        <Vehicle geometry={geometry} state={(lastState as Record<string, number>) ?? null} wheelRadius={wheelRadius} steerAngle={steerAngle} />
        <OrbitControls enablePan enableZoom zoomSpeed={0.6} />
      </Canvas>
      <div className="pointer-events-none absolute right-4 top-4 space-y-1 rounded-xl bg-white/90 p-3 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/85 dark:text-slate-200 dark:ring-slate-700">
        <div>psi {radToDeg(vehicleReadouts.psi).toFixed(1)} deg</div>
        <div>r {vehicleReadouts.yawRate.toFixed(3)} rad/s</div>
        <div>ay {vehicleReadouts.ay.toFixed(2)} m/s^2</div>
        <div>beta {radToDeg(vehicleReadouts.beta).toFixed(1)} deg</div>
        {vehicleReadouts.understeer !== null && <div>U {vehicleReadouts.understeer.toFixed(4)} rad/g</div>}
        {vehicleReadouts.deltaSs !== null && <div>delta<sub>ss</sub> {radToDeg(vehicleReadouts.deltaSs).toFixed(1)} deg</div>}
        {vehicleReadouts.frictionLimited && <div className="text-amber-600">Friction-limited</div>}
        {vehicleReadouts.slipWarning && <div className="text-rose-600">|alpha| &gt; 6 deg</div>}
      </div>
    </div>
  );
};
