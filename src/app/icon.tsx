import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// This is the icon Android/Chrome use, and Android masks it into a circle
// (or squircle, depending on launcher). A small centered glyph on a plain
// square looks like a tiny logo floating in a big dead-space circle once
// masked — so this fills the canvas edge to edge, keeping the glyph itself
// within the ~80%-diameter "safe zone" the maskable-icon spec guarantees
// stays visible regardless of the mask shape.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <span
          style={{
            fontSize: 360,
            fontWeight: 700,
            color: "#f59e0b",
            fontFamily: "sans-serif",
          }}
        >
          {"&"}
        </span>
      </div>
    ),
    { ...size }
  );
}
