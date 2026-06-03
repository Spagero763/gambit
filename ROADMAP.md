# Gambit roadmap

Status tracker for the build. Updated as work lands.

## Done

- **App shell**: Next.js 14 + TypeScript + Tailwind, dark arcade design system, animated background, route transitions, custom logo and iconography (no emoji), bottom-nav routing.
- **Lobby**: cover-art game tiles, live counts, hero.
- **Games (all playable vs AI/bots, free):**
  - Chess — vector pieces, drag + tap, legal moves, check, promotion picker, clocks, player cards + captured trays, Easy/Normal/Hard.
  - Tic-Tac-Toe — drawn marks, scoreboard, Easy/Normal/Hard.
  - Snakes & Ladders — state-driven tokens, four board themes, difficulty changes the board layout.
  - Block Blitz — 8x8 block-placement puzzle, combos, best score.
  - Naija Whot — verified ruleset, 2 to 6 players with bots, tournament (semi-final, final) and a winner celebration.
- **Leaderboard / Profile / Events** screens.
- **Wallet**: wagmi v2 injected connector with MiniPay auto-connect.
- **Escrow contract**: `contracts/ArcadeEscrow.sol` with 8 passing Foundry tests (1v1 winner-takes-pot, draw refund, cancel/refund, relayer-only settle, 3 to 8 seat pot split). Security-reviewed.

## In progress

- **Contract hardening** before deploy (see checklist below).
- **Live deploy** of the app for a public URL.

## Next

- Wire **Reown** connect for desktop/mobile browsers alongside MiniPay.
- Wire the **stake -> play -> payout** loop into one game (tic-tac-toe rooms) end to end.
- Deploy `ArcadeEscrow` after hardening; wire the rest of the staked modes (Whot pots, Block Blitz same-seed pools).
- Online human-vs-human play (real-time sync) so staked 1v1 has a real opponent.

## Before mainnet — contract hardening checklist

From the security review:

- [ ] **(high)** Add a time-bounded, permissionless stale-match refund: anyone can reclaim stakes from an Active match if it is not settled within a settle window. Use a dedicated `activatedAt` timestamp.
- [ ] **(med)** Token allowlist (owner-curated: cUSD, USDC on Celo) and safe transfer handling so no-return tokens (USDT-style) and fee-on-transfer tokens cannot break accounting.
- [ ] **(med)** Move the relayer to a multisig and add a delay on `setRelayer`.
- [ ] **(low)** Require an exact-length ranking for pot settlement.
- [ ] **(low)** Freeze each match's join deadline at creation instead of reading a mutable window.

## Principles

- Bot play is free (practice, XP, leaderboard). On-chain stakes are human vs human, or human vs a separately funded wallet, never a rigged unbeatable bot.
- Mobile-first, MiniPay-compatible, gas payable in cUSD.
