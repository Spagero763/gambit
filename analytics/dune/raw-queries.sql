-- Gambit / ArcadeEscrow on Celo — RAW log queries.
-- These need no contract decoding, so they work the day you open Dune.
-- Each block is a separate Dune query (one chart each).
--
-- Escrow: 0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05


-- ============================================================
-- 1. Headline counters (Big Number charts)
-- ============================================================
SELECT
    count(*) FILTER (WHERE topic0 = 0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379) AS matches_created,
    count(*) FILTER (WHERE topic0 = 0xc331f8a6361aaab72e5a843e5ab68249dabb2c4146eb69ae85d0f328e2708d0d) AS matches_played,
    count(*) FILTER (WHERE topic0 = 0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1) AS matches_settled,
    count(*) FILTER (WHERE topic0 = 0xbe9561483b1664685b575e72966584b8b66b253bd4f2e55e045e00db8fc134af) AS matches_cancelled
FROM celo.logs
WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05;


-- ============================================================
-- 2. Unique players ever
-- MatchJoined: topic1 = match id (indexed), topic2 = player (indexed)
-- ============================================================
SELECT count(DISTINCT topic2) AS unique_players
FROM celo.logs
WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
  AND topic0 = 0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903;


-- ============================================================
-- 3. Matches settled per day (bar chart — the growth line)
-- ============================================================
SELECT
    date_trunc('day', block_time) AS day,
    count(*) AS matches_settled
FROM celo.logs
WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
  AND topic0 = 0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1
GROUP BY 1
ORDER BY 1;


-- ============================================================
-- 4. New vs returning players per day
-- A player's first MatchJoined is their signup moment.
-- ============================================================
WITH joins AS (
    SELECT
        topic2 AS player,
        block_time,
        min(block_time) OVER (PARTITION BY topic2) AS first_seen
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 = 0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903
)
SELECT
    date_trunc('day', block_time) AS day,
    count(DISTINCT player) FILTER (WHERE block_time = first_seen) AS new_players,
    count(DISTINCT player) FILTER (WHERE block_time > first_seen) AS returning_players
FROM joins
GROUP BY 1
ORDER BY 1;


-- ============================================================
-- 5. Cumulative unique players (the chart that shows a curve)
-- ============================================================
WITH firsts AS (
    SELECT topic2 AS player, min(block_time) AS first_seen
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 = 0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903
    GROUP BY 1
)
SELECT
    day,
    sum(new_players) OVER (ORDER BY day) AS cumulative_players
FROM (
    SELECT date_trunc('day', first_seen) AS day, count(*) AS new_players
    FROM firsts
    GROUP BY 1
)
ORDER BY day;


-- ============================================================
-- 6. Health: settle rate. Cancelled matches should stay near zero.
-- ============================================================
SELECT
    date_trunc('week', block_time) AS week,
    count(*) FILTER (WHERE topic0 = 0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1) AS settled,
    count(*) FILTER (WHERE topic0 = 0xbe9561483b1664685b575e72966584b8b66b253bd4f2e55e045e00db8fc134af) AS cancelled
FROM celo.logs
WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
  AND topic0 IN (
      0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1,
      0xbe9561483b1664685b575e72966584b8b66b253bd4f2e55e045e00db8fc134af
  )
GROUP BY 1
ORDER BY 1;
