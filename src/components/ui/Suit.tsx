// The five Whot suits are Gambit's visual alphabet: tab icons, avatars,
// loaders and rank marks are all drawn from them.

export type SuitName = "circle" | "triangle" | "cross" | "square" | "star";
export const SUITS: SuitName[] = ["circle", "triangle", "cross", "square", "star"];

export function suitPath(s: SuitName): JSX.Element {
  switch (s) {
    case "circle":
      return <circle cx="12" cy="12" r="8.2" />;
    case "triangle":
      return <path d="M12 3.6 20.6 19H3.4z" />;
    case "cross":
      return <path d="M9.2 3.5h5.6v5.7h5.7v5.6h-5.7v5.7H9.2v-5.7H3.5V9.2h5.7z" />;
    case "square":
      return <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="1.6" />;
    case "star":
      return <path d="m12 3.2 2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.1-5.3 3.1 1.3-6-4.6-4.1 6.1-.6z" />;
  }
}

export function Suit({
  name,
  size = 20,
  filled = true,
  className,
  strokeWidth = 1.8,
}: {
  name: SuitName;
  size?: number;
  filled?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden
    >
      {suitPath(name)}
    </svg>
  );
}

/** Stable suit for an address, so a player always wears the same mark. */
export function suitFor(seed?: string | null): SuitName {
  if (!seed) return "circle";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SUITS[h % SUITS.length];
}
