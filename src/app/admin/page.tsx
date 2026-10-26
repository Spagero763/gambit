import { AdminPanel } from "@/components/AdminPanel";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="relative min-h-[100dvh]">
      <AdminPanel />
    </main>
  );
}
