# Gambit roadmap

The master plan. Goal: real users, real transactions, a growth curve that stands up to VC and grant scrutiny. Mobile, iOS and desktop all first class. Results over deadlines.

## Shipped

- App shell, dark arcade design system, bottom-nav routing, route transitions.
- Five games playable free vs bots: Chess, Naija Whot, Tic-Tac-Toe, Snakes & Ladders, Block Blitz.
- Staked 1v1s (USDm, USDC, G$) through `ArcadeEscrow` on Celo mainnet, source verified, server-authoritative real-time play, relayer settlement.
- Staked tournaments: score race, knockout brackets, Whot survival table; on-chain 50/30/20 pot split.
- Privy auth (email/social + wallet), embedded wallets, wallet sheet, send/withdraw.
- Daily reward: XP + 1 G$ from the treasury, once per day per profile.
- GoodID (GoodDollar face verification) on the profile.
- Free Weekly Cup: GoodID-gated (one entry per verified human), same seeded board for all, top 3 split a USDm prize from the on-chain `WeeklyCup` vault (deployed, 8 passing tests).
- On-board coach (pointing hand) for first-time play in every game.
- Per-game music, push notifications, admin panel, Dune dashboard, public repo.
- MiniPay compatibility: silent auto-connect, legacy transactions, no-CELO gas, container-safe links, Terms and Privacy pages, listing icon.
- Daily Challenge (one seeded board a day) with a shareable score card and streaks.
- Challenge-a-friend share links and open-room push broadcasts.
- Referral engine and RewardsVault contract (0.10 USDm each side, key-deduped on-chain), gated off until opening day.
- Resign/forfeit in every staked game and tournament, with a mobile-safe confirm sheet.
- Onboarding: challenge-voice hero, replayable Coach 2.0, five-step How-it-works.
- Daily G$ claims routed through an on-chain claim vault; cup and referrals gated behind env flags (Coming Soon).
- Motion foundation: shared tokens, reduced-motion-safe page transition, tactile button press, count-up numbers on money.
- Game juice: Block Blitz board kick on line clears (existing dice tumble, card flick, win confetti and synthesized SFX already in place).
- Plain-language pass: no dashes in any user-facing copy.
- RPC failover across forno, Ankr and dRPC for wallet reads and the cup identity gate.

## MiniPay Readiness (from Celopedia, the official Celo builder skill)

Celopedia's `minipay-requirements.md` and `minipay-app-fit.md` are the real listing bar. Audit of Gambit against them:

**Hard blocks (must fix before any MiniPay submission):**
- **`personal_sign` is a hard technical block.** MiniPay's injected wallet does not support message signing, and Gambit's whole session-token auth (`signIn` in `src/lib/profile.ts`) signs a message to gate staking, daily claim, cup entry and tournaments. It "worked" in testing only because the tester signed in with email (Privy embedded wallet), not MiniPay's native wallet. For a real listing we must rework auth so the core flow needs only `eth_sendTransaction` / the wallet address, no off-chain signature.
- **Never show or require CELO.** SendFunds lists CELO as a sendable asset and several error strings say "add a little CELO". Inside MiniPay, CELO must be removed from balances, selectors and copy (fees are abstracted). Gate all of this on `inMiniPay()`.

**Required for listing:**
- **No raw `0x…` as the primary identifier** — use the display-name alias everywhere (already have names; make them the default, 0x only as a faint secondary).
- **Low balance → Add Cash deeplink** (`https://link.minipay.xyz/add_cash?tokens=USDm,USDC,USDT`) instead of an error.
- **Preferred stablecoin** — default the token selector to the user's highest-balance stablecoin.
- **Copy rules** — "gas"/"gas fee" → "network fee" (partly done); no "crypto".
- **Public stats page** — DAU/MAU/retention + on-chain tx, volume, fees, failed-tx rate (also our Phase 5 proof page).
- **In-app support link** (Telegram/WhatsApp/email) reachable from the app + a committed 24h critical-fix SLA.
- **Images SVG/WebP** (our icon and covers are PNG); **JS bundle under 2 MB**.
- **Two-stage submission**: Stage 1 intake at `minipay.to/mini-apps` (needs 3+ screenshots ≤500 KB), then a call, then the Stage 2 readiness form. Do NOT submit half-built — MiniPay deprioritises rough submissions.

**Positioning:** Celo lists "Gambling" on the avoid list, but "games with real reward mechanics and USDm prize pools" and "X-to-earn" are Tier 1. Gambit must present as **skill gaming with prize pools**, leaning on the free Weekly Cup and skill framing, not betting language.

