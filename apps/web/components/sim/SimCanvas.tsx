"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { clamp } from "@/lib/utils";
import { createVehicleParams } from "@/lib/vehicle/params";
import { computeUndersteerGradient, safeSteadyStateSteerAngle } from "@/lib/vehicle/understeer";
import { useSimStore } from "@/lib/store/simStore";
import { getModel } from "@/lib/sim/registry";
import type { Telemetry } from "@/lib/sim/core";

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

const OVERLAY_SCALE = 3.2;

const VehicleBase = ({ geometry, wheelRadius }: { geometry: VehicleGeometry; wheelRadius: number }) => (
  <mesh castShadow receiveShadow position={[0, wheelRadius * 0.52, 0]}>
    <boxGeometry args={[geometry.length * 0.9, wheelRadius * 0.28, geometry.width * 0.72]} />
    <meshStandardMaterial color="#1d4ed8" metalness={0.16} roughness={0.58} transparent opacity={0.5} />
  </mesh>
);

const WheelBlock = ({ position, geometry, wheelRadius }: { position: [number, number, number]; geometry: VehicleGeometry; wheelRadius: number }) => (
  <mesh castShadow receiveShadow position={position}>
    <boxGeometry args={[geometry.length * 0.16, wheelRadius * 0.34, wheelRadius * 0.82]} />
    <meshStandardMaterial color="#0f172a" metalness={0.18} roughness={0.62} />
  </mesh>
);

const VehicleGraphic = ({ geometry, wheelRadius }: { geometry: VehicleGeometry; wheelRadius: number }) => {
  const wheelbase = geometry.wheelbase ?? geometry.length * 0.62;
  const frontX = wheelbase * 0.5;
  const rearX = -wheelbase * 0.5;
  const halfTrack = geometry.width * 0.42;
  const bodyHeight = wheelRadius * 0.44;

  return (
    <group>
      <WheelBlock position={[frontX, wheelRadius * 0.34, halfTrack]} geometry={geometry} wheelRadius={wheelRadius} />
      <WheelBlock position={[frontX, wheelRadius * 0.34, -halfTrack]} geometry={geometry} wheelRadius={wheelRadius} />
      <WheelBlock position={[rearX, wheelRadius * 0.34, halfTrack]} geometry={geometry} wheelRadius={wheelRadius} />
      <WheelBlock position={[rearX, wheelRadius * 0.34, -halfTrack]} geometry={geometry} wheelRadius={wheelRadius} />

      <mesh castShadow receiveShadow position={[0, wheelRadius * 0.72, 0]}>
        <boxGeometry args={[geometry.length * 0.98, bodyHeight, geometry.width * 0.78]} />
        <meshStandardMaterial color="#2563eb" metalness={0.2} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[geometry.length * 0.08, wheelRadius * 1.02, 0]}>
        <boxGeometry args={[geometry.length * 0.44, wheelRadius * 0.3, geometry.width * 0.5]} />
        <meshStandardMaterial color="#93c5fd" metalness={0.12} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[-geometry.length * 0.32, wheelRadius * 0.92, 0]}>
        <boxGeometry args={[geometry.length * 0.22, wheelRadius * 0.22, geometry.width * 0.58]} />
        <meshStandardMaterial color="#1e40af" metalness={0.18} roughness={0.5} />
      </mesh>
      <mesh position={[geometry.length * 0.49, wheelRadius * 0.96, 0]}>
        <boxGeometry args={[geometry.length * 0.05, wheelRadius * 0.2, geometry.width * 0.56]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.14} roughness={0.32} />
      </mesh>
      <mesh position={[geometry.length * 0.2, wheelRadius * 1.18, 0]}>
        <boxGeometry args={[geometry.length * 0.22, wheelRadius * 0.08, geometry.width * 0.42]} />
        <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.2} opacity={0.7} transparent />
      </mesh>
    </group>
  );
};

const VehicleOverlays = ({ geometry, wheelRadius, steerAngle }: { geometry: VehicleGeometry; wheelRadius: number; steerAngle: number }) => (
  <group>
    <mesh position={[0, wheelRadius * 1.34, 0]}>
      <sphereGeometry args={[wheelRadius * 0.22, 16, 16]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[geometry.length * 0.36, wheelRadius * 1.28, 0]} rotation={[0, 0, -Math.PI * 0.5]}>
      <coneGeometry args={[wheelRadius * 0.2, wheelRadius * 0.72, 24]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.18} />
    </mesh>
    <mesh position={[geometry.length * 0.5, wheelRadius * 1.2, 0]} rotation={[0, steerAngle, 0]}>
      <boxGeometry args={[wheelRadius * 0.16, wheelRadius * 0.12, geometry.width * 0.9]} />
      <meshStandardMaterial color="#facc15" roughness={0.32} />
    </mesh>
  </group>
);

