"use client";

import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { CanvasTexture, Color, MathUtils, RepeatWrapping, SRGBColorSpace } from "three";

import { VehicleRig } from "@/components/VehicleRig";
import { type PhysicsState, type Vector3Tuple } from "@/lib/kinematics";
import type { VehicleTelemetry } from "@/lib/physics";

const background = new Color("#e2e8f0");

const GROUND_Y = 0;
const CONTACT_SHADOW_OFFSET = 0.001;
const VEHICLE_WHEELBASE = 2.8;
const TRACK_FRONT = 1.6;
const TRACK_REAR = 1.6;
const ROAD_WIDTH = 16;
const ROAD_LENGTH = 64;
const LANE_STRIPE_WIDTH = 0.18;
const EDGE_STRIPE_WIDTH = 0.22;
const TEXTURE_REPEAT_X = 12;
const TEXTURE_REPEAT_Z = 24;
const VEGETATION_OFFSET = ROAD_WIDTH * 0.5 + 2.2;

const laneStripeOffsets = [-3.2, 0, 3.2];
const roadEdgeOffsets = [-ROAD_WIDTH * 0.5 + 0.6, ROAD_WIDTH * 0.5 - 0.6];

interface SandboxCanvasProps {
  telemetry: VehicleTelemetry;
  watermark: React.ReactNode;
  containerRef?: Ref<HTMLDivElement>;
  showTrack: boolean;
  wheelRadiusMeters: number;
  rideHeightMeters: number;
  alignmentDebug: boolean;
  camberDeg: number;
  crownDeg: number;
  vehicleSpeedMps: number;
  frontWeightDistribution: number;
}

interface RoadSurfaceProps {
  groundY: number;
  rotation: Vector3Tuple;
}

function buildAsphaltTextures(): { color: CanvasTexture; normal: CanvasTexture } | null {
  if (typeof document === "undefined") return null;

  const size = 256;
  const createCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    return canvas;
  };

  const colorCanvas = createCanvas();
  const colorCtx = colorCanvas.getContext("2d");
  if (!colorCtx) return null;
  const base = [46, 51, 57];
  const noiseStrength = 20;
  const colorData = colorCtx.createImageData(size, size);
  for (let i = 0; i < colorData.data.length; i += 4) {
    const noise = Math.random() * noiseStrength - noiseStrength / 2;
    colorData.data[i] = base[0] + noise;
    colorData.data[i + 1] = base[1] + noise;
    colorData.data[i + 2] = base[2] + noise;
    colorData.data[i + 3] = 255;
  }
  colorCtx.putImageData(colorData, 0, 0);

  const normalCanvas = createCanvas();
  const normalCtx = normalCanvas.getContext("2d");
  if (!normalCtx) return null;
  const normalData = normalCtx.createImageData(size, size);
  for (let i = 0; i < normalData.data.length; i += 4) {
    const nx = 128 + Math.random() * 10 - 5;
    const ny = 128 + Math.random() * 10 - 5;
    normalData.data[i] = nx;
    normalData.data[i + 1] = ny;
    normalData.data[i + 2] = 255;
    normalData.data[i + 3] = 255;
  }
  normalCtx.putImageData(normalData, 0, 0);

  const colorTexture = new CanvasTexture(colorCanvas);
  colorTexture.wrapS = RepeatWrapping;
  colorTexture.wrapT = RepeatWrapping;
  colorTexture.repeat.set(TEXTURE_REPEAT_X, TEXTURE_REPEAT_Z);
  colorTexture.colorSpace = SRGBColorSpace;
  colorTexture.needsUpdate = true;

  const normalTexture = new CanvasTexture(normalCanvas);
  normalTexture.wrapS = RepeatWrapping;
  normalTexture.wrapT = RepeatWrapping;
  normalTexture.repeat.copy(colorTexture.repeat);
  normalTexture.needsUpdate = true;

  return { color: colorTexture, normal: normalTexture };
}

