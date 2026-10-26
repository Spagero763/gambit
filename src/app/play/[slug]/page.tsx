import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { PlayFlow } from "@/components/games/PlayFlow";

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = GAMES.find((g) => g.slug === params.slug);
  if (!game) return {};
  const title = game.mode === "1v1" ? `Play ${game.name} online, free or for real money` : `Play ${game.name} online free`;
  const description =
    game.mode === "1v1"
      ? `${game.description} Practice free against the computer, or play a real person for USDT, USDC or USDm. Winner takes 95%, paid in seconds.`
      : `${game.description} Free to play, no sign up.`;
  return {
    title,
    description,
    alternates: { canonical: `/play/${game.slug}` },
    openGraph: { title: `${title} | Gambit`, description, url: `/play/${game.slug}` },
    twitter: { card: "summary_large_image", title: `${title} | Gambit`, description },
  };
}

export default function PlayPage({ params }: { params: { slug: string } }) {
  const game = GAMES.find((g) => g.slug === params.slug);
  if (!game) notFound();

  return (
    <main className="relative min-h-[100dvh]">
      <PlayFlow game={game!} />
    </main>
  );
}
