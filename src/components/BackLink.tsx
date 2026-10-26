import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Back link for the standalone info pages (about, how to play, terms, privacy).
 *
 * These pages carry no Header and no BottomNav, and a Mini App has no browser
 * chrome, no back button, no address bar. Without this a player who opens Terms
 * is simply stuck there, which is exactly the kind of dead end the MiniPay
 * review flags. Points at the You screen because that is where the links live.
 */
export function BackLink({ href = "/profile", label = "Back" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="glass pressable inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-ink-dim transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
