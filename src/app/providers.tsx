"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config, wagmiAdapter, ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { createAppKit } from "@reown/appkit/react";
import { celo, celoSepolia } from "@reown/appkit/networks";

const defaultNetwork = ACTIVE_CHAIN_ID === celo.id ? celo : celoSepolia;

createAppKit({
  adapters: [wagmiAdapter],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "0b1cfff79855c73f2ec77409f402908b",
  networks: [celo, celoSepolia],
  defaultNetwork,
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
