import { cn } from "@/lib/cn";

/** Geometric Gambit monogram: an open faceted "G" on a dark tile. Single accent. */
export function GambitMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#16161a" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
      />
      <g
        fill="none"
        stroke="#3ecf8e"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M31 16.5 L24 12.5 L13 18.8 L13 30.2 L24 36.5 L35 30.2 L35 24 L25 24" />
      </g>
      <circle cx="24" cy="24" r="2.2" fill="#3ecf8e" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <GambitMark size={32} />
      <span className="text-[19px] font-semibold tracking-tight text-ink">Gambit</span>
    </div>
  );
}
