import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { TournamentRoom } from "@/components/TournamentRoom";

export default function TournamentPage({ params }: { params: { id: string } }) {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <TournamentRoom id={params.id} />
      <BottomNav />
    </main>
  );
}
