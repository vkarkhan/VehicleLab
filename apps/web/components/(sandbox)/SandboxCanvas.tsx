"use client";

import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import type { Ref } from "react";
import { Color, MathUtils, Vector3 } from "three";

import type { VehicleTelemetry } from "@/lib/physics";

interface SandboxCanvasProps {
  telemetry: VehicleTelemetry;
  watermark: React.ReactNode;
  containerRef?: Ref<HTMLDivElement>;
  showTrack: boolean;
  wheelRadiusMeters: number;
  rideHeightMeters: number;
  modelOriginOffsetY: number;
  alignmentDebug: boolean;
  camberDeg: number;
  crownDeg: number;
}

const background = new Color("#e2e8f0");

const GROUND_Y = 0;
const CONTACT_PATCH_OFFSET = 0.001;
const CLEARANCE_THRESHOLD = -1e-3;
const WHEEL_WIDTH = 0.32;
const DEBUG_SPHERE_RADIUS = 0.045;
const GUIDE_LINE_THICKNESS = 0.015;

const wheelOffsets = [
  { x: -0.75, z: 1.35, axle: "front" as const },
  { x: 0.75, z: 1.35, axle: "front" as const },
  { x: -0.75, z: -1.35, axle: "rear" as const },
  { x: 0.75, z: -1.35, axle: "rear" as const }
];

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
    </group>
  );
}

interface VehicleProps {
  telemetry: VehicleTelemetry;
  showTrack: boolean;
  wheelRadiusMeters: number;
  rideHeightMeters: number;
  modelOriginOffsetY: number;
  alignmentDebug: boolean;
  camberDeg: number;
  crownDeg: number;
}

function Vehicle({
  telemetry,
  showTrack,
  wheelRadiusMeters,
  rideHeightMeters,
  modelOriginOffsetY,
  alignmentDebug,
  camberDeg,
  crownDeg
}: VehicleProps) {
  const [attitude, setAttitude] = useState(() => ({ yaw: 0, roll: 0 }));
  const [position, setPosition] = useState(() => new Vector3(0, 0, 0));

  useEffect(() => {
    setAttitude((prev) => {
      const nextYaw = prev.yaw + telemetry.yawRate * 0.016;
      const nextRoll = telemetry.lateralAcceleration * -0.02;
      setPosition((pos) => {
        const next = pos.clone();
        next.x += Math.sin(nextYaw) * telemetry.lateralAcceleration * 0.002;
        next.z += Math.cos(nextYaw) * telemetry.lateralAcceleration * 0.002;
        return next;
      });
      return { yaw: nextYaw, roll: nextRoll };
    });
  }, [telemetry]);

  const camberRadians = MathUtils.degToRad(camberDeg);
  const crownRadians = MathUtils.degToRad(crownDeg);
  const wheelCenterY = GROUND_Y + wheelRadiusMeters;
  const contactPatchY = GROUND_Y + CONTACT_PATCH_OFFSET;
  const chassisOriginY = GROUND_Y + wheelRadiusMeters + rideHeightMeters + modelOriginOffsetY;

  const wheelGroups = useMemo(
    () =>
      wheelOffsets.map(({ x, z, axle }) => {
        const center = [x, wheelCenterY, z] as const;
        const contactPatch = [x, contactPatchY, z] as const;
        const clearance = center[1] - (GROUND_Y + wheelRadiusMeters);
        const debugColor = clearance < CLEARANCE_THRESHOLD ? "#ef4444" : "#22c55e";

        return {
          axle,
          center,
          contactPatch,
          clearance,
          debugColor
        };
      }),
    [wheelCenterY, contactPatchY, wheelRadiusMeters]
  );

  return (
    <group position={position} rotation={[0, attitude.yaw, 0]}>
      <group position={[0, chassisOriginY, 0]} rotation={[attitude.roll, 0, 0]}>
        <PrimitiveCar />
      </group>

      {wheelGroups.map(({ axle, center, contactPatch, debugColor, clearance }) => (
        <group key={`${axle}-${center[0]}-${center[2]}`}>
          <mesh castShadow position={center} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadiusMeters, wheelRadiusMeters, WHEEL_WIDTH, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.4} />
          </mesh>

          {showTrack ? (
            <mesh position={contactPatch} rotation={[-Math.PI / 2 + camberRadians, 0, crownRadians]}>
              <planeGeometry args={[0.62, 0.36]} />
              <meshStandardMaterial
                color={axle === "front" ? "#38bdf8" : "#f97316"}
                opacity={0.45}
                transparent
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
          ) : null}

          {alignmentDebug ? (
            <group>
              <mesh position={center}>
                <sphereGeometry args={[DEBUG_SPHERE_RADIUS, 16, 16]} />
                <meshStandardMaterial color={debugColor} />
              </mesh>
              <mesh position={[center[0], GROUND_Y + CONTACT_PATCH_OFFSET * 0.5, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.2, GUIDE_LINE_THICKNESS]} />
                <meshBasicMaterial
                  color={debugColor}
                  transparent
                  opacity={Math.min(0.8, Math.abs(clearance) * 400 + 0.2)}
                />
              </mesh>
            </group>
          ) : null}
        </group>
      ))}

      {alignmentDebug ? (
        <mesh position={[0, GROUND_Y + CONTACT_PATCH_OFFSET * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, GUIDE_LINE_THICKNESS]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} />
        </mesh>
      ) : null}
    </group>
  );
}

