// Gambit's help bot brain. A curated knowledge base, NOT an LLM: there is no API
// key to leak and it cannot hallucinate a wrong answer about money. It also
// contains ZERO knowledge of the admin panel, vaults, relayer or owner wallet by
// construction — it cannot leak what is not in here. Scope is strictly the
// player's world: what Gambit is, how to earn, how to play, how to get around.
//
// Voice: plain, human, no dashes, no hype. Short answers a first-timer gets.

export interface CupInfo {
  prize?: number;
  daysLeft?: number;
}

interface Entry {
  id: string;
  /** shown as a suggestion / the "question" bubble */
  q: string;
  /** words or phrases that should route a question to this answer */
  keywords: string[];
  /** the answer; may fold in live cup info */
  a: (cup: CupInfo | null) => string;
}

const cupLine = (cup: CupInfo | null) => {
  if (!cup) return "";
  const bits: string[] = [];
  if (cup.prize) bits.push(`This week the top 3 share ${cup.prize} USDm`);
  if (cup.daysLeft && cup.daysLeft > 0) bits.push(`${cup.daysLeft} day${cup.daysLeft === 1 ? "" : "s"} left to enter`);
  return bits.length ? ` ${bits.join(", ")}.` : "";
};

const ENTRIES: Entry[] = [
  {
    id: "what",
    q: "What is Gambit?",
    keywords: ["what is gambit", "whats gambit", "about gambit", "explain gambit", "tell me about", "what can i do", "how does gambit"],
    a: () =>
      "Gambit is where you play classic board games like chess, Naija Whot, tic tac toe, snakes and Block Blitz. Play free against the bot to warm up, or stake a little and play a real person for real money. Win and it lands in your wallet the moment the game ends.",
  },
  {
    id: "free",
    q: "Is it free to play?",
    keywords: ["free", "cost", "how much", "do i pay", "price", "spend"],
    a: () =>
      "Yes. You can play the bot for free as much as you like, and the Weekly Cup is free to enter. You only put money down if you choose to play a staked match against a real person.",
  },
  {
    id: "start",
    q: "How do I start?",
    keywords: ["start", "begin", "how do i play", "first", "new", "get going", "how to play"],
    a: () =>
      "Open the app, sign in with your email, pick a game and tap Play. Start free against the bot to learn it, then try a staked match when you feel ready.",
  },
  {
    id: "earn",
    q: "How do I earn?",
    keywords: ["earn", "make money", "get paid", "win money", "reward", "profit", "cash"],
    a: (cup) =>
      "Three ways. Win a staked match and take the pot. Finish top 3 in the free Weekly Cup and share the prize. And claim your free daily reward every day for XP and a little G$." +
      cupLine(cup),
  },
  {
    id: "crypto",
    q: "Do I need crypto?",
    keywords: ["crypto", "bitcoin", "wallet", "need", "web3", "know crypto", "own"],
    a: () =>
      "No. Sign in with your email and a wallet is made for you automatically. You do not need to know anything about crypto to play or to get paid.",
  },
  {
    id: "withdraw",
    q: "How do I cash out?",
    keywords: ["withdraw", "cash out", "cashout", "money out", "send money", "bank", "take out", "payout"],
    a: () =>
      "Your winnings land straight in your wallet. From your profile you can send them to any address or wallet you use. Inside MiniPay you can cash out to your phone.",
  },
  {
    id: "staking",
    q: "How does a staked match work?",
    keywords: ["stake", "staked", "bet", "wager", "opponent", "versus", "against someone", "1v1", "real match"],
    a: () =>
      "Pick a game and a stake, as little as 0.10. Both players put in the same amount, the winner takes 95 percent, and it is paid to their wallet the second the game ends. A draw refunds both players.",
  },
  {
    id: "cup",
    q: "How does the Weekly Cup work?",
    keywords: ["cup", "weekly", "tournament", "leaderboard", "competition", "contest"],
    a: (cup) =>
      "The Weekly Cup is free to enter and humans only. Everyone plays the same board, and the top 3 scores share the prize, paid to their wallets." +
      cupLine(cup) +
      " A new cup starts every week.",
  },
  {
    id: "tokens",
    q: "What is USDm and G$?",
    keywords: ["usdm", "usdc", "g$", "gooddollar token", "stablecoin", "dollar", "what token", "currency"],
    a: () =>
      "USDm is a stablecoin, so 1 USDm is about 1 dollar. It is the money you stake and win. G$ is a free reward token you collect from your daily claims.",
  },
  {
    id: "daily",
    q: "What is the daily reward?",
    keywords: ["daily", "reward", "claim", "gift", "everyday", "each day"],
    a: () =>
      "Tap the daily reward on the home screen once a day. You get XP and a little G$ sent to your wallet. Come back tomorrow to keep your streak going.",
  },
  {
    id: "streak",
    q: "What is a streak?",
    keywords: ["streak", "flame", "come back", "consecutive", "in a row", "days in a row"],
    a: () =>
      "Your streak grows every day you show up and claim your reward. Longer streaks pay bigger daily rewards, so try not to break it.",
  },
  {
    id: "referral",
    q: "How do referrals work?",
    keywords: ["refer", "referral", "invite", "friend", "link", "code", "bring people"],
    a: () =>
      "Share your invite link from your profile. When a friend joins and plays, you earn a reward. The more friends who play, the more you collect.",
  },
  {
    id: "verify",
    q: "Why verify I am human?",
    keywords: ["verify", "human", "gooddollar", "goodid", "face", "verification", "prove"],
    a: () =>
      "Verifying proves you are a real person, not a bot. It is free and takes about a minute. It lets you enter humans only cups and keeps the leaderboard fair for everyone.",
  },
  {
    id: "safe",
    q: "Is my money safe?",
    keywords: ["safe", "trust", "scam", "legit", "real", "rug", "secure", "risk", "safety"],
    a: () =>
      "Every match and payout happens on Celo and anyone can check it on chain. The money you stake is held by a contract with no owner withdraw, so nobody can take it. Winners are paid automatically.",
  },
  {
    id: "fees",
    q: "What are the fees?",
    keywords: ["fee", "fees", "cut", "commission", "percent", "charge", "95", "5 percent"],
    a: () =>
      "The winner takes 95 percent of the pot. The small 5 percent keeps Gambit running. No deposits, no hidden charges, no withdrawal fees.",
  },
  {
    id: "games",
    q: "Which games can I play?",
    keywords: ["games", "which game", "what games", "chess", "whot", "snakes", "blitz", "list"],
    a: () =>
      "Chess, Naija Whot, Tic Tac Toe, Snakes and Ladders, and Block Blitz. Play any of them free against the bot, or staked against a real person.",
  },
  {
    id: "stuck",
    q: "My match got stuck or I was not paid",
    keywords: ["stuck", "lost money", "not paid", "didnt receive", "missing", "help", "problem", "error", "wrong"],
    a: () =>
      "If a match ever gets stuck, your stake is safe in escrow and you can reclaim it from the result screen. If something still looks off, message us on X at gambitcelo and we will sort it.",
  },
];

