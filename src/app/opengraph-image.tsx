import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Gambit — play classic games, stake USDm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social-share preview card, generated at the edge (no external fonts). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0c 0%, #101018 55%, #0c160f 100%)",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "#16161a",
              border: "2px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 800,
              color: "#3ecf8e",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Gambit</div>
        </div>

        <div style={{ marginTop: 56, fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900, display: "flex", flexDirection: "column" }}>
          <span>Play classic games.</span>
          <span>
            Back yourself for <span style={{ color: "#3ecf8e" }}>USDm.</span>
          </span>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
          {["Chess", "Naija Whot", "Tic-Tac-Toe", "Snakes", "Block Blitz"].map((g) => (
            <div
              key={g}
              style={{
                fontSize: 26,
                color: "#9a9aa3",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "10px 18px",
              }}
            >
              {g}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, fontSize: 28, color: "#646470" }}>Free vs the bot · stake 1v1 · winner takes the pot · settled on-chain</div>
      </div>
    ),
    { ...size }
  );
}
