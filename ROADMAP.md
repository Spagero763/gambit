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

## MiniPay Readiness (audited against Celopedia + real evidence)

Celopedia's `minipay-requirements.md` / `minipay-app-fit.md` are useful *generic* guidance, but they describe a builder using the **raw** MiniPay injected wallet. Gambit connects through **Privy**, which bridges to MiniPay and handles signing. Ground truth beats the snapshot:

**Proven working (do not "fix"):**
- Gambit **runs inside MiniPay today** — connected via Privy ("Successfully connected with MiniPay · Protected by Privy"), balances load, daily claim (which signs) works. Tested on device.
- Gambit placed **7th of 50 in June Proof of Ship**, so it already clears every hard gate: verified mainnet contracts, public repo, live URL, talent.app registration, `isMiniPay()` hook.
- `personal_sign` is **not** a blocker for us — Privy handles signing; the generic "MiniPay can't sign" rule is about the bare provider, not our stack.

**Deliberate product decisions (not gaps):**
- **CELO stays visible.** Gambit pays network fees in CELO, so players genuinely need a little. Hiding it would just cause failed transactions with no explanation. Showing it is the honest call. (Owner decision, 2026-07.)

**Genuinely worthwhile, framed as enhancements (never blockers):**
- **Copy** — say "network fee" not "gas"; keep CELO. Friendlier for non-crypto players. (Done.)
- **Public stats page** — DAU/MAU/retention + on-chain tx/volume/fees. Also our Phase 5 proof page; strengthens a future MiniPay/VC review.
- **In-app support link** (Telegram/WhatsApp/email) + a 24h critical-fix intent.
- **SVG/WebP assets**, confirm JS bundle < 2 MB.
- **Positioning:** present as **skill gaming with prize pools / X-to-earn** (Tier 1), leaning on the free Weekly Cup — not betting language.

**Submission:** Stage 1 intake is `minipay.to/mini-apps` (needs 3+ screenshots ≤500 KB), then a call, then a Stage 2 readiness form. No rush — Proof of Ship is the right venue now; submit MiniPay when we choose to, not because a checklist says we must.

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
