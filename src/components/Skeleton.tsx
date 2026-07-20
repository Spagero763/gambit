"use client";

import { cn } from "@/lib/cn";

/**
 * Shimmering loading placeholders shaped like the content they stand in for.
 * Dead "Loading…" text is the fastest way for an app to feel cheap; a surface
 * that shimmers where the content will land feels instant even when it isn't.
 * Pure CSS background animation — costs nothing on low-end phones.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block animate-[shimmer-x_1.6s_ease-in-out_infinite] rounded-lg", className)}
      style={{
        background:
          "linear-gradient(100deg, rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.05) 62%)",
        backgroundSize: "220% 100%",
      }}
    />
  );
}

/** A list-row placeholder: avatar block, two text lines, a trailing figure. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-void-800 px-3 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-12" />
    </div>
  );
}

/** A stack of row placeholders for lists and leaderboards. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.16 }}>
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}
