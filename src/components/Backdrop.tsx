/**
 * Ambient backdrop. Intentionally quiet: a solid near-black base with one
 * faint, static wash at the top so the page has depth without the animated
 * aurora / particle noise. Sits behind all content.
 */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-void">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 0%, rgba(62,207,142,0.06), transparent 70%)",
        }}
      />
    </div>
  );
}
