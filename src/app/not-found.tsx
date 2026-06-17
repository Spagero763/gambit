import Link from "next/link";
import { Home, Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-void px-6 text-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-5xl font-black tracking-tight text-teal">404</p>
        <p className="mt-3 font-display text-xl font-bold text-ink">This page took a wrong turn</p>
        <p className="mt-2 text-sm text-ink-dim">The link may be old or mistyped. Let&apos;s get you back to the games.</p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Link href="/" className="btn-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm shadow-glow">
            <Gamepad2 className="h-4 w-4" /> Play
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-line bg-void-700 px-5 py-3 text-sm font-semibold text-ink-dim transition-colors hover:text-ink">
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
