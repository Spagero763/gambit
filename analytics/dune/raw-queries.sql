-- Gambit / ArcadeEscrow on Celo — RAW log queries.
-- These need no contract decoding, so they work the day you open Dune.
-- Each numbered block is a separate Dune query (one chart each).
--
-- Escrow: 0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05
--
-- IMPORTANT: `createMatch` seats the creator directly and emits ONLY
-- MatchCreated — it never emits MatchJoined. So a player census must UNION
-- creators (MatchCreated.topic2) with joiners (MatchJoined.topic2). Counting
-- MatchJoined alone silently drops every match creator.


-- ============================================================
-- 1. Headline counters  (visualization: Counter, one per column)
-- ============================================================
SELECT
    count(*) FILTER (WHERE topic0 = 0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379) AS matches_created,
    count(*) FILTER (WHERE topic0 = 0xc331f8a6361aaab72e5a843e5ab68249dabb2c4146eb69ae85d0f328e2708d0d) AS matches_played,
    count(*) FILTER (WHERE topic0 = 0xc9b626ea06bea9216f5fb42afbda7b2d6d8a886073fbdaf7c08885a06e6b3fc1) AS matches_settled,
    count(*) FILTER (WHERE topic0 = 0xbe9561483b1664685b575e72966584b8b66b253bd4f2e55e045e00db8fc134af) AS matches_cancelled
FROM celo.logs
WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05;


-- ============================================================
-- 2. Unique players ever  (visualization: Counter)
-- Creators come from MatchCreated, opponents from MatchJoined. Both carry the
-- wallet in topic2 (indexed). UNION de-duplicates across both.
-- ============================================================
WITH players AS (
    SELECT topic2 AS player
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 = 0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379  -- MatchCreated
    UNION
    SELECT topic2 AS player
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 = 0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903  -- MatchJoined
)
SELECT count(*) AS unique_players FROM players;


-- ============================================================
-- 3. Matches settled per day  (visualization: Bar chart)
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
-- 4. Cumulative unique players  (visualization: Area chart)
-- The curve that shows the app is growing.
-- ============================================================
WITH appearances AS (
    SELECT topic2 AS player, block_time
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 IN (
          0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379,  -- MatchCreated
          0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903   -- MatchJoined
      )
),
firsts AS (
    SELECT player, min(block_time) AS first_seen
    FROM appearances
    GROUP BY 1
),
daily AS (
    SELECT date_trunc('day', first_seen) AS day, count(*) AS new_players
    FROM firsts
    GROUP BY 1
)
SELECT day, sum(new_players) OVER (ORDER BY day) AS cumulative_players
FROM daily
ORDER BY day;


-- ============================================================
-- 5. New vs returning players per day  (visualization: Bar, stacked)
-- The chart that actually impresses: proof people come back.
-- ============================================================
WITH appearances AS (
    SELECT topic2 AS player, block_time
    FROM celo.logs
    WHERE contract_address = 0xb34548ad3a45c2a571f99341e5fb32abb4facd05
      AND topic0 IN (
          0xa4edf7195708221b6c1cf1dcabad5ebd0426ce57fdf90aea8a2c1d560a6d1379,
          0xb07daf0878a6181e441b8caabe246dc383f79aeadc52ea80f5f82635f761d903
      )
),
tagged AS (
    SELECT
        player,
        block_time,
        min(block_time) OVER (PARTITION BY player) AS first_seen
    FROM appearances
)
SELECT
    date_trunc('day', block_time) AS day,
    count(DISTINCT player) FILTER (WHERE block_time = first_seen) AS new_players,
    count(DISTINCT player) FILTER (WHERE block_time > first_seen) AS returning_players
FROM tagged
GROUP BY 1
ORDER BY 1;


-- ============================================================
-- 6. Health: settled vs cancelled per week  (visualization: Bar)
-- Cancelled should stay at or near zero. This is the trust chart.
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


-- ============================================================
-- 7. Daily G$ rewards paid  (Claims vault)
-- Vault: 0x47302b7e3C7674bb307fd7768eA6d2462C12Ebd5  (token: G$)
-- ============================================================
SELECT
    date_trunc('day', block_time) AS day,
    count(*) AS g_rewards_paid
FROM celo.logs
WHERE contract_address = 0x47302b7e3c7674bb307fd7768ea6d2462c12ebd5
  AND topic0 = 0xf79f6e9aeaf88b46a1aaa7896898daa4182a97f19e130f520bad6030e2849c79  -- RewardPaid
GROUP BY 1
ORDER BY 1;


-- ============================================================
-- 8. Referral rewards paid  (Referral vault)
-- Vault: 0xED328Ce807ad1F97472b119755fB1d43E1fD0A75  (token: USDm)
-- ============================================================
SELECT
    date_trunc('day', block_time) AS day,
    count(*) AS referral_rewards_paid
FROM celo.logs
WHERE contract_address = 0xed328ce807ad1f97472b119755fb1d43e1fd0a75
  AND topic0 = 0xf79f6e9aeaf88b46a1aaa7896898daa4182a97f19e130f520bad6030e2849c79  -- RewardPaid
GROUP BY 1
ORDER BY 1;


-- ============================================================
-- 9. Weekly Cup: weeks settled  (WeeklyCup)
-- Vault: 0x6043bec74cfE8bF00D395DdddD2C2f85a9915A15  (token: USDm)
-- WeekSettled: topic1 = week index (indexed uint256)
-- ============================================================
SELECT
    block_time,
    bytearray_to_uint256(topic1) AS week_index,
    tx_hash
FROM celo.logs
WHERE contract_address = 0x6043bec74cfe8bf00d395dddd2c2f85a9915a15
  AND topic0 = 0x41ea3f5df84b8e7e0955daec724844c6364095296fd020a6c49004c3377eb6c9  -- WeekSettled
ORDER BY block_time DESC;


-- ============================================================
-- 10. All rewards paid across BOTH vaults, split by vault
-- Both RewardsVaults share an ABI; tell them apart by address.
-- ============================================================
SELECT
    date_trunc('day', block_time) AS day,
    CASE contract_address
        WHEN 0x47302b7e3c7674bb307fd7768ea6d2462c12ebd5 THEN 'Daily G$ claims'
        WHEN 0xed328ce807ad1f97472b119755fb1d43e1fd0a75 THEN 'Referral rewards'
    END AS reward_type,
    count(*) AS payouts
FROM celo.logs
WHERE contract_address IN (
        0x47302b7e3c7674bb307fd7768ea6d2462c12ebd5,
        0xed328ce807ad1f97472b119755fb1d43e1fd0a75
      )
  AND topic0 = 0xf79f6e9aeaf88b46a1aaa7896898daa4182a97f19e130f520bad6030e2849c79
GROUP BY 1, 2
ORDER BY 1;
