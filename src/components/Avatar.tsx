import { Bot } from "@/lib/bots";
import { cn } from "@/lib/cn";

/**
 * User / generic avatar. Shows an uploaded photo when present, otherwise a
 * solid colour tile with an initial.
 */
export function Avatar({
  image,
  color = "#3ecf8e",
  name,
  size = 40,
  rounded = "rounded-xl",
  className,
}: {
  image?: string;
  color?: string;
  name?: string;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const initial = (name || "G").trim().slice(0, 1).toUpperCase();
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name || "avatar"}
        width={size}
        height={size}
        className={cn("object-cover", rounded, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn("grid place-items-center font-semibold text-void", rounded, className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

/** A simple, friendly illustrated face for bot opponents. */
export function BotFace({ bot, size = 40, rounded = "rounded-xl", className }: { bot: Bot; size?: number; rounded?: string; className?: string }) {
  return (
    <span className={cn("inline-block overflow-hidden", rounded, className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <rect width="100" height="100" fill={bot.bg} />
        {/* shoulders */}
        <circle cx="50" cy="104" r="34" fill="rgba(0,0,0,0.18)" />
        {/* neck */}
        <rect x="43" y="64" width="14" height="16" rx="6" fill={bot.skin} />
        {/* head */}
        <ellipse cx="50" cy="50" rx="22" ry="24" fill={bot.skin} />
        {/* ears */}
        <circle cx="27" cy="52" r="4" fill={bot.skin} />
        <circle cx="73" cy="52" r="4" fill={bot.skin} />
        {/* hair */}
        <Hair style={bot.style} color={bot.hair} />
        {/* eyes */}
        <circle cx="42" cy="50" r="2.6" fill="#1b1b22" />
        <circle cx="58" cy="50" r="2.6" fill="#1b1b22" />
        {/* brows */}
        <path d="M38 44 q4 -2 8 0" stroke={bot.hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M54 44 q4 -2 8 0" stroke={bot.hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* smile */}
        <path d="M43 60 q7 6 14 0" stroke="#7a3b3b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Hair({ style, color }: { style: 0 | 1 | 2; color: string }) {
  if (style === 0) {
    // short crop
    return <path d="M28 46 q0 -26 22 -26 q22 0 22 26 q-6 -12 -22 -12 q-16 0 -22 12 Z" fill={color} />;
  }
  if (style === 1) {
    // very short / fade
    return (
      <path d="M30 44 q2 -22 20 -22 q18 0 20 22 q-5 -8 -20 -8 q-15 0 -20 8 Z" fill={color} />
    );
  }
  // longer, framing the face
  return (
    <g fill={color}>
      <path d="M27 48 q-1 -28 23 -28 q24 0 23 28 q-7 -14 -23 -14 q-16 0 -23 14 Z" />
      <path d="M27 48 q-3 14 -1 24 q3 -6 4 -14 Z" />
      <path d="M73 48 q3 14 1 24 q-3 -6 -4 -14 Z" />
    </g>
  );
}
