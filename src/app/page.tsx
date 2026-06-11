import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DailyStrip } from "@/components/Daily";
import { ActiveGames } from "@/components/ActiveGames";
import { GameShowcase } from "@/components/GameShowcase";
import { GameGrid } from "@/components/GameGrid";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Hero />
      <div className="px-5">
        <ActiveGames />
        <DailyStrip />
      </div>
      <GameShowcase />
      <GameGrid />
      <BottomNav />
    </main>
  );
}
