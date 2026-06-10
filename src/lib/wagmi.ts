import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { celo, celoSepolia } from "@reown/appkit/networks";

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Which chain the staking UI targets. Mainnet (celo) is the default now that
// we're live; set NEXT_PUBLIC_CHAIN=testnet to opt a build into Sepolia. We key
// off "testnet" (not "mainnet") so an empty/unset env can never silently drop
// real players onto the testnet escrow — the bug that stranded payouts before.
export const ACTIVE_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN === "testnet" ? celoSepolia.id : celo.id;

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "0b1cfff79855c73f2ec77409f402908b";

export const networks = [celo, celoSepolia] as const;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [celo, celoSepolia],
});

export const config = wagmiAdapter.wagmiConfig;
