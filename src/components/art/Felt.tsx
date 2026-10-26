import { cn } from "@/lib/cn";

export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Green baize under a hanging lamp. Fills its positioned parent. */
export function Felt({ className, glow = "50% 45%", rail = true }: { className?: string; glow?: string; rail?: boolean }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(130% 100% at ${glow}, #19a56b 0%, #0d6a45 38%, #06341f 78%, #03190f 100%)` }} />
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,250,220,0.22), rgba(255,250,220,0) 70%)" }} />
      {rail ? (
        <div
          className="absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 0 0 7px rgba(3,20,12,0.55), inset 0 0 48px rgba(0,0,0,0.5)" }}
        />
      ) : (
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
      )}
    </div>
  );
}
