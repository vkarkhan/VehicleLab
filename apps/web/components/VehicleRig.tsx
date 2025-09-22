"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import { Euler, Mesh, Object3D, Quaternion, Vector3 } from "three";

import {
  deriveKinematics,
  type PhysicsState,
  type Vector3Tuple,
  type WheelId
} from "@/lib/kinematics";

type VehicleRigState = Pick<
  PhysicsState,
  "x" | "z" | "psi" | "phi" | "hRide" | "wheelRadius" | "a" | "b" | "trackF" | "trackR" | "steer" | "groundY"
>;

interface VehicleRigProps {
  state: VehicleRigState;
  alignmentDebug: boolean;
  showTrack: boolean;
  groundRotation: Vector3Tuple;
  vehicleSpeedMps: number;
}

const WHEEL_WIDTH = 0.32;
const WHEEL_SEGMENTS = 28;
const AXLE_RADIUS = 0.05;
const AXLE_SEGMENTS = 18;
const DEBUG_SPHERE_RADIUS = 0.05;
const CLEARANCE_THRESHOLD = -0.001;
const CONTACT_PATCH_SIZE: Vector3Tuple = [0.62, 0.001, 0.36];
const GUIDE_LINE_EXTENT = 12;
const BODY_DIMENSIONS: Vector3Tuple = [1.9, 0.6, 4.4];
const CABIN_DIMENSIONS: Vector3Tuple = [1.4, 0.5, 1.6];
const CABIN_OFFSET: Vector3Tuple = [0, 0.55, -0.2];
const BODY_COLOR = "#334155";
const CABIN_COLOR = "#1f2937";
const WHEEL_COLOR = "#111827";

const UP_AXIS = new Vector3(0, 1, 0);
const FORWARD_AXIS = new Vector3(0, 0, 1);

interface WheelComputed {
  id: WheelId;
  position: Vector3Tuple;
  clearance: number;
  axle: "front" | "rear";
  side: "left" | "right";
  worldVector: Vector3;
}

interface AxleComputed {
  position: Vector3Tuple;
  quaternion: Quaternion;
  length: number;
}

type VehicleModelGLTF = GLTF & {
  nodes: Record<string, Object3D>;
};

const wheelOrdering: WheelId[] = ["frontLeft", "frontRight", "rearLeft", "rearRight"];

const wheelMeta: Record<WheelId, { axle: "front" | "rear"; side: "left" | "right" }> = {
  frontLeft: { axle: "front", side: "left" },
  frontRight: { axle: "front", side: "right" },
  rearLeft: { axle: "rear", side: "left" },
  rearRight: { axle: "rear", side: "right" }
};

function vectorToTuple(vector: Vector3): Vector3Tuple {
  return [vector.x, vector.y, vector.z];
}

function VehicleBodyPrimitive() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={BODY_DIMENSIONS} />
        <meshStandardMaterial color={BODY_COLOR} metalness={0.15} roughness={0.55} />
      </mesh>
      <mesh castShadow position={CABIN_OFFSET}>
        <boxGeometry args={CABIN_DIMENSIONS} />
        <meshStandardMaterial color={CABIN_COLOR} metalness={0.2} roughness={0.4} />
      </mesh>
    </group>
  );
}

function WheelPrimitive({ radius }: { radius: number }) {
  return (
    <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, WHEEL_WIDTH, WHEEL_SEGMENTS]} />
      <meshStandardMaterial color={WHEEL_COLOR} metalness={0.2} roughness={0.45} />
    </mesh>
  );
}

interface VehicleModelWheelProps {
  radius: number;
  wheelId: WheelId;
}

function VehicleModelWheel({ radius, wheelId }: VehicleModelWheelProps) {
  const result = useGLTF("/models/vehicle.glb") as VehicleModelGLTF;
  // Models are expected to have wheel pivots centred on the hubs so we can reuse the rig transforms.
  const wheelNames = [
    wheelId,
    wheelId.toUpperCase(),
    wheelId.replace("front", "Front").replace("rear", "Rear"),
    wheelId.replace("Left", "_L").replace("Right", "_R")
  ];
  const wheelNode = wheelNames.map((name) => result.nodes[name]).find(Boolean);
  if (!(wheelNode instanceof Mesh)) {
    return <WheelPrimitive radius={radius} />;
  }
  const wheel = wheelNode.clone();
  wheel.scale.setScalar(radius);
  return <primitive object={wheel} rotation={[0, 0, Math.PI / 2]} />;
}

