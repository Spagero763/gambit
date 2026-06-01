import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { Backdrop } from "@/components/Backdrop";

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export default function PlayPage({ params }: { params: { slug: string } }) {
  const game = GAMES.find((g) => g.slug === params.slug);
  if (!game) notFound();

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-5">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim"
        >
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>

        <div className="mt-10 rounded-3xl glass p-8 text-center shadow-card">
          <div className="text-6xl opacity-80">{game!.glyph}</div>
          <h1 className="mt-4 font-display text-2xl font-bold">{game!.name}</h1>
          <p className="mt-1 text-sm text-ink-dim">{game!.tagline}</p>
          <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-ink-faint">
            The match table is being set up. The board and live play land in the
            next build.
          </p>
        </div>
      </div>
    </main>
  );
}
