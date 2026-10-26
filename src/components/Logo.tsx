import { cn } from "@/lib/cn";

/** The faceted G in Gambit green, lit from above. */
export function GambitMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="gm-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2533" />
          <stop offset="1" stopColor="#0b1018" />
        </linearGradient>
        <linearGradient id="gm-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8af7c8" />
          <stop offset="1" stopColor="#22c47f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#gm-tile)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" fill="none" stroke="rgba(255,255,255,0.12)" />
      <path
        d="M31 16.5 24 12.5l-11 6.3v11.4l11 6.3 11-6.3V24H25"
        fill="none"
        stroke="url(#gm-stroke)"
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="2.3" fill="#3ee09b" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <GambitMark size={32} className="shrink-0 drop-shadow-[0_6px_14px_rgba(62,224,155,0.25)]" />
      <span className="display truncate text-[22px] font-extrabold leading-none text-ink">Gambit</span>
    </span>
  );
}
