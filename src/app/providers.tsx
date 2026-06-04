"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config, wagmiAdapter } from "@/lib/wagmi";
import { createAppKit } from "@reown/appkit/react";
import { celo } from "@reown/appkit/networks";

createAppKit({
  adapters: [wagmiAdapter],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "0b1cfff79855c73f2ec77409f402908b",
  networks: [celo],
  defaultNetwork: celo,
  features: { analytics: false },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
