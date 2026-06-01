"use client";

import { Game } from "@/lib/games";

/** Compact line icons used in chips, nav and small contexts. No emoji. */
export function GameIcon({
  art,
  className,
}: {
  art: Game["art"];
  className?: string;
}) {
  const common = {
    className,
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (art) {
    case "chess":
      return (
        <svg {...common}>
          <path d="M9 21h6" />
          <path d="M8 18h8l-.7-4H8.7L8 18Z" />
          <path d="M9.5 14c-1.5-2 .5-3.2.5-5a2 2 0 1 1 4 0c0 1.8 2 3 .5 5" />
          <circle cx="12" cy="6.5" r=".4" fill="currentColor" />
        </svg>
      );
    case "xo":
      return (
        <svg {...common}>
          <path d="M4 4l5 5M9 4l-5 5" />
          <circle cx="16.5" cy="16.5" r="3.4" />
          <path d="M14 4h6M20 4v6" opacity=".5" />
        </svg>
      );
    case "snakes":
      return (
        <svg {...common}>
          <path d="M5 5v9M9 5v9M5 7h4M5 10h4" />
          <path d="M14 6c3 0 3 4 0 4s-3 4 0 4 3-3 5-3" />
          <circle cx="19" cy="17" r=".5" fill="currentColor" />
        </svg>
      );
    case "blocks":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.2" />
          <rect x="13" y="4" width="7" height="7" rx="1.2" opacity=".6" />
          <rect x="4" y="13" width="7" height="7" rx="1.2" opacity=".6" />
          <rect x="13" y="13" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "runner":
      return (
        <svg {...common}>
          <circle cx="14" cy="5.5" r="1.6" />
          <path d="M14 8l-2 4 2 2 1 4M12 12l-3 1M14 8l3 2 3-1" />
          <path d="M4 20l3-3" opacity=".5" />
        </svg>
      );
  }
}
