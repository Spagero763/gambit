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

-- Realtime: clients subscribe to match + move changes
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table moves;

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
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_xp_idx on profiles (xp desc);

alter table profiles enable row level security;
drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select using (true);

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
