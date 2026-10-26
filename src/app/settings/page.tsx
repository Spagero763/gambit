import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Settings } from "@/components/Settings";

export default function SettingsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Header />
      <Settings />
      <BottomNav />
    </main>
  );
}
