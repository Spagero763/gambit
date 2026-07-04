// Gambit's shared motion language, so every animation feels like one system.
// Transform and opacity only, tuned to hold 60fps on low-end Android (the
// MiniPay audience). No blur or shadow animation on hot paths.

/** Smooth "settle" curve for enters and layout shifts. */
export const ease = [0.22, 1, 0.36, 1] as const;

/** Named springs for interactions. */
export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 24 } as const,
  snappy: { type: "spring", stiffness: 420, damping: 30 } as const,
  bouncy: { type: "spring", stiffness: 500, damping: 18 } as const,
};

/** Durations in seconds. */
export const duration = {
  fast: 0.18,
  base: 0.3,
  slow: 0.5,
};

/** Press feedback for anything tappable. */
export const press = { scale: 0.96 };
