import { ImageResponse } from "next/og";

export const runtime = "edge";

// 1500x500 X header. Kept clear of the bottom-left, where X puts the avatar.
export async function GET() {
  const display = await fetch(new URL("../fonts/bricolage-800.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          padding: "0 110px",
          backgroundImage: "radial-gradient(circle at 85% 20%, #0f3a2a 0%, #081019 45%, #05070c 100%)",
          color: "#f2f5f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: "Bricolage", fontSize: 80, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
          <span>Think you&apos;d win?</span>
          <span style={{ display: "flex", color: "#9ba5b4" }}>
            Put money<span style={{ marginLeft: 18, color: "#3ee09b" }}>on it.</span>
          </span>
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#5f6878" }}>Naija Whot · Chess · Tic-tac-toe · Snakes & Ladders</div>
      </div>
    ),
    { width: 1500, height: 500, fonts: [{ name: "Bricolage", data: display, weight: 800, style: "normal" }] }
  );
}
