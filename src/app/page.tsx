import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { GameGrid } from "@/components/GameGrid";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Hero />
      <GameGrid />
      <BottomNav />
    </main>
  );
}