const Vehicle = ({ geometry, state, wheelRadius, steerAngle }: VehicleProps) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const targetX = state?.x ?? 0;
    const targetZ = state?.y ?? 0;
    const targetYaw = -(state?.psi ?? 0);

    ref.current.position.x = targetX;
    ref.current.position.z = targetZ;
    ref.current.rotation.y = targetYaw;
  });

  return (
    <group ref={ref} position={[0, 0.02, 0]}>
      <VehicleBase geometry={geometry} wheelRadius={wheelRadius} />
      <VehicleGraphic geometry={geometry} wheelRadius={wheelRadius} />
      <VehicleOverlays geometry={geometry} wheelRadius={wheelRadius} steerAngle={steerAngle} />
    </group>
  );
};

const toOverlayPoint = (x = 0, y = 0) => ({
  x: clamp(x * OVERLAY_SCALE, -360, 360),
  y: clamp(-y * OVERLAY_SCALE, -200, 200),
});

const MotionTrailOverlay = ({ samples }: { samples: readonly Telemetry[] }) => {
  const points = useMemo(
    () =>
      samples
        .slice(-240)
        .filter((sample) => typeof sample.x === "number" && typeof sample.y === "number")
        .map((sample) => {
          const point = toOverlayPoint(sample.x ?? 0, sample.y ?? 0);
          return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
        })
        .join(" "),
    [samples]
  );

  if (!points) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="-400 -240 800 480" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" opacity="0.55" />
    </svg>
  );
};

const VehicleOverlayGraphic = ({
  state,
  yaw,
  steerAngle,
}: {
  state: Record<string, number> | null;
  yaw: number;
  steerAngle: number;
}) => {
  const point = toOverlayPoint(state?.x ?? 0, state?.y ?? 0);

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-16 w-36 drop-shadow-xl"
      style={{ transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px) rotate(${-yaw}rad)` }}
      aria-hidden="true"
    >
      <div className="absolute left-4 top-0 h-4 w-9 rounded-sm bg-slate-950" />
      <div className="absolute left-4 bottom-0 h-4 w-9 rounded-sm bg-slate-950" />
      <div className="absolute right-4 top-0 h-4 w-9 rounded-sm bg-slate-950" />
      <div className="absolute right-4 bottom-0 h-4 w-9 rounded-sm bg-slate-950" />
      <div className="absolute inset-x-5 inset-y-2 rounded-full bg-blue-700 ring-2 ring-blue-100" />
      <div className="absolute left-9 top-1/2 h-8 w-14 -translate-y-1/2 rounded-full bg-sky-200/85" />
      <div className="absolute right-4 top-1/2 h-9 w-5 -translate-y-1/2 rounded-r-full bg-orange-500" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400 ring-2 ring-orange-100" />
      <div
        className="absolute right-4 top-1/2 h-1.5 w-12 origin-center rounded-full bg-yellow-300"
        style={{ transform: `translateY(-50%) rotate(${steerAngle}rad)` }}
      />
    </div>
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

const WorldCamera = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 62, 68);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
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

  const lastVehicleState = (lastState as Record<string, number>) ?? null;

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        className="h-full w-full"
        camera={{ position: [0, 62, 68], fov: 42 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
      >
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
        <Vehicle geometry={geometry} state={lastVehicleState} wheelRadius={wheelRadius} steerAngle={steerAngle} />
        <OrbitControls enablePan enableZoom zoomSpeed={0.6} target={[0, 0.35, 0]} />
        <WorldCamera />
      </Canvas>
      <MotionTrailOverlay samples={telemetrySamples} />
      <VehicleOverlayGraphic state={lastVehicleState} yaw={vehicleReadouts.psi} steerAngle={steerAngle} />
      <div className="pointer-events-none absolute right-4 top-4 z-30 space-y-1 rounded-xl bg-white/90 p-3 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/85 dark:text-slate-200 dark:ring-slate-700">
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