interface TrackSurfaceProps {
  camberDeg: number;
  crownDeg: number;
}

function TrackSurface({ camberDeg, crownDeg }: TrackSurfaceProps) {
  const lanePositions = [-3.5, 0, 3.5];
  const edgePositions = [-7.5, 7.5];
  const camberRadians = MathUtils.degToRad(camberDeg);
  const crownRadians = MathUtils.degToRad(crownDeg) * 0.4;

  return (
    <group position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2 + camberRadians, 0, crownRadians]}>
      <mesh receiveShadow>
        <planeGeometry args={[42, 54]} />
        <meshStandardMaterial color="#1f2937" roughness={0.95} metalness={0.05} />
      </mesh>
      {lanePositions.map((x) => (
        <mesh key={`lane-${x}`} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.25, 48]} />
          <meshStandardMaterial color="#cbd5f5" transparent opacity={0.28} roughness={0.4} />
        </mesh>
      ))}
      {edgePositions.map((x) => (
        <mesh key={`edge-${x}`} position={[x, 0.005, 0]}>
          <planeGeometry args={[0.18, 48]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function SandboxCanvas({
  telemetry,
  watermark,
  containerRef,
  showTrack,
  wheelRadiusMeters,
  rideHeightMeters,
  modelOriginOffsetY,
  alignmentDebug,
  camberDeg,
  crownDeg
}: SandboxCanvasProps) {
  const [dpr, setDpr] = useState(1);
  const camberRadians = useMemo(() => MathUtils.degToRad(camberDeg), [camberDeg]);
  const crownTiltRadians = useMemo(() => MathUtils.degToRad(crownDeg) * 0.4, [crownDeg]);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio ?? 1, 1.5));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
    >
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
          {showTrack ? (
            <TrackSurface camberDeg={camberDeg} crownDeg={crownDeg} />
          ) : (
            <mesh
              receiveShadow
              position={[0, GROUND_Y, 0]}
              rotation={[-Math.PI / 2 + camberRadians, 0, crownTiltRadians]}
            >
              <planeGeometry args={[40, 40]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          )}
          <Vehicle
            telemetry={telemetry}
            showTrack={showTrack}
            wheelRadiusMeters={wheelRadiusMeters}
            rideHeightMeters={rideHeightMeters}
            modelOriginOffsetY={modelOriginOffsetY}
            alignmentDebug={alignmentDebug}
            camberDeg={camberDeg}
            crownDeg={crownDeg}
          />
        </group>

        <ContactShadows
          position={[0, GROUND_Y + CONTACT_PATCH_OFFSET, 0]}
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
