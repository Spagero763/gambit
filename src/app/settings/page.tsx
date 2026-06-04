import { Backdrop } from "@/components/Backdrop";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Settings } from "@/components/Settings";

export default function SettingsPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <Backdrop />
      <Header />
      <Settings />
      <BottomNav />
    </main>
  );
}
