import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * 1500x500 X / Twitter header. Content is vertically centred and kept off the
 * bottom-left, where X overlays the profile avatar. Generated with the same
 * edge image tech as the OG card — download it at /x-banner.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(120deg, #0a0a0c 0%, #101018 55%, #0c160f 100%)",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#16161a",
              border: "2px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
              color: "#3ecf8e",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>Gambit</div>
        </div>

        <div style={{ marginTop: 26, fontSize: 62, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, display: "flex", flexDirection: "column" }}>
          <span>Play classic games.</span>
          <span>
            Win <span style={{ color: "#3ecf8e" }}>real money.</span>
          </span>
        </div>

        <div style={{ marginTop: 26, fontSize: 25, color: "#8b8b94" }}>
          Free to play · stake USDm &amp; $G · winner takes the pot · on Celo
        </div>
      </div>
    ),
    { width: 1500, height: 500 }
  );
}