interface VehicleModelBodyProps {
  bodyScale: number;
}

function VehicleModelBody({ bodyScale }: VehicleModelBodyProps) {
  const result = useGLTF("/models/vehicle.glb") as VehicleModelGLTF;
  // The vehicle body mesh should be authored with its pivot at the sprung mass reference (0,0,0).
  const bodyNode =
    result.nodes.Body || result.nodes.body || result.nodes.Chassis || result.nodes.Chassis001 || null;
  if (!(bodyNode instanceof Mesh)) {
    return <VehicleBodyPrimitive />;
  }
  const body = bodyNode.clone();
  body.scale.setScalar(bodyScale);
  return <primitive object={body} />;
}

export function VehicleRig({ state, alignmentDebug, showTrack, groundRotation, vehicleSpeedMps }: VehicleRigProps) {
  const [modelAvailable, setModelAvailable] = useState(false);
  const [assetChecked, setAssetChecked] = useState(false);
  const wheelSpinRefs = useRef<Record<WheelId, Object3D | null>>({
    frontLeft: null,
    frontRight: null,
    rearLeft: null,
    rearRight: null
  });

  useEffect(() => {
    if (assetChecked) return;
    let cancelled = false;
    fetch("/models/vehicle.glb", { method: "HEAD" })
      .then((response) => {
        if (!cancelled) {
          setModelAvailable(response.ok);
          setAssetChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelAvailable(false);
          setAssetChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [assetChecked]);

  useFrame((_, delta) => {
    const angularVelocity = vehicleSpeedMps / Math.max(state.wheelRadius, 1e-3);
    if (angularVelocity === 0) return;
    const deltaRotation = angularVelocity * delta;
    if (deltaRotation === 0) return;
    wheelOrdering.forEach((id) => {
      const group = wheelSpinRefs.current[id];
      if (group) {
        group.rotateX(deltaRotation);
      }
    });
  });

  const rig = useMemo(() => {
    const physicsInput: PhysicsState = {
      ...state,
      wheelbase: state.a + state.b
    };
    const kinematics = deriveKinematics(physicsInput);

    const yawQuat = new Quaternion().setFromAxisAngle(UP_AXIS, state.psi);
    const rollQuat = new Quaternion().setFromAxisAngle(FORWARD_AXIS, state.phi);
    const bodyQuaternion = yawQuat.clone().multiply(rollQuat);
    const bodyEuler = new Euler().setFromQuaternion(bodyQuaternion, "XYZ");
    const bodyRotation: Vector3Tuple = [bodyEuler.x, bodyEuler.y, bodyEuler.z];
    const bodyPositionVector = new Vector3().fromArray(kinematics.body.position);

    const halfTrackFront = state.trackF * 0.5;
    const halfTrackRear = state.trackR * 0.5;

    const localOffsets: Record<WheelId, Vector3> = {
      frontLeft: new Vector3(-halfTrackFront, -state.hRide, state.a),
      frontRight: new Vector3(halfTrackFront, -state.hRide, state.a),
      rearLeft: new Vector3(-halfTrackRear, -state.hRide, -state.b),
      rearRight: new Vector3(halfTrackRear, -state.hRide, -state.b)
    };

    const wheelData: Record<WheelId, WheelComputed> = {
      frontLeft: { id: "frontLeft", position: [0, 0, 0], clearance: 0, axle: "front", side: "left", worldVector: new Vector3() },
      frontRight: { id: "frontRight", position: [0, 0, 0], clearance: 0, axle: "front", side: "right", worldVector: new Vector3() },
      rearLeft: { id: "rearLeft", position: [0, 0, 0], clearance: 0, axle: "rear", side: "left", worldVector: new Vector3() },
      rearRight: { id: "rearRight", position: [0, 0, 0], clearance: 0, axle: "rear", side: "right", worldVector: new Vector3() }
    };

    wheelOrdering.forEach((id) => {
      const rolled = localOffsets[id].clone().applyQuaternion(rollQuat);
      const worldOffset = rolled.clone().applyQuaternion(yawQuat);
      const worldPosition = bodyPositionVector.clone().add(worldOffset);
      const clearance = worldPosition.y - (state.groundY + state.wheelRadius);
      wheelData[id] = {
        id,
        position: vectorToTuple(worldPosition),
        clearance,
        axle: wheelMeta[id].axle,
        side: wheelMeta[id].side,
        worldVector: worldPosition
      };
    });

    const buildAxle = (left: WheelId, right: WheelId): AxleComputed => {
      const leftVec = wheelData[left].worldVector;
      const rightVec = wheelData[right].worldVector;
      const midpoint = leftVec.clone().add(rightVec).multiplyScalar(0.5);
      const span = rightVec.clone().sub(leftVec);
      const length = span.length();
      const direction = span.clone().normalize();
      const quaternion = new Quaternion().setFromUnitVectors(UP_AXIS, direction);
      return {
        position: vectorToTuple(midpoint),
        quaternion,
        length
      };
    };

    const axles: Record<"front" | "rear", AxleComputed> = {
      front: buildAxle("frontLeft", "frontRight"),
      rear: buildAxle("rearLeft", "rearRight")
    };

    return {
      kinematics,
      bodyPosition: vectorToTuple(bodyPositionVector),
      bodyRotation,
      wheelData,
      axles
    };
  }, [state]);

  const contactPatchY = rig.kinematics.contactPatchY;
  const guideRotation = useMemo(
    () => [groundRotation[0], state.psi, groundRotation[2]] as Vector3Tuple,
    [groundRotation, state.psi]
  );

  return (
    <group>
      {alignmentDebug ? (
        <mesh position={[state.x, state.groundY, state.z]} rotation={guideRotation}>
          <planeGeometry args={[GUIDE_LINE_EXTENT, 0.05]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} />
        </mesh>
      ) : null}

      {Object.entries(rig.axles).map(([axleName, { position, quaternion, length }]) => (
        <mesh key={axleName} position={position} quaternion={quaternion}>
          <cylinderGeometry args={[AXLE_RADIUS, AXLE_RADIUS, length, AXLE_SEGMENTS]} />
          <meshStandardMaterial color="#475569" metalness={0.2} roughness={0.4} />
        </mesh>
      ))}

      <group position={rig.bodyPosition} rotation={rig.bodyRotation}>
        {modelAvailable ? <VehicleModelBody bodyScale={1} /> : <VehicleBodyPrimitive />}
      </group>

      {wheelOrdering.map((id) => {
        const wheel = rig.wheelData[id];
        const steer = wheel.axle === "front" ? state.steer : 0;
        const clearanceColor = wheel.clearance < CLEARANCE_THRESHOLD ? "#ef4444" : "#22c55e";

        return (
          <group key={id} position={wheel.position}>
            <group rotation={rig.bodyRotation}>
              <group rotation={[0, steer, 0]}>
                <group
                  ref={(node) => {
                    wheelSpinRefs.current[id] = node ?? null;
                  }}
                >
                  {modelAvailable ? (
                    <VehicleModelWheel wheelId={id} radius={state.wheelRadius} />
                  ) : (
                    <WheelPrimitive radius={state.wheelRadius} />
                  )}
                </group>
              </group>
            </group>

            {showTrack ? (
              <mesh position={[0, contactPatchY - wheel.position[1], 0]} rotation={groundRotation}>
                <boxGeometry args={CONTACT_PATCH_SIZE} />
                <meshStandardMaterial
                  color={wheel.axle === "front" ? "#38bdf8" : "#f97316"}
                  transparent
                  opacity={0.35}
                  roughness={0.5}
                  metalness={0.05}
                />
              </mesh>
            ) : null}

            {alignmentDebug ? (
              <group>
                <mesh>
                  <sphereGeometry args={[DEBUG_SPHERE_RADIUS, 16, 16]} />
                  <meshStandardMaterial color={clearanceColor} />
                </mesh>
                <mesh position={[0, -(wheel.position[1] - state.groundY), 0]} rotation={groundRotation}>
                  <planeGeometry args={[0.2, 0.015]} />
                  <meshBasicMaterial color={clearanceColor} transparent opacity={0.65} />
                </mesh>
              </group>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
