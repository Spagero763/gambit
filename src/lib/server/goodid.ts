import { createPublicClient, getAddress, parseAbi, zeroAddress } from "viem";
import { celo } from "viem/chains";
import { celoReadTransport } from "@/lib/server/rpc";

// GoodDollar IdentityV2 on Celo mainnet (production — same table the
// citizen-sdk uses client-side). We read it server-side so the Weekly Cup's
// "verified humans only" rule is enforced where it can't be bypassed.
const IDENTITY = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as const;

const identityAbi = parseAbi(["function getWhitelistedRoot(address account) view returns (address)"]);

const pub = createPublicClient({ chain: celo, transport: celoReadTransport() });

/**
 * The wallet's whitelisted ROOT identity, or null if not a verified human.
 * The root is the anti-Sybil anchor: every wallet a human links resolves to
 * the same root, so "one entry per root" is one entry per person.
 */
export async function goodIdRoot(address: string): Promise<string | null> {
  const root = (await pub.readContract({
    address: IDENTITY,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: [getAddress(address)],
  })) as `0x${string}`;
  return root === zeroAddress ? null : root.toLowerCase();
}
