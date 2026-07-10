# Gambit on Dune

Public on-chain analytics for Gambit's four Celo **mainnet** contracts. Every
match, stake, payout and fee is a public event. These queries turn them into the
dashboard we link from the MiniPay submission and the site.

## The contracts (all verified on-chain 2026-07-09)

| Contract | Address | Token | Emits |
|---|---|---|---|
| ArcadeEscrow | `0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05` | any allowed | `MatchCreated/Joined/Activated/Settled/Cancelled` |
| WeeklyCup | `0x6043bec74cfE8bF00D395DdddD2C2f85a9915A15` | USDm | `WeekSettled`, `Swept` |
| RewardsVault (Referral) | `0xED328Ce807ad1F97472b119755fB1d43E1fD0A75` | USDm | `RewardPaid`, `Swept` |
| RewardsVault (Claims) | `0x47302b7e3C7674bb307fd7768eA6d2462C12Ebd5` | G$ | `RewardPaid`, `Swept` |

Owner of all four: `0x32a3596C25A98950E850E3531a0aA87f1506e5d7`.
Relayer of all four: `0xa4fB1ED5abbaFC0820e5399aE9E61C9a3B16ACbe`.

**Do NOT add `0x28825CB6a2D9f13947e4023317904A38Bd35dB9e`** — that is the escrow
on **Sepolia testnet**. It is play money and would inflate the dashboard with
fake volume. There has only ever been ONE mainnet escrow, so no history is
missing: on-chain counts reconcile exactly with the app database
(22 created = 16 settled + 6 cancelled; 16 settled = 11 duels + 5 tournaments).

Tournaments and 1v1 duels share the **same** escrow, so `MatchSettled` counts
both. That is why on-chain settles exceed the `matches` table alone.

Both RewardsVaults share one ABI, so Dune decodes them into the same table.
Separate them with `contract_address`, or by the `tag` field on `RewardPaid`
(`daily` vs `referral`).

## Setup, in order

1. **Make a Dune account** at <https://dune.com> (free tier is enough).
2. **Submit the contract for decoding** at <https://dune.com/contracts/new>:
   - Blockchain: `Celo`
   - Address: `0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05`
   - ABI: paste the `abi` array from `contracts/out/ArcadeEscrow.sol/ArcadeEscrow.json`
   - Project name: `gambit` (this decides the table namespace)

   Approval usually takes a day. Once live you get decoded tables like
   `gambit_celo.ArcadeEscrow_evt_MatchSettled`.

3. **Meanwhile, use the raw queries** in `raw-queries.sql`. They read `celo.logs`
   directly by event topic hash, so they work immediately with no decoding.

4. Once decoding lands, switch to `decoded-queries.sql` (richer: token, amounts,
   per-token volume).

5. Create a dashboard, add one chart per query, make it **public**, and put the
   URL in the MiniPay form's "on-chain performance analytics" field.

## Event topic hashes (verified with `cast keccak`)

| Event | topic0 |
|---|---|
| `MatchCreated(uint256,address,address,uint256,uint8,uint8)` | `0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379` |
| `MatchJoined(uint256,address,uint8)` | `0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903` |
| `MatchActivated(uint256,uint64)` | `0xc331f8a6361aaab72e5a843e5ab68249dabb2c4146eb69ae85d0f328e2708d0d` |
| `MatchSettled(uint256,address[],uint256[],uint256)` | `0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1` |
| `MatchCancelled(uint256,string)` | `0xbe9561483b1664685b575e72966584b8b66b253bd4f2e55e045e00db8fc134af` |

## The one gotcha

`MatchSettled` carries `payouts[]` and `fee` but **not the token**. To express
volume or payouts in USDm/USDC/G$ you must join back to `MatchCreated` on the
match `id` to learn the token, then divide by that token's decimals (USDC is 6,
USDm and G$ are 18). Any query that skips this join reports garbage.
