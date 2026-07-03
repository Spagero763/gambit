import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DailyReward } from "@/components/DailyReward";
import { GameGrid } from "@/components/GameGrid";
import { BottomNav } from "@/components/BottomNav";
import {
  LazyActiveGames,
  LazyDailyStrip,
  LazyGameShowcase,
  LazySaveProgressPrompt,
} from "@/components/HomeLazy";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Hero />
      <div className="px-5">
        <DailyReward />
        <LazySaveProgressPrompt />
        <LazyActiveGames />
        <LazyDailyStrip />
      </div>
      <LazyGameShowcase />
      <GameGrid />
      <BottomNav />
    </main>
  );
}
