"use client";

/** Last resort if the root layout itself throws. Self-contained on purpose. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#05070c",
          color: "#f2f5f8",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong</p>
          <p style={{ marginTop: 8, color: "#9ba5b4", fontSize: 16 }}>Reload Gambit. Money in a match is safe in the contract.</p>
          <button
            onClick={reset}
            style={{ marginTop: 22, background: "#3ee09b", color: "#03140c", fontWeight: 700, border: 0, borderRadius: 999, padding: "14px 26px", fontSize: 16 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
