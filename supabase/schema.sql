-- Gambit backend schema. Run in the Supabase SQL editor.
-- The server (service_role) is authoritative over match state and results.

create table if not exists matches (
  id            bigint primary key,          -- on-chain match id
  game          text not null,               -- chess | tic-tac-toe | snakes | whot | blocks
  chain_id      integer not null,
  stake         text not null,               -- stake in wei, as string
  creator       text not null,               -- wallet address (lowercase)
  opponent      text,                        -- wallet address once joined
  status        text not null default 'open',-- open | active | settling | settled | cancelled
  state         jsonb not null default '{}', -- authoritative game state
  turn          text,                        -- whose move (address)
  winner        text,                        -- resolved winner address (or null draw)
  settle_tx     text,                        -- declareResult tx hash
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists matches_status_idx on matches (status);
create index if not exists matches_game_idx on matches (game);

-- last settlement error (so a stuck payout surfaces the real revert reason)
alter table matches add column if not exists settle_error text;
-- stake token (address) + its decimals, so amounts format correctly (cUSD=18, USDC=6)
alter table matches add column if not exists token text;
alter table matches add column if not exists decimals integer not null default 18;

-- moves: append-only log, lets the server replay and validate
create table if not exists moves (
  id          bigserial primary key,
  match_id    bigint not null references matches (id) on delete cascade,
  player      text not null,
  move        jsonb not null,
  ply         integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists moves_match_idx on moves (match_id, ply);

-- Realtime: clients subscribe to match + move changes.
-- Guarded so the whole file stays safely re-runnable (ADD TABLE is not idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moves'
  ) then
    alter publication supabase_realtime add table moves;
  end if;
end $$;

-- RLS: clients may READ matches/moves (public game state) but never write
-- directly. All writes go through the server (service_role) which bypasses RLS.
alter table matches enable row level security;
alter table moves enable row level security;

drop policy if exists "matches readable" on matches;
create policy "matches readable" on matches for select using (true);

drop policy if exists "moves readable" on moves;
create policy "moves readable" on moves for select using (true);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists matches_touch on matches;
create trigger matches_touch before update on matches
  for each row execute function touch_updated_at();

-- profiles: one per wallet (lowercased address). Identity (name/avatar/photo)
-- + synced progression (xp/streak). Writes go through the server after a
-- wallet-signature check; reads are public.
create table if not exists profiles (
  address      text primary key,            -- lowercased wallet address
  name         text,
  avatar       text not null default 'teal',-- colour id (fallback when no photo)
  avatar_image text,                         -- small data URL ('' / null = none)
  xp           integer not null default 0,
  streak       integer not null default 0,
  last_played  text,                         -- YYYY-MM-DD
  played       integer not null default 0,
  wins         integer not null default 0,
  referred_by  text,                          -- wallet that invited them (set once)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_xp_idx on profiles (xp desc);
alter table profiles add column if not exists referred_by text;

alter table profiles enable row level security;
drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select using (true);

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

-- scores: free-play results for weekly events (e.g. Block Blitz Showdown).
-- Public read; writes go through the server. Casual board (no funds at stake).
create table if not exists scores (
  id          bigserial primary key,
  address     text not null,               -- player wallet (lowercase)
  game        text not null,               -- game slug
  score       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists scores_game_time_idx on scores (game, created_at desc);

alter table scores enable row level security;
drop policy if exists "scores readable" on scores;
create policy "scores readable" on scores for select using (true);

-- tournaments: staked score pools (3-8 players). One on-chain escrow match per
-- tournament; the top three split the pot 50/30/20. Reads public; writes server.
create table if not exists tournaments (
  id           bigint primary key,            -- on-chain escrow match id
  game         text not null,                 -- game slug (e.g. blocks)
  chain_id     integer not null,
  token        text,
  decimals     integer not null default 18,
  stake        text not null,                 -- per-player stake (wei)
  capacity     integer not null,              -- 3..8
  seed         bigint not null,               -- shared seed (fair, server-set)
  creator      text not null,
  status       text not null default 'open',  -- open|active|settling|settled|cancelled
  winners      jsonb,                         -- [1st,2nd,3rd] after settle
  settle_tx    text,
  settle_error text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tournaments_status_idx on tournaments (status);

create table if not exists tournament_players (
  tournament_id bigint not null references tournaments (id) on delete cascade,
  address       text not null,
  score         integer,                       -- null until they play
  submitted_at  timestamptz,
  joined_at     timestamptz not null default now(),
  primary key (tournament_id, address)
);

alter table tournaments enable row level security;
alter table tournament_players enable row level security;
drop policy if exists "tournaments readable" on tournaments;
create policy "tournaments readable" on tournaments for select using (true);
drop policy if exists "tournament_players readable" on tournament_players;
create policy "tournament_players readable" on tournament_players for select using (true);

drop trigger if exists tournaments_touch on tournaments;
create trigger tournaments_touch before update on tournaments
  for each row execute function touch_updated_at();

-- match_private: hidden game state (e.g. Whot hands + market). RLS denies all
-- client reads; ONLY the server (service_role, which bypasses RLS) ever reads
-- or writes it. Clients receive a redacted, per-player view via the API.
create table if not exists match_private (
  match_id  bigint primary key references matches (id) on delete cascade,
  state     jsonb not null default '{}'
);

alter table match_private enable row level security;
-- (intentionally NO select/insert/update policies => anon clients get nothing)
