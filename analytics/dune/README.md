# Gambit on Dune

Public on-chain analytics for **ArcadeEscrow** on Celo mainnet:
`0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05`

Every match, stake, payout and fee is a public event. These queries turn them
into the dashboard we link from the MiniPay submission and the site.

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
