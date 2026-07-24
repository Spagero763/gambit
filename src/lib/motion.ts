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

/**
 * Choreography. Luxury motion is not bigger animation, it is *ordered*
 * animation: a container leads, its children follow in sequence, and everything
 * settles on the same curve. Use `stagger` on a wrapper and `rise` on each child
 * and a screen assembles itself instead of just appearing.
 *
 *   <motion.div variants={stagger()} initial="hidden" animate="show">
 *     {items.map(x => <motion.div key={x} variants={rise}>…</motion.div>)}
 *   </motion.div>
 */
export const stagger = (each = 0.055, delay = 0.04) => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
});

/** A child that rises into place. Transform + opacity only — 60fps on cheap phones. */
export const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
};

/** A child that settles in with a little scale — for cards and tiles. */
export const settle = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

/** Press feedback for anything tappable. */
export const press = { scale: 0.96 };
