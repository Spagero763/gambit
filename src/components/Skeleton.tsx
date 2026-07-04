import { cn } from "@/lib/cn";

/** A single shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

/** A list of card-shaped row skeletons — for leaderboards, match lists, etc. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-void-800 px-3 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-3.5 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A grid of stat-tile skeletons. */
export function SkeletonTiles({ tiles = 6, cols = "grid-cols-2 sm:grid-cols-3" }: { tiles?: number; cols?: string }) {
  return (
    <div className={cn("grid gap-3", cols)}>
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-void-700 p-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="mt-3 h-6 w-16" />
          <Skeleton className="mt-1.5 h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}