export const SUGGESTIONS = [
  "How do I start?",
  "Is it free to play?",
  "How do I earn?",
  "How does the Weekly Cup work?",
  "Do I need crypto?",
  "Is my money safe?",
];

const FALLBACK =
  "I am not sure about that one yet. Try one of these, or reach us on X at gambitcelo.";

// Map the many ways people say a thing to one canonical word, so real questions
// match even when the wording is not the same. Applied to BOTH the question and
// the keywords, so it stays consistent. Longer phrases first.
const SYNONYMS: [RegExp, string][] = [
  [/\bcash ?out\b|\btake out\b|\bpay ?out\b|\bredeem\b|\bwithdrawal\b|\bwithdrawing\b/g, "withdraw"],
  [/\bmy money\b|\bfunds\b|\bearnings\b|\bwinnings\b|\bprofit\b/g, "money"],
  [/\bsign ?up\b|\bregister\b|\bcreate (an )?account\b|\bget started\b|\bgetting started\b/g, "start"],
  [/\bmake money\b|\bget paid\b|\bwin money\b/g, "earn"],
  [/\blegit\b|\bscam\b|\brug\b|\btrustworthy\b|\breliable\b|\bsecure\b/g, "safe"],
  [/\bnaira\b|\bpound\b|\bdollars?\b/g, "money"],
  [/\bopponent\b|\bother player\b|\bsomeone else\b|\breal person\b|\bvs\b|\bversus\b/g, "opponent"],
  [/\bgooddollar\b|\bgood dollar\b|\bgoodid\b|\bgood id\b/g, "verify"],
  [/\brules\b|\bhow to win\b/g, "play"],
  [/\bwhot\b|\bchess\b|\bsnakes?\b|\bladders?\b|\bblitz\b|\btic ?tac ?toe\b/g, "games"],
];

