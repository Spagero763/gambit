"use client";

import { PieceSymbol, Color } from "chess.js";

/**
 * Original Staunton-style vector pieces (drawn from scratch, not derived from
 * any existing GPL/CC piece set). viewBox 0 0 45 45.
 */
export function ChessPiece({
  type,
  color,
  size = 44,
  className,
}: {
  type: PieceSymbol;
  color: Color;
  size?: number;
  className?: string;
}) {
  const white = color === "w";
  const body = white ? "#f5f0e6" : "#2b2836";
  const line = white ? "#2b2836" : "#08070d";
  const shade = white ? "#e4dccb" : "#403b54";

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={className}
      style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45))" }}
    >
      <g
        fill={body}
        stroke={line}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SHAPES[type](shade, line)}
      </g>
    </svg>
  );
}

const SHAPES: Record<PieceSymbol, (shade: string, line: string) => JSX.Element> = {
  p: () => (
    <>
      <circle cx="22.5" cy="15.5" r="4.8" />
      <path d="M22.5 19c3.8 0 4.8 4.3 1.9 6.9 2.4 1.3 3.9 3.4 3.9 6.1H16.2c0-2.7 1.5-4.8 3.9-6.1-2.9-2.6-1.9-6.9 2.4-6.9Z" />
      <path d="M13.5 32h18c1.6 0 2.7 1.6 2.7 3.3H10.8c0-1.7 1.1-3.3 2.7-3.3Z" />
    </>
  ),
  r: (shade) => (
    <>
      <path d="M11.5 36h22c1.4 0 2.2 1.3 2.2 3.2H9.3c0-1.9.8-3.2 2.2-3.2Z" />
      <path d="M15.5 36l1.1-11h11.8l1.1 11Z" />
      <path d="M16 25l-.5-2h14l-.5 2Z" fill={shade} />
      <path d="M13.2 23v-6.5h3v2.4h3.4v-2.4h3.4v2.4h3.4v-2.4h3v6.5Z" />
    </>
  ),
  b: (shade) => (
    <>
      <path d="M12.5 36h20c1.4 0 2.2 1.3 2.2 3.2H10.3c0-1.9.8-3.2 2.2-3.2Z" />
      <path d="M16.5 36c0-4 2.2-5.8 3.2-7.8h5.6c1 2 3.2 3.8 3.2 7.8Z" />
      <path d="M22.5 11.5c4.3 3.6 5.2 9.4 0 14.6-5.2-5.2-4.3-11 0-14.6Z" />
      <path d="M19.6 19.5h5.8" strokeWidth="1.2" fill="none" />
      <circle cx="22.5" cy="9.4" r="2.3" />
      <path d="M18.5 28.5h8" stroke={shade} strokeWidth="1.6" />
    </>
  ),
  n: (shade, line) => (
    <>
      <path d="M11.5 36h22c1.4 0 2.2 1.3 2.2 3.2H9.3c0-1.9.8-3.2 2.2-3.2Z" />
      <path d="M22.2 10.5c5.2 0 9.3 4 9.3 11.2 0 5.6.2 9.7 1.2 14.3H16.4c0-5 .8-7.4 4.1-10.2-2 1.3-5.4 1.2-6.6-1.2l-2.3 2.3c-1.3-3.2 1-5.7 3.2-7.7 1.2 1 3.3.9 4.2-.3.2-3.4 1.4-6.9 3.6-8.5Z" />
      <circle cx="18.3" cy="20.2" r="1.1" fill={line} stroke="none" />
      <path d="M20 14.5c-1.6 1-2.6 2.6-3 4.2" stroke={shade} strokeWidth="1.1" fill="none" />
    </>
  ),
  q: (shade) => (
    <>
      <path d="M11.5 36h22c1.4 0 2.2 1.3 2.2 3.2H9.3c0-1.9.8-3.2 2.2-3.2Z" />
      <path d="M15.5 36l-1.8-11.5h17.6L29.5 36Z" />
      <path d="M16 25l-.5-2h14l-.5 2Z" fill={shade} />
      <path d="M13.5 23l-1.3-9.2 5.2 6 4.9-8.3 5 8.3 5.2-6L36.5 23Z" />
      <g fill="inherit">
        <circle cx="12.2" cy="13.4" r="2.1" />
        <circle cx="17.6" cy="19.3" r="1.8" />
        <circle cx="22.5" cy="11.2" r="2.2" />
        <circle cx="27.4" cy="19.3" r="1.8" />
        <circle cx="32.8" cy="13.4" r="2.1" />
      </g>
    </>
  ),
  k: (shade) => (
    <>
      <path d="M11.5 36h22c1.4 0 2.2 1.3 2.2 3.2H9.3c0-1.9.8-3.2 2.2-3.2Z" />
      <path d="M15.8 36l-1.6-9.6c4-3.2 12.6-3.2 16.6 0L29.2 36Z" />
      <path d="M14.4 26.4c4-3 12.2-3 16.2 0" fill="none" stroke={shade} strokeWidth="1.4" />
      <path d="M14 24l-.6-2.4h18.2L31 24Z" fill={shade} />
      <path d="M22.5 24c-1.5-3.5-5.5-6-5.5-10 0-3 4-4 5.5-1 1.5-3 5.5-2 5.5 1 0 4-4 6.5-5.5 10Z" />
      <path d="M21 7.5h3v3h3v3h-3v3.5h-3V13.5h-3v-3h3Z" />
    </>
  ),
};
