"use client";

import { useState } from "react";
import { Loader2, ArrowUpFromLine, ArrowDownToLine, ExternalLink, AlertTriangle } from "lucide-react";
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi, parseUnits, isAddress } from "viem";
import { ExternalA } from "@/components/ExternalA";
import { cn } from "@/lib/cn";

const CELO = 42220;
// Both vault tokens on Celo (USDm and G$) are 18-decimal ERC20s.
const DECIMALS = 18;

const vaultAbi = parseAbi(["function sweep(address token_, address to, uint256 amount)"]);
const erc20Abi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);

export interface VaultInfo {
  address: string | null;
  token?: string;
  balance: number;
  low: boolean;
}

type Mode = "withdraw" | "fund";

/**
 * Owner-only money controls for the three prize vaults.
 *
 * `sweep` on the vaults is `onlyOwner`, and the server's relayer is NOT the
 * owner — so every transaction here is signed by the connected owner wallet in
 * the browser. The owner key never exists server-side, which is exactly why the
 * escrow holding players' stakes has no sweep at all.
 */
export function AdminVaultActions({
  vaults,
  owner,
  onDone,
}: {
  vaults: { cup: VaultInfo | null; claims: VaultInfo | null; referral: VaultInfo | null };
  owner: string;
  onDone?: () => void;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [which, setWhich] = useState<"cup" | "claims" | "referral">("cup");
  const [mode, setMode] = useState<Mode>("withdraw");
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  const OPTIONS = [
    { key: "cup" as const, label: "Cup", unit: "USDm", v: vaults.cup },
    { key: "claims" as const, label: "Claims", unit: "G$", v: vaults.claims },
    { key: "referral" as const, label: "Referral", unit: "USDm", v: vaults.referral },
  ];
  const sel = OPTIONS.find((o) => o.key === which)!;
  const vault = sel.v;

  const isOwner = !!address && address.toLowerCase() === owner.toLowerCase();
  const wrongChain = chainId !== CELO;
  const dest = to.trim() || address || "";
  const amt = Number(amount);
  const overdraw = mode === "withdraw" && !!vault && amt > vault.balance;

  const invalid =
    !vault?.address ||
    !vault.token ||
    !Number.isFinite(amt) ||
    amt <= 0 ||
    overdraw ||
    (mode === "withdraw" && !isAddress(dest));

  const submit = async () => {
    if (invalid || !vault?.address || !vault.token) return;
    setError(null);
    setHash(undefined);
    setBusy(true);
    try {
      const value = parseUnits(amount, DECIMALS);
      const h =
        mode === "withdraw"
          ? // pull the token OUT of the vault, to wherever the owner says
            await writeContractAsync({
              address: vault.address as `0x${string}`,
              abi: vaultAbi,
              functionName: "sweep",
              args: [vault.token as `0x${string}`, dest as `0x${string}`, value],
            })
          : // fund the vault: a plain ERC20 transfer from the owner's own wallet
            await writeContractAsync({
              address: vault.token as `0x${string}`,
              abi: erc20Abi,
              functionName: "transfer",
              args: [vault.address as `0x${string}`, value],
            });
      setHash(h);
      setAmount("");
      onDone?.();
    } catch (e: any) {
      const m = String(e?.shortMessage ?? e?.message ?? "Transaction failed");
      setError(m.includes("NOT_OWNER") ? "That wallet is not the contract owner." : m.slice(0, 160));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-void-800 p-4">
      <p className="text-[13px] font-bold text-ink">Move money</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        Signed by your owner wallet, never by the server. The match escrow has no withdraw by design, so players&apos; stakes can never be touched.
      </p>

      {!isOwner ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] text-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Connect the owner wallet to move funds.
        </p>
      ) : wrongChain ? (
        <button
          onClick={() => switchChain({ chainId: CELO })}
          className="mt-3 w-full rounded-xl border border-amber/40 bg-amber/[0.08] px-3 py-2 text-[12px] font-semibold text-amber"
        >
          Switch to Celo to continue
        </button>
      ) : (
        <>
          {/* which vault */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setWhich(o.key)}
                disabled={!o.v?.address}
                className={cn(
                  "rounded-xl border px-2 py-2 text-[11px] font-semibold transition-colors disabled:opacity-40",
                  which === o.key ? "border-teal/50 bg-teal/[0.12] text-teal" : "border-line bg-void-700 text-ink-dim"
                )}
              >
                {o.label}
                <span className="mt-0.5 block text-[10px] font-medium text-ink-faint">
                  {o.v ? `${o.v.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${o.unit}` : "not set"}
                </span>
              </button>
            ))}
          </div>

          {/* withdraw or fund */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(["withdraw", "fund"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[12px] font-semibold capitalize transition-colors",
                  mode === m ? "border-ink/30 bg-void-600 text-ink" : "border-line bg-void-700 text-ink-dim"
                )}
              >
                {m === "withdraw" ? <ArrowUpFromLine className="h-3.5 w-3.5" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                {m}
              </button>
            ))}
          </div>

          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={`Amount in ${sel.unit}`}
            className="mt-2 w-full rounded-xl border border-line bg-void-700 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
          />
          {mode === "withdraw" && (
            <input
              value={to}
              onChange={(e) => setTo(e.target.value.trim())}
              placeholder={`Send to (default: your wallet)`}
              className="mt-2 w-full rounded-xl border border-line bg-void-700 px-3 py-2.5 font-mono text-[12px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint focus:border-line-strong"
            />
          )}

          {overdraw && <p className="mt-2 text-[11px] font-medium text-rose">That is more than the vault holds.</p>}
          {error && <p className="mt-2 text-[11px] font-medium text-rose">{error}</p>}

          <button
            onClick={submit}
            disabled={invalid || busy || confirming}
            className="btn-primary mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            {busy || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Confirm in wallet…" : confirming ? "Landing on-chain…" : mode === "withdraw" ? `Withdraw ${sel.unit}` : `Fund vault`}
          </button>

          {hash && (
            <p className="mt-2 text-center text-[11px]">
              {confirmed ? <span className="font-semibold text-teal">Done. </span> : null}
              <ExternalA href={`https://celoscan.io/tx/${hash}`} className="inline-flex items-center gap-1 text-ink-dim hover:text-ink">
                View on Celoscan <ExternalLink className="h-3 w-3" />
              </ExternalA>
            </p>
          )}

          {vault?.address && (
            <p className="mt-2 text-center text-[10px] text-ink-faint">
              {sel.label} vault:{" "}
              <ExternalA href={`https://celoscan.io/address/${vault.address}`} className="font-mono hover:text-ink">
                {vault.address.slice(0, 10)}…{vault.address.slice(-6)}
              </ExternalA>
            </p>
          )}
        </>
      )}
    </div>
  );
}
