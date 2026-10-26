import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Gambit: think you'd win? Put money on it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CRIMSON = "#a3162e";
const GREEN = "#3ee09b";
const CARDS = [
  { n: "3", rot: -18, x: 0, shape: <circle cx="24" cy="24" r="18" fill={CRIMSON} /> },
  { n: "7", rot: -6, x: 120, shape: <path d="M24 5 43 41H5z" fill={CRIMSON} /> },
  { n: "20", rot: 6, x: 240, shape: null },
  { n: "5", rot: 18, x: 360, shape: <path d="m24 4 5.6 12.6 13.7 1.4-10.3 9.2 2.9 13.5L24 33.8l-11.9 6.9 2.9-13.5L4.7 18l13.7-1.4z" fill={CRIMSON} /> },
];

export default async function OpengraphImage() {
  // loaded here, not at module scope, so reading this file's metadata at build time doesn't fetch it
  const display = await fetch(new URL("./fonts/bricolage-800.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: "radial-gradient(circle at 15% 0%, #0f3a2a 0%, #081019 45%, #05070c 100%)",
          color: "#f2f5f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 680 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#101722", border: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="56" height="56" viewBox="0 0 48 48">
                <path d="M31 16.5 24 12.5l-11 6.3v11.4l11 6.3 11-6.3V24H25" fill="none" stroke={GREEN} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="24" cy="24" r="2.2" fill={GREEN} />
              </svg>
            </div>
            <div style={{ fontFamily: "Bricolage", fontSize: 44, fontWeight: 800, letterSpacing: -1.5 }}>Gambit</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 44, fontFamily: "Bricolage", fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>
            <span>Think you&apos;d win?</span>
            <span style={{ display: "flex", color: "#9ba5b4" }}>
              Put money<span style={{ marginLeft: 18, color: GREEN }}>on it.</span>
            </span>
          </div>
          <div style={{ marginTop: 22, fontSize: 28, color: "#9ba5b4" }}>Play free, or play a real person. Winner takes 95%.</div>
          <div style={{ marginTop: 26, fontSize: 24, color: "#5f6878" }}>Naija Whot · Chess · Tic-tac-toe · Snakes & Ladders</div>
        </div>
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 520,
            height: 630,
            backgroundImage: "radial-gradient(circle at 50% 55%, rgba(25,165,107,0.55) 0%, rgba(13,106,69,0.25) 40%, rgba(5,7,12,0) 70%)",
          }}
        >
          {CARDS.map((c) => (
            <div
              key={c.n}
              style={{
                position: "absolute",
                left: 40 + c.x,
                top: 190,
                width: 190,
                height: 270,
                borderRadius: 22,
                background: "#f6efe1",
                transform: `rotate(${c.rot}deg)`,
                display: "flex",
                flexDirection: "column",
                padding: 20,
                boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ fontFamily: "Bricolage", fontSize: 44, fontWeight: 800, color: CRIMSON }}>{c.n}</div>
              <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontFamily: "Bricolage", fontSize: 38, fontWeight: 800, color: CRIMSON }}>
                {c.shape ? (
                  <svg width="104" height="104" viewBox="0 0 48 48">
                    {c.shape}
                  </svg>
                ) : (
                  "WHOT"
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage", data: display, weight: 800, style: "normal" }] }
  );
}
