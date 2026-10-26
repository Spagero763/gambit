import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Lobby } from "@/components/Lobby";

export default function LobbyPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Header />
      <Lobby />
      <BottomNav />
    </main>
  );
}
