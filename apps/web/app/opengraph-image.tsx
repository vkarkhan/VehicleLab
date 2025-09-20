import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a, #312e81)",
          color: "white"
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 6, textTransform: "uppercase", opacity: 0.7 }}>VehicleLab</div>
        <div style={{ fontSize: 64, fontWeight: 600, marginTop: 24 }}>3D Vehicle Dynamics Sandbox</div>
        <div style={{ fontSize: 24, marginTop: 12, opacity: 0.8 }}>
          Experiment with handling balance, tyre grip, and telemetry in real time.
        </div>
      </div>
    ),
    { ...size }
  );
}
