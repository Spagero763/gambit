"use client";

/** Last-resort boundary if the root layout itself throws. Minimal + self-contained. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0c",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <p style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</p>
          <p style={{ marginTop: 8, color: "#9a9aa3", fontSize: 14 }}>Please reload the app. Your funds are safe on-chain.</p>
          <button
            onClick={reset}
            style={{ marginTop: 20, background: "#3ecf8e", color: "#06120c", fontWeight: 650, border: 0, borderRadius: 14, padding: "12px 22px", fontSize: 14 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
