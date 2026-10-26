import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "radial-gradient(circle at 50% 35%, #123a2b 0%, #081019 55%, #05070c 100%)",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 48 48">
          <path d="M31 16.5 24 12.5l-11 6.3v11.4l11 6.3 11-6.3V24H25" fill="none" stroke="#3ee09b" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="24" cy="24" r="2.2" fill="#3ee09b" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
