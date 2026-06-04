import { celo, celoSepolia } from "@reown/appkit/networks";

// ArcadeEscrow deployments. Sepolia is live; mainnet is filled in after deploy.
export const ESCROW_ADDRESS: Record<number, `0x${string}`> = {
  [celoSepolia.id]: "0x28825CB6a2D9f13947e4023317904A38Bd35dB9e",
  // [celo.id]: "0x...",
};

// cUSD is the same address on Celo Sepolia and mainnet.
export const STAKE_TOKEN: Record<number, `0x${string}`> = {
  [celoSepolia.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  [celo.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

export const FEE_BPS = 500; // 5%, mirrors the contract default

// Minimal ABI: only what the app calls.
export const ESCROW_ABI = [
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "stake", type: "uint128" },
      { name: "gameType", type: "uint8" },
      { name: "capacity", type: "uint8" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reclaimStalled",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "declareResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "ranking", type: "address[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "matches",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "stake", type: "uint128" },
      { name: "createdAt", type: "uint64" },
      { name: "joinDeadline", type: "uint64" },
      { name: "activatedAt", type: "uint64" },
      { name: "gameType", type: "uint8" },
      { name: "capacity", type: "uint8" },
      { name: "joined", type: "uint8" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "MatchCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "stake", type: "uint256", indexed: false },
      { name: "gameType", type: "uint8", indexed: false },
      { name: "capacity", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MatchSettled",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "winners", type: "address[]", indexed: false },
      { name: "payouts", type: "uint256[]", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

// Standard ERC20 approve/allowance for staking.
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
