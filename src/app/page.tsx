import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DailyReward } from "@/components/DailyReward";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
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
      {/* desktop: hero sits beside the daily column; mobile stacks unchanged */}
      <div className="mx-auto w-full lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-5 lg:pt-6">
        <Hero />
        <div className="px-5 lg:px-0">
          <DailyReward />
          <DailyChallengeCard />
          <LazySaveProgressPrompt />
          <LazyActiveGames />
          <LazyDailyStrip />
        </div>
      </div>
      <LazyGameShowcase />
      <GameGrid />
      <BottomNav />
    </main>
  );
}
