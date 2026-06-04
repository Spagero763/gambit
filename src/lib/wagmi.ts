import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { celo } from "@reown/appkit/networks";

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "0b1cfff79855c73f2ec77409f402908b";

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [celo],
});

export const config = wagmiAdapter.wagmiConfig;
