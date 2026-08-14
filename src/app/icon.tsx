import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ fontSize: 64, fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>Grab</span>
        <span style={{ fontSize: 220, fontWeight: 700, color: "#f59e0b", lineHeight: 1 }}>{"&"}</span>
        <span style={{ fontSize: 64, fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>Gather</span>
      </div>
    ),
    { ...size }
  );
}
