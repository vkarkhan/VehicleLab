"use client";

import { ContactShadows, Environment, Html, Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import {
  CanvasTexture,
  Color,
  MathUtils,
  PerspectiveCamera as ThreePerspectiveCamera,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3
} from "three";

import { VehicleRig } from "@/components/VehicleRig";
import { deriveKinematics, type PhysicsState, type Vector3Tuple, type WheelId } from "@/lib/kinematics";
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
const SKID_MARK_LIFETIME_MS = 5000;
const MAX_SKID_MARKS = 240;
const SLIP_THRESHOLD_DEG = 8;
const UTIL_THRESHOLD = 0.55;
const BASELINE_LENGTH = 36;

const laneStripeOffsets = [-3.2, 0, 3.2];
const roadEdgeOffsets = [-ROAD_WIDTH * 0.5 + 0.6, ROAD_WIDTH * 0.5 - 0.6];

interface SandboxCanvasProps {
  telemetry: VehicleTelemetry;
  watermark: React.ReactNode;
  canvasRef?: Ref<HTMLCanvasElement>;
  showTrack: boolean;
  cameraMode: "chase" | "top" | "free";
  showForceArrows: boolean;
  showSkidMarks: boolean;
  showZeroSteerBaseline: boolean;
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

interface WheelVisual {
  id: WheelId;
  position: Vector3Tuple;
  direction: Vector3;
  length: number;
  color: string;
}

interface SkidMark {
  id: number;
  position: Vector3Tuple;
  rotation: number;
  opacity: number;
  color: string;
  createdAt: number;
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

function lerpColor(start: Color, end: Color, t: number) {
  const c = start.clone();
  c.lerp(end, Math.min(Math.max(t, 0), 1));
  return `#${c.getHexString()}`;
}


function slipToColor(slipRadians: number) {
  const start = new Color("#60a5fa");
  const end = new Color("#ef4444");
  const slipDeg = Math.abs(MathUtils.radToDeg(slipRadians));
  const normalized = Math.min(slipDeg / 30, 1);
  return lerpColor(start, end, normalized);
}

const wheelMeta: { id: WheelId; axle: "front" | "rear"; side: "left" | "right" }[] = [
  { id: "frontLeft", axle: "front", side: "left" },
  { id: "frontRight", axle: "front", side: "right" },
  { id: "rearLeft", axle: "rear", side: "left" },
  { id: "rearRight", axle: "rear", side: "right" }
];

type Pose = {
  x: number;
  z: number;
  psi: number;
  phi: number;
};

export function SandboxCanvas({
  telemetry,
  watermark,
  canvasRef,
  showTrack,
  cameraMode,
  showForceArrows,
  showSkidMarks,
  showZeroSteerBaseline,
  wheelRadiusMeters,
  rideHeightMeters,
  alignmentDebug,
  camberDeg,
  crownDeg,
  vehicleSpeedMps,
  frontWeightDistribution
}: SandboxCanvasProps) {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDpr(Math.min(window.devicePixelRatio ?? 1, 1.5));
  }, []);

  return (
    <Canvas
      ref={canvasRef}
      className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
      shadows
      dpr={dpr}
      gl={{ antialias: true }}
    >
      <Scene
        telemetry={telemetry}
        watermark={watermark}
        showTrack={showTrack}
        cameraMode={cameraMode}
        showForceArrows={showForceArrows}
        showSkidMarks={showSkidMarks}
        showZeroSteerBaseline={showZeroSteerBaseline}
        wheelRadiusMeters={wheelRadiusMeters}
        rideHeightMeters={rideHeightMeters}
        alignmentDebug={alignmentDebug}
        camberDeg={camberDeg}
        crownDeg={crownDeg}
        vehicleSpeedMps={vehicleSpeedMps}
        frontWeightDistribution={frontWeightDistribution}
      />
    </Canvas>
  );
}

interface SceneProps extends Omit<SandboxCanvasProps, "canvasRef"> {}

function Scene({
  telemetry,
  watermark,
  showTrack,
  cameraMode,
  showForceArrows,
  showSkidMarks,
  showZeroSteerBaseline,
  wheelRadiusMeters,
  rideHeightMeters,
  alignmentDebug,
  camberDeg,
  crownDeg,
  vehicleSpeedMps,
  frontWeightDistribution
}: SceneProps) {
  const [pose, setPose] = useState<Pose>({ x: 0, z: 0, psi: 0, phi: 0 });
  const poseRef = useRef<Pose>(pose);
  const skidMarksRef = useRef<SkidMark[]>([]);
  const skidMarkIdRef = useRef(0);
  const skidCooldownRef = useRef<Record<WheelId, number>>({
    frontLeft: 0,
    frontRight: 0,
    rearLeft: 0,
    rearRight: 0
  });
  const [skidMarks, setSkidMarks] = useState<SkidMark[]>([]);
  const lastUpdateRef = useRef<number | null>(null);
  const cameraRef = useRef<ThreePerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);

  const camberRadians = useMemo(() => MathUtils.degToRad(camberDeg), [camberDeg]);
  const crownRadians = useMemo(() => MathUtils.degToRad(crownDeg), [crownDeg]);
  const groundRotation = useMemo(
    () => [-Math.PI / 2 + camberRadians, 0, crownRadians] as Vector3Tuple,
    [camberRadians, crownRadians]
  );

  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  useEffect(() => {
    if (!showSkidMarks && skidMarksRef.current.length) {
      skidMarksRef.current = [];
      setSkidMarks([]);
    }
  }, [showSkidMarks]);

  useEffect(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const last = lastUpdateRef.current ?? now;
    const dt = Math.min((now - last) / 1000, 0.05);
    lastUpdateRef.current = now;
    if (dt <= 0) return;

    const prevPose = poseRef.current;
    const nextPsi = prevPose.psi + telemetry.yawRate * dt;
    const nextPhi = telemetry.lateralAcceleration * -0.02;
    const timeScale = dt > 0 ? dt / 0.016 : 1;
    const nextX = prevPose.x + Math.sin(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
    const nextZ = prevPose.z + Math.cos(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
    const nextPose = { x: nextX, z: nextZ, psi: nextPsi, phi: nextPhi };

    poseRef.current = nextPose;
    setPose(nextPose);

    if (showSkidMarks) {
      const physics: PhysicsState = {
        x: nextPose.x,
        z: nextPose.z,
        psi: nextPose.psi,
        phi: nextPose.phi,
        hRide: rideHeightMeters,
        wheelbase: VEHICLE_WHEELBASE,
        a: frontWeightDistribution * VEHICLE_WHEELBASE,
        b: VEHICLE_WHEELBASE - frontWeightDistribution * VEHICLE_WHEELBASE,
        trackF: TRACK_FRONT,
        trackR: TRACK_REAR,
        wheelRadius: wheelRadiusMeters,
        steer: telemetry.steeringAngle,
        groundY: GROUND_Y
      };
      const kin = deriveKinematics(physics);
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();

      const frontSlipDeg = Math.abs(MathUtils.radToDeg(telemetry.frontSlipAngle));
      const rearSlipDeg = Math.abs(MathUtils.radToDeg(telemetry.rearSlipAngle));

      const updateForWheel = (meta: { id: WheelId; axle: "front" | "rear" }) => {
        const slipDeg = meta.axle === "front" ? frontSlipDeg : rearSlipDeg;
        const utilization = meta.axle === "front" ? telemetry.frontUtilization : telemetry.rearUtilization;

        if (slipDeg < SLIP_THRESHOLD_DEG && utilization < UTIL_THRESHOLD) {
          return;
        }

        if (nowMs - skidCooldownRef.current[meta.id] < 90) {
          return;
        }
        skidCooldownRef.current[meta.id] = nowMs;

        const contact = kin.wheels[meta.id];
        const rotation = nextPose.psi;
        const opacity = 0.25 + utilization * 0.35;
        const color = utilization > 0.75 ? "#ef4444" : "#1f2937";

        skidMarksRef.current.push({
          id: skidMarkIdRef.current++,
          position: [contact[0], kin.contactPatchY, contact[2]],
          rotation,
          opacity,
          color,
          createdAt: nowMs
        });
      };

      wheelMeta.forEach(updateForWheel);

      if (skidMarksRef.current.length > MAX_SKID_MARKS) {
        skidMarksRef.current.splice(0, skidMarksRef.current.length - MAX_SKID_MARKS);
      }

      skidMarksRef.current = skidMarksRef.current.filter((mark) => nowMs - mark.createdAt <= SKID_MARK_LIFETIME_MS);
      setSkidMarks([...skidMarksRef.current]);
    }
  }, [
    telemetry,
    showSkidMarks,
    rideHeightMeters,
    wheelRadiusMeters,
    frontWeightDistribution
  ]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.enabled = cameraMode === "free";
  }, [cameraMode]);

  useFrame(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const controls = controlsRef.current;

    const target = new Vector3(poseRef.current.x, rideHeightMeters + 0.65, poseRef.current.z);

    if (cameraMode === "free") {
      if (controls) {
        controls.target.lerp(target, 0.12);
        controls.update();
      }
      return;
    }

    const yaw = poseRef.current.psi;
    const lateralOffset = new Vector3(Math.cos(yaw + Math.PI / 2), 0, Math.sin(yaw + Math.PI / 2));
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));

    let desired: Vector3;
    if (cameraMode === "top") {
      desired = target.clone().add(new Vector3(0, 11, 0.001));
    } else {
      desired = forward.clone().multiplyScalar(-6.4).add(lateralOffset.clone().multiplyScalar(0.25)).setY(0);
      desired.add(new Vector3(0, 2.8, 0));
      desired.add(target);
    }

    camera.position.lerp(desired, 0.1);
    camera.lookAt(target);

    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  });

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
    [
      frontDistance,
      pose.phi,
      pose.psi,
      pose.x,
      pose.z,
      rearDistance,
      rideHeightMeters,
      telemetry.steeringAngle,
      wheelRadiusMeters
    ]
  );

  const kinematics = useMemo(() => deriveKinematics(physicsState), [physicsState]);

  const lateralAxis = useMemo(
    () => new Vector3(Math.cos(pose.psi + Math.PI / 2), 0, Math.sin(pose.psi + Math.PI / 2)),
    [pose.psi]
  );
  const baselinePoints = useMemo(() => {
    if (!showZeroSteerBaseline) return [];
    const forward = new Vector3(Math.sin(pose.psi), 0, Math.cos(pose.psi));
    const points: Vector3Tuple[] = [];
    const step = BASELINE_LENGTH / 12;
    for (let i = 0; i <= 12; i += 1) {
      const offset = forward.clone().multiplyScalar(step * i);
      points.push([pose.x + offset.x, kinematics.contactPatchY, pose.z + offset.z]);
    }
    return points;
  }, [kinematics.contactPatchY, pose.psi, pose.x, pose.z, showZeroSteerBaseline]);

  const wheelVisuals = useMemo(() => {
    if (!showForceArrows) return [] as WheelVisual[];

    const visuals: WheelVisual[] = [];
    const frontForce = telemetry.frontAxleForce / 2;
    const rearForce = telemetry.rearAxleForce / 2;
    const frontUtil = telemetry.frontUtilization;
    const rearUtil = telemetry.rearUtilization;

    wheelMeta.forEach(({ id, axle, side }) => {
      const contact = kinematics.wheels[id];
      const axleForce = axle === "front" ? frontForce : rearForce;
      const utilization = axle === "front" ? frontUtil : rearUtil;
      const slip = axle === "front" ? telemetry.frontSlipAngle : telemetry.rearSlipAngle;

      const directionVector = lateralAxis.clone().multiplyScalar(Math.sign(axleForce || 1));
      const length = 0.25 + Math.min(Math.abs(axleForce) * 0.003 + utilization * 0.9, 2.4);
      const color = slipToColor(slip);

      const sideOffset = lateralAxis.clone().multiplyScalar(side === "left" ? 0.15 : -0.15);
      const position: Vector3Tuple = [
        contact[0] + sideOffset.x,
        kinematics.contactPatchY + 0.02,
        contact[2] + sideOffset.z
      ];

      visuals.push({ id, position, direction: directionVector, length, color });
    });

    return visuals;
  }, [
    kinematics.wheels,
    kinematics.contactPatchY,
    lateralAxis,
    showForceArrows,
    telemetry.frontAxleForce,
    telemetry.frontSlipAngle,
    telemetry.frontUtilization,
    telemetry.rearAxleForce,
    telemetry.rearSlipAngle,
    telemetry.rearUtilization
  ]);

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 18, 80]} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[7, 4.5, 7]} fov={40} />

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

      {showZeroSteerBaseline && baselinePoints.length ? (
        <Line points={baselinePoints} color="#38bdf8" lineWidth={2} transparent opacity={0.35} />
      ) : null}

      {showSkidMarks && skidMarks.length
        ? skidMarks.map((mark) => (
            <mesh key={mark.id} position={mark.position} rotation={[Math.PI / 2, 0, mark.rotation]}>
              <planeGeometry args={[0.32, 0.6]} />
              <meshStandardMaterial color={mark.color} transparent opacity={mark.opacity} />
            </mesh>
          ))
        : null}

      {showForceArrows
        ? wheelVisuals.map((visual) => {
            const orientation = new Quaternion().setFromUnitVectors(
              new Vector3(0, 1, 0),
              visual.direction.clone().normalize()
            );
            return (
              <group key={`force-${visual.id}`} position={visual.position} quaternion={orientation}>
                <mesh position={[0, visual.length * 0.5, 0]}>
                  <cylinderGeometry args={[0.05, 0.08, visual.length, 12]} />
                  <meshStandardMaterial color={visual.color} transparent opacity={0.9} />
                </mesh>
                <mesh position={[0, visual.length + 0.14, 0]}>
                  <coneGeometry args={[0.14, 0.28, 14]} />
                  <meshStandardMaterial color={visual.color} />
                </mesh>
              </group>
            );
          })
        : null}

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

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enabled={cameraMode === "free"}
        maxPolarAngle={cameraMode === "top" ? Math.PI / 1.95 : Math.PI / 2.15}
      />

      {watermark ? <Html fullscreen>{watermark}</Html> : null}
    </>
  );
}
