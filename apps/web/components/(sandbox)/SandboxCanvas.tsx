"use client";

import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { Color, MathUtils } from "three";

import { deriveKinematics, type PhysicsState, type WheelId, type Vector3Tuple } from "@/lib/kinematics";
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
  vehicleSpeedMps: number;
  frontWeightDistribution: number;
}

const background = new Color("#e2e8f0");

const GROUND_Y = 0;
const CONTACT_PATCH_OFFSET = 0.001;
const CLEARANCE_THRESHOLD = 1e-3;
const WHEEL_WIDTH = 0.32;
const DEBUG_SPHERE_RADIUS = 0.045;
const GUIDE_LINE_THICKNESS = 0.015;
const VEHICLE_WHEELBASE = 2.8;
const TRACK_FRONT = 1.6;
const TRACK_REAR = 1.6;

const wheelMeta: Record<WheelId, { axle: "front" | "rear" }> = {
  frontLeft: { axle: "front" },
  frontRight: { axle: "front" },
  rearLeft: { axle: "rear" },
  rearRight: { axle: "rear" }
};

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
  rideHeightMeters: number;
  wheelRadiusMeters: number;
  modelOriginOffsetY: number;
  alignmentDebug: boolean;
  groundRotation: Vector3Tuple;
  vehicleSpeedMps: number;
  frontWeightDistribution: number;
}

function Vehicle({
  telemetry,
  showTrack,
  rideHeightMeters,
  wheelRadiusMeters,
  modelOriginOffsetY,
  alignmentDebug,
  groundRotation,
  vehicleSpeedMps,
  frontWeightDistribution
}: VehicleProps) {
  const [pose, setPose] = useState(() => ({ x: 0, z: 0, psi: 0, phi: 0 }));
  const [wheelRotation, setWheelRotation] = useState(0);
  const lastUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const last = lastUpdateRef.current ?? now;
    const dt = Math.min((now - last) / 1000, 0.05);
    lastUpdateRef.current = now;

    if (dt > 0) {
      const angularVelocity = vehicleSpeedMps / Math.max(wheelRadiusMeters, 1e-3);
      setWheelRotation((prev) => MathUtils.euclideanModulo(prev + angularVelocity * dt, Math.PI * 2));
    }

    setPose((prev) => {
      const nextPsi = prev.psi + telemetry.yawRate * dt;
      const nextPhi = telemetry.lateralAcceleration * -0.02;
      const timeScale = dt > 0 ? dt / 0.016 : 1;
      const nextX = prev.x + Math.sin(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
      const nextZ = prev.z + Math.cos(nextPsi) * telemetry.lateralAcceleration * 0.002 * timeScale;
      return { x: nextX, z: nextZ, psi: nextPsi, phi: nextPhi };
    });
  }, [telemetry, vehicleSpeedMps, wheelRadiusMeters]);

  const { x, z, psi, phi } = pose;
  const steeringAngle = telemetry.steeringAngle;

  const physicsState = useMemo<PhysicsState>(() => {
    const frontDistance = frontWeightDistribution * VEHICLE_WHEELBASE;
    const rearDistance = VEHICLE_WHEELBASE - frontDistance;
    return {
      x,
      z,
      psi,
      phi,
      hRide: rideHeightMeters,
      wheelbase: VEHICLE_WHEELBASE,
      a: frontDistance,
      b: rearDistance,
      trackF: TRACK_FRONT,
      trackR: TRACK_REAR,
      wheelRadius: wheelRadiusMeters,
      steer: steeringAngle,
      groundY: GROUND_Y
    };
  }, [frontWeightDistribution, phi, psi, rideHeightMeters, steeringAngle, wheelRadiusMeters, x, z]);

  const kinematics = useMemo(() => deriveKinematics(physicsState), [physicsState]);
  const chassisHeight = kinematics.body.position[1] - kinematics.groundY + modelOriginOffsetY;
  const clearanceBaseline = kinematics.groundY + kinematics.wheelRadius;

  return (
    <group>
      <group position={[kinematics.body.position[0], kinematics.groundY, kinematics.body.position[2]]} rotation={[0, kinematics.body.yaw, 0]}>
        <group position={[0, chassisHeight, 0]} rotation={[kinematics.body.roll, 0, 0]}>
          <PrimitiveCar />
        </group>
      </group>

      {(Object.entries(kinematics.wheels) as [WheelId, Vector3Tuple][]).map(([id, center]) => {
        const axle = wheelMeta[id].axle;
        const steering = axle === "front" ? kinematics.steer : 0;
        const clearance = center[1] - clearanceBaseline;
        const debugColor = clearance < -CLEARANCE_THRESHOLD ? "#ef4444" : "#22c55e";
        const contactPatchPosition: Vector3Tuple = [center[0], kinematics.contactPatchY, center[2]];

        return (
          <group key={id}>
            <group position={center}>
              <group rotation={[0, steering, 0]}>
                <mesh castShadow rotation={[wheelRotation, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[kinematics.wheelRadius, kinematics.wheelRadius, WHEEL_WIDTH, 24]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.4} />
                </mesh>
              </group>
            </group>

            {showTrack ? (
              <mesh position={contactPatchPosition} rotation={groundRotation}>
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
                <mesh position={[center[0], kinematics.groundY, center[2]]} rotation={groundRotation}>
                  <planeGeometry args={[0.2, GUIDE_LINE_THICKNESS]} />
                  <meshBasicMaterial color={debugColor} transparent opacity={debugColor === "#ef4444" ? 0.85 : 0.6} />
                </mesh>
              </group>
            ) : null}
          </group>
        );
      })}

      {alignmentDebug ? (
        <mesh position={[0, kinematics.groundY, 0]} rotation={groundRotation}>
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
  const crownRadians = MathUtils.degToRad(crownDeg);

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
  crownDeg,
  vehicleSpeedMps,
  frontWeightDistribution
}: SandboxCanvasProps) {
  const [dpr, setDpr] = useState(1);
  const camberRadians = useMemo(() => MathUtils.degToRad(camberDeg), [camberDeg]);
  const crownRadians = useMemo(() => MathUtils.degToRad(crownDeg), [crownDeg]);
  const groundRotation = useMemo(() => [-Math.PI / 2 + camberRadians, 0, crownRadians] as Vector3Tuple, [camberRadians, crownRadians]);

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

        <group>
          {showTrack ? (
            <TrackSurface camberDeg={camberDeg} crownDeg={crownDeg} />
          ) : (
            <mesh receiveShadow position={[0, GROUND_Y, 0]} rotation={groundRotation}>
              <planeGeometry args={[40, 40]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          )}
          <Vehicle
            telemetry={telemetry}
            showTrack={showTrack}
            rideHeightMeters={rideHeightMeters}
            wheelRadiusMeters={wheelRadiusMeters}
            modelOriginOffsetY={modelOriginOffsetY}
            alignmentDebug={alignmentDebug}
            groundRotation={groundRotation}
            vehicleSpeedMps={vehicleSpeedMps}
            frontWeightDistribution={frontWeightDistribution}
          />
        </group>

        <ContactShadows
          position={[0, GROUND_Y + CONTACT_PATCH_OFFSET, 0]}
          rotation={groundRotation}
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
