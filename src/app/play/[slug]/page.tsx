import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { Backdrop } from "@/components/Backdrop";
import { PlayFlow } from "@/components/games/PlayFlow";

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export default function PlayPage({ params }: { params: { slug: string } }) {
  const game = GAMES.find((g) => g.slug === params.slug);
  if (!game) notFound();

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <PlayFlow game={game!} />
    </main>
  );
}