const normalize = (raw: string) => {
  let s = ` ${raw.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").replace(/\s+/g, " ").trim()} `;
  for (const [re, to] of SYNONYMS) s = s.replace(re, to);
  return s.replace(/\s+/g, " ").trim();
};

/** Score how well a question matches an entry. Phrase hits weigh more. */
function score(query: string, e: Entry): number {
  const n = ` ${normalize(query)} `;
  let s = 0;
  for (const kw of e.keywords) {
    const k = normalize(kw);
    if (!k) continue;
    if (n.includes(` ${k} `)) s += k.includes(" ") ? 3 : 2; // whole word / phrase
    else if (n.includes(k)) s += k.includes(" ") ? 2 : 1; // substring
  }
  // shared meaningful words with the canonical question are a weak signal
  const qWords = new Set(normalize(e.q).split(" ").filter((w) => w.length > 3));
  for (const w of normalize(query).split(" ")) if (w.length > 3 && qWords.has(w)) s += 0.5;
  return s;
}

export interface BotReply {
  text: string;
  matched: boolean;
  /** "did you mean" candidate questions, shown as tappable chips */
  suggestions?: string[];
}

/**
 * Route a free-text question to the best curated answer — but only answer when
 * confident. When the top match is weak or two answers are close, we OFFER the
 * candidate questions instead of guessing, so the bot never confidently says the
 * wrong thing about someone's money.
 */
export function askBot(query: string, cup: CupInfo | null): BotReply {
  if (!normalize(query)) return { text: FALLBACK, matched: false, suggestions: SUGGESTIONS.slice(0, 4) };

  const ranked = ENTRIES.map((e) => ({ e, s: score(query, e) }))
    .sort((a, b) => b.s - a.s);
  const top = ranked[0];
  const second = ranked[1];

  // Confident: a clear hit that is clearly ahead of the runner-up (this covers a
  // single strong keyword like "withdraw" or "fees").
  if (top.s >= 2 && top.s - second.s >= 1.5) return { text: top.e.a(cup), matched: true };
  // Very strong hit, answer even if a second topic is somewhat close.
  if (top.s >= 4) return { text: top.e.a(cup), matched: true };

  // Some signal but two topics are close — ask rather than guess wrong.
  if (top.s >= 1) {
    const picks = ranked.filter((r) => r.s >= 1).slice(0, 3).map((r) => r.e.q);
    return {
      text: "I want to get this right. Did you mean one of these?",
      matched: false,
      suggestions: picks.length ? picks : SUGGESTIONS.slice(0, 4),
    };
  }

  // No real signal.
  return { text: FALLBACK, matched: false, suggestions: SUGGESTIONS.slice(0, 4) };
}
