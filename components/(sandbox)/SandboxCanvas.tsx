"use client";

import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { Ref } from "react";
import { Color, Euler, Vector3 } from "three";

import type { VehicleTelemetry } from "@/lib/physics";

interface SandboxCanvasProps {
  telemetry: VehicleTelemetry;
  watermark: React.ReactNode;
  containerRef?: Ref<HTMLDivElement>;
}

const background = new Color("#e2e8f0");

function PrimitiveCar() {
  return (
    <group scale={1}>
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[1.9, 0.6, 4.2]} />
        <meshStandardMaterial color="#334155" metalness={0.1} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.75, -0.3]}>
        <boxGeometry args={[1.7, 0.5, 1.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.4} />
      </mesh>
      {[-1, 1].map((x) =>
        [-1.35, 1.35].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x * 0.75, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.32, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.4} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Vehicle({ telemetry }: { telemetry: VehicleTelemetry }) {
  const [rotation, setRotation] = useState(() => new Euler(0, 0, 0));
  const [position, setPosition] = useState(() => new Vector3(0, 0, 0));

  useEffect(() => {
    setRotation((prev) => {
      const yaw = prev.y + telemetry.yawRate * 0.016;
      const roll = telemetry.lateralAcceleration * -0.02;
      setPosition((pos) => {
        const next = pos.clone();
        next.x += Math.sin(yaw) * telemetry.lateralAcceleration * 0.002;
        next.z += Math.cos(yaw) * telemetry.lateralAcceleration * 0.002;
        return next;
      });
      return new Euler(roll, yaw, 0);
    });
  }, [telemetry]);

  return (
    <group position={position} rotation={rotation}>
      <PrimitiveCar />
    </group>
  );
}

export function SandboxCanvas({ telemetry, watermark, containerRef }: SandboxCanvasProps) {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio ?? 1, 1.5));
  }, []);

  return (
    <div ref={containerRef} className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <Canvas shadows dpr={dpr} gl={{ antialias: true }}>
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 10, 60]} />
        <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={40} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <spotLight position={[-8, 8, -6]} angle={0.7} intensity={0.4} penumbra={0.5} />

        <group position={[0, 0, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <Vehicle telemetry={telemetry} />
        </group>

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.65}
          scale={12}
          blur={1.4}
          far={20}
        />
        <Environment preset="city" />
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
      {watermark}
    </div>
  );
}