function RoadSurface({ groundY, rotation }: RoadSurfaceProps) {
  const textures = useMemo(buildAsphaltTextures, []);
  const colorTexture = textures?.color;
  const normalTexture = textures?.normal;

  useEffect(() => {
    if (!textures) return;
    const { color, normal } = textures;
    color.anisotropy = 4;
    normal.anisotropy = 2;
    return () => {
      color.dispose();
      normal.dispose();
    };
  }, [textures]);

  return (
    <group position={[0, groundY, 0]} rotation={rotation}>
      <mesh receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial
          color="#1f2733"
          map={colorTexture ?? undefined}
          normalMap={normalTexture ?? undefined}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {laneStripeOffsets.map((offset) => (
        <mesh key={"lane-" + offset} position={[offset, 0.002, 0]}>
          <planeGeometry args={[LANE_STRIPE_WIDTH, ROAD_LENGTH * 0.92]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.7} roughness={0.65} />
        </mesh>
      ))}

      {roadEdgeOffsets.map((offset) => (
        <mesh key={"edge-" + offset} position={[offset, 0.001, 0]}>
          <planeGeometry args={[EDGE_STRIPE_WIDTH, ROAD_LENGTH]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function RoadsideVegetation({ groundY }: { groundY: number }) {
  const clusters = useMemo(() => {
    const positions: { x: number; z: number; scale: number }[] = [];
    const countPerSide = 6;
    const spacing = ROAD_LENGTH / (countPerSide + 1);
    const pseudoRandom = (seed: number) => (Math.sin(seed * 47.123) + 1) * 0.5;

    for (const side of [-1, 1]) {
      for (let index = 0; index < countPerSide; index += 1) {
        const z = -ROAD_LENGTH / 2 + spacing * (index + 1);
        const jitter = pseudoRandom(index + (side === -1 ? 10 : 20));
        const x = side * (VEGETATION_OFFSET + jitter * 1.4);
        const scale = 0.7 + 0.5 * pseudoRandom(index + (side === -1 ? 30 : 40));
        positions.push({ x, z, scale });
      }
    }

    return positions;
  }, []);

  return (
    <group position={[0, groundY, 0]}>
      {clusters.map(({ x, z, scale }, index) => (
        <group key={"veg-" + index} position={[x, 0, z]} scale={scale}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <coneGeometry args={[0.6, 2.6, 6]} />
            <meshStandardMaterial color="#166534" roughness={0.5} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} metalness={0.1} />
          </mesh>
        </group>
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
  alignmentDebug,
  camberDeg,
  crownDeg,
  vehicleSpeedMps,
  frontWeightDistribution
}: SandboxCanvasProps) {
  const [dpr, setDpr] = useState(1);
  const [pose, setPose] = useState(() => ({ x: 0, z: 0, psi: 0, phi: 0 }));
  const lastUpdateRef = useRef<number | null>(null);
  const camberRadians = useMemo(() => MathUtils.degToRad(camberDeg), [camberDeg]);
  const crownRadians = useMemo(() => MathUtils.degToRad(crownDeg), [crownDeg]);
  const groundRotation = useMemo(
    () => [-Math.PI / 2 + camberRadians, 0, crownRadians] as Vector3Tuple,
    [camberRadians, crownRadians]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDpr(Math.min(window.devicePixelRatio ?? 1, 1.5));
  }, []);

  useEffect(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const last = lastUpdateRef.current ?? now;
    const dt = Math.min((now - last) / 1000, 0.05);
    lastUpdateRef.current = now;

    if (dt > 0) {
      setPose((prev) => {
        const nextPsi = prev.psi + telemetry.yawRate * dt;
        const nextPhi = telemetry.lateralAcceleration * -0.02;
        const timeScale = dt > 0 ? dt / 0.016 : 1;
        const nextX = prev.x + Math.sin(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
        const nextZ = prev.z + Math.cos(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
        return { x: nextX, z: nextZ, psi: nextPsi, phi: nextPhi };
      });
    }
  }, [telemetry]);

  const frontDistance = useMemo(() => frontWeightDistribution * VEHICLE_WHEELBASE, [frontWeightDistribution]);
  const rearDistance = useMemo(() => VEHICLE_WHEELBASE - frontDistance, [frontDistance]);

  const physicsState = useMemo<PhysicsState>(
    () => ({
      x: pose.x,
      z: pose.z,
      psi: pose.psi,
      phi: pose.phi,
      hRide: rideHeightMeters,
      wheelbase: VEHICLE_WHEELBASE,
      a: frontDistance,
      b: rearDistance,
      trackF: TRACK_FRONT,
      trackR: TRACK_REAR,
      wheelRadius: wheelRadiusMeters,
      steer: telemetry.steeringAngle,
      groundY: GROUND_Y
    }),
    [frontDistance, pose.phi, pose.psi, pose.x, pose.z, rearDistance, rideHeightMeters, telemetry.steeringAngle, wheelRadiusMeters]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
    >
      <Canvas shadows dpr={dpr} gl={{ antialias: true }}>
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 18, 80]} />
        <PerspectiveCamera makeDefault position={[7, 4.5, 7]} fov={40} />

        <ambientLight intensity={0.35} />
        <directionalLight
          position={[12, 14, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00025}
        />

        <Environment preset="sunset" />

        <RoadSurface groundY={GROUND_Y} rotation={groundRotation} />
        <RoadsideVegetation groundY={GROUND_Y} />

        <VehicleRig
          state={physicsState}
          alignmentDebug={alignmentDebug}
          showTrack={showTrack}
          groundRotation={groundRotation}
          vehicleSpeedMps={vehicleSpeedMps}
        />

        <ContactShadows
          position={[0, GROUND_Y + CONTACT_SHADOW_OFFSET, 0]}
          rotation={groundRotation}
          opacity={0.75}
          scale={16}
          blur={1.5}
          far={20}
        />

        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.15} />
      </Canvas>
      {watermark}
    </div>
  );
}