**Proof of Ship hard gates (we're submitted for July):** contract on mainnet (done), public repo (done), live URL (done), **registered on talent.app** (confirm), MiniPay hook (done, a scoring booster). Quality review explicitly penalises AI-slop copy and broken mobile flows — our anti-AI pass helps here.

## The plan

### Phase 0 — Distribution first: MiniPay
MiniPay pays builders in CELO for mini apps with real transaction activity, plus funded growth campaigns. The audience is already inside the app; we go to them.
- Full MiniPay container compatibility (injected wallet, viewport, their design standards).
- Gas payable in stablecoins (CIP-64 fee abstraction) so users never need CELO.
- Pass the submission checklist, get listed on the discovery page, then qualify for the builders incentive.

### Phase 1 — Growth loops in the product
- **Daily Challenge with a shareable result card**: one seeded board for everyone each day; finishing produces a spoiler-free score card that posts to WhatsApp/X in one tap. The Wordle loop.
- **Referral bonus with real money**: invite a friend, both get a small G$/USDm bonus after their first match. Treasury-funded, capped to one per verified human.
- **Streak multipliers** on the daily claim; achievement badges worth sharing.
- **Challenge links** (bring your own opponent into a staked match) and **push broadcasts** when someone opens a stake, so an empty lobby still finds players.

### Phase 2 — A layman can use everything
- **First-run journey**: land, sign in with just an email, "this is your wallet, think of it as your game account", play a free game inside 30 seconds, only then meet staking.
- **Coach 2.0**: the pointing hand covers the whole app (wallet, deposit, withdraw, settings, cup, tournaments), reopenable anytime from a help button, not once-and-gone.
- **Plain language pass over every word in the app**: buttons, errors, empty states, notifications. No jargon a first-timer has to google.
- **Hero copy** (locked, no dashes): headline "Think you'd win? Put money on it." Subhead: "The games you grew up playing, now with real opponents and a real pot. Winner takes 95%, paid to your wallet the second the game ends. Warm up free until you're ready." Chips: Warm up free / Winner takes 95% / Paid in seconds / How it works.
- **How Gambit works** page: five picture cards, money in, play free, stake, win, cash out.
- **Forfeit/resign in every game and tournament**: confirmation step, short grace window at match start, resigner loses and the opponent is paid instantly through the existing settle path. Kills the 30-minute hostage wait.

### Phase 3 — Motion, feel and sound (the anti-generic pass)
Gambit's motion language comes from the games themselves, not agency gimmicks. Transform/opacity only, 60fps on cheap Androids, respects reduced motion.
- **Card-sweep page/tab transitions**: navigating deals the next page in like a card snapped onto the table.
- **Game juice**: Block Blitz line clears shatter with debris and a screen kick; chess captures land with impact; Whot cards flick with spin and weight; dice tumble; wins get a ceremony (chips rain, payout counts up), losses a quick low fade.
- **Shared-element lobby transition**: tap a game card and the card itself grows into the board.
- **Micro-interactions everywhere**: buttons compress, balances tick, tab icons pop.
- **Sound identity**: modern CC0 music refresh (Pixabay/OpenGameArt, afrobeats-adjacent lobby energy, tension loops for the chess clock) plus an SFX layer wired to the same events as the juice: card snap, dice clatter, shatter, chip payout, win sting. Per-game volume in settings.

### Phase 4 — Performance and scale (before the crowd, not after the crash)
- Bundle diet: audit what Privy/wagmi pull into every route, lazy-load game engines, target under 250kB first load.
- Replace polling with Supabase Realtime subscriptions for matches and tournaments.
- Indexes on hot queries, rate limits on API routes, connection pooling check.
- RPC fallbacks so a forno hiccup never freezes wallet reads.
- Load test the hot routes (k6) and fix what breaks at 500 concurrent.
- Image/audio compression; PWA offline for free games.

### Phase 5 — Desktop, polish, proof
- A real desktop layout (two-column lobby, side-by-side game and chat/history), not a stretched phone.
- Public live stats page pulled from the chain: players, matches, settlements, prizes paid. Undeniable numbers for VCs and grants.
- Dune dashboard maintained, weekly KarmaGAP updates, both verified contracts front and center.
- Badges, seasonal events, the pitch memo when the curve exists.

## Principles

- Bot play is free. On-chain stakes are human vs human, never a rigged bot as the house.
- Free entry stays gasless for players; money moves on-chain where trust matters.
- One verified human, one entry, everywhere prizes exist (GoodID root, server-enforced).
- Honest numbers in every application and update. No vanity metrics.
- Copy sounds like a person across the table, never a feature list. No dashes.
