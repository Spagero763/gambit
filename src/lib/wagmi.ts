import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { celo, celoSepolia } from "@reown/appkit/networks";

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Which chain the staking UI targets. Sepolia while we test, celo for mainnet.
export const ACTIVE_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? celo.id : celoSepolia.id;

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "0b1cfff79855c73f2ec77409f402908b";

export const networks = [celo, celoSepolia] as const;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [celo, celoSepolia],
});

export const config = wagmiAdapter.wagmiConfig;
