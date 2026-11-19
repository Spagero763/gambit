# Gambit

Classic skill games for real stakes, inside MiniPay.

Play chess, Naija Whot, tic-tac-toe, snakes and ladders or Block Blitz free against a bot. When you think you would win, stake a dollar against a real person. An escrow contract on Celo holds both stakes and pays the winner 95% when the match is settled.

Live at [bestgambit.live](https://www.bestgambit.live).

## Why it exists

Staking money on a game of skill normally means trusting a house to hold the pot and decide who gets paid. On a phone in Lagos or Nairobi it also means card payments that fail and withdrawals that take days.

MiniPay users already hold dollar stablecoins on their phone. Gambit lets two of them open a room, put the same stake in, play a game they grew up with, and have the contract pay the winner before the app is closed.

## How a staked match moves

```
create   createMatch(token, stake, game, seats)   the creator's stake is locked
join     joinMatch(id)                            an equal stake is locked; the match starts when every seat is filled
play     the game runs off-chain, move by move
settle   declareResult(id, ranking)               the pot, less the fee, goes to the winner
```

Two seats is a head to head match: the winner takes the pot less a 5% fee, and a draw refunds both stakes with no fee. Three to eight seats is a pot that pays the top three.

Money cannot be stranded:

- A room nobody joins can be cancelled by its creator at any time, and by anyone once the join window has passed.
- A match that filled but was never settled can be refunded to every player, by anyone, once the settle window has passed.
- A contested or indeterminate result is aborted and every stake goes back.

The result is reported by a relayer, so the game outcome itself is trusted to the server. What the contract guarantees is the money: only seated players can be paid, the fee has a hard ceiling of 10%, and the refunds above need no one's permission.

## Contracts

Celo mainnet. Source in [`contracts/src`](contracts/src), behaviour described in [`contracts/README.md`](contracts/README.md).

| Contract | Address |
|---|---|
| ArcadeEscrow | [`0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05`](https://celoscan.io/address/0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05) |
| RewardsVault | [`0x8f5f57b0851b1FC374d2dcE52cB9F83cC005346E`](https://celoscan.io/address/0x8f5f57b0851b1FC374d2dcE52cB9F83cC005346E) |
| WeeklyCup | [`0x6043bec74cfE8bF00D395DdddD2C2f85a9915A15`](https://celoscan.io/address/0x6043bec74cfE8bF00D395DdddD2C2f85a9915A15) |

Stakes are accepted in USDm, USDT and USDC.

## Rewards

Forty percent of every fee goes back to players. Each player in a staked match gets cashback on their entry, win or lose, and whoever invited them earns the same amount for as long as they keep playing. Rewards are paid out once a day.

## The app

- Built for one thumb: a bottom tab bar, large tap targets, and a Play versus AI button that works before any sign-in.
- Inside MiniPay the wallet connects on its own. In a normal browser, sign in from the top bar.
- A daily reward, a daily challenge, ranks, a leaderboard and weekly cups.
- Match alerts by web push, so you can open a room and wait for an opponent with the app closed.

## Stack

| Layer | Choice |
|---|---|
| Contracts | Solidity, Foundry |
| App | Next.js, React, Tailwind, Framer Motion |
| Wallets | wagmi, viem, Privy |
| Data | Supabase (Postgres) |
| Hosting | Vercel |

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` lists every variable. The app needs a Supabase project (schema in [`supabase/schema.sql`](supabase/schema.sql)) and, for staked matches, the escrow address and a relayer key funded with a little CELO.

## Tests

```bash
cd contracts
forge test
```

28 tests across the escrow, the vault and the cup.

## Layout

```
contracts/   Foundry project: ArcadeEscrow, RewardsVault, WeeklyCup, deploy scripts
src/app/     pages and API routes (matches, settlement, rewards, cups, push)
src/lib/     game engines, bots, escrow client, ranks, rewards
supabase/    database schema
analytics/   Dune queries for on-chain activity
```

## License

See [LICENSE](LICENSE).
