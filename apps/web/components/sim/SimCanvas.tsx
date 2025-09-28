"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { useSimStore } from "@/lib/store/simStore";
import { getModel } from "@/lib/sim/registry";

const lerp = (current: number, target: number, alpha: number) =>
  current + (target - current) * alpha;

type VehicleGeometry = {
  type: "vehicle";
  length: number;
  width: number;
  wheelbase?: number;
};

type VehicleProps = {
  geometry: VehicleGeometry;
  state: Record<string, number> | null;
};

const Vehicle = ({ geometry, state }: VehicleProps) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const targetX = state?.x ?? 0;
    const targetZ = state?.y ?? 0;
    const targetYaw = -(state?.psi ?? 0);

    ref.current.position.x = lerp(ref.current.position.x, targetX, 0.15);
    ref.current.position.z = lerp(ref.current.position.z, targetZ, 0.15);

    const currentYaw = ref.current.rotation.y;
    let delta = targetYaw - currentYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    ref.current.rotation.y = currentYaw + delta * 0.15;
  });

  return (
    <group ref={ref} position={[0, geometry.width * 0.05 + 0.1, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[geometry.length, 0.3, geometry.width]} />
        <meshStandardMaterial color="#2563eb" metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  );
};

const Ground = () => {
  const helper = useMemo(() => {
    const grid = new THREE.GridHelper(200, 80, 0x94a3b8, 0xcbd5f5);
    grid.position.y = 0;
    return grid;
  }, []);

  return <primitive object={helper} />;
};

export const SimCanvas = () => {
  const { lastState, lastTelemetry, modelId, params } = useSimStore((state) => ({
    lastState: state.lastState,
    lastTelemetry: state.lastTelemetry,
    modelId: state.modelId,
    params: state.params,
  }));

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

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        className="h-full w-full"
        camera={{ position: [8, 10, 12], fov: 45 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={0.7} castShadow />
        <Ground />
        <Vehicle geometry={geometry} state={(lastState as Record<string, number>) ?? null} />
        <OrbitControls enablePan enableZoom zoomSpeed={0.6} />
      </Canvas>
      <div className="pointer-events-none absolute right-4 top-4 space-y-1 rounded-md bg-white/85 p-3 text-xs font-medium text-slate-700 shadow dark:bg-slate-900/80 dark:text-slate-200">
        <div>psi {(lastTelemetry?.psi ?? 0).toFixed(2)} rad</div>
        <div>r {(lastTelemetry?.r ?? 0).toFixed(2)} rad/s</div>
        <div>ay {(lastTelemetry?.ay ?? 0).toFixed(2)} m/s^2</div>
        <div>beta {(lastTelemetry?.beta ?? 0).toFixed(2)} rad</div>
      </div>
    </div>
  );
};
