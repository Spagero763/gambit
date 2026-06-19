import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { celo, celoSepolia } from "viem/chains";

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Which chain the staking UI targets. Mainnet (celo) is the default now that
// we're live; set NEXT_PUBLIC_CHAIN=testnet to opt a build into Sepolia.
export const ACTIVE_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN === "testnet" ? celoSepolia.id : celo.id;

// Wagmi config for Privy — chains + transports only. Privy manages the wallet
// connectors (embedded + external), so we don't declare any here.
export const config = createConfig({
  chains: [celo, celoSepolia],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
});
