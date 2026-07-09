-- Gambit / ArcadeEscrow on Celo — DECODED queries.
-- Use these once Dune approves the contract for decoding (see README.md).
-- Namespace assumes you submitted the project as `gambit`; if you named it
-- something else, rename `gambit_celo` throughout.
--
-- REMEMBER: MatchSettled has no token field. Volume and payouts MUST join back
-- to MatchCreated on the match id to learn the token, then scale by its
-- decimals. USDC is 6 decimals; USDm and G$ are 18.


-- ============================================================
-- 0. Shared token reference (paste into each query that needs it)
-- ============================================================
-- WITH tokens (token, symbol, decimals) AS (
--     VALUES
--         (0x765de816845861e75a25fca122bb6898b8b1282a, 'USDm', 18),
--         (0xceba9300f2b948710d2653dd7b07f33a8b32118c, 'USDC', 6),
--         (0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a, 'G$',   18)
-- )


-- ============================================================
-- 1. Total paid to winners, by token
-- payouts is an array, so unnest it. Do NOT sum fee here (it would fan out).
-- ============================================================
WITH tokens (token, symbol, decimals) AS (
    VALUES
        (0x765de816845861e75a25fca122bb6898b8b1282a, 'USDm', 18),
        (0xceba9300f2b948710d2653dd7b07f33a8b32118c, 'USDC', 6),
        (0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a, 'G$',   18)
),
created AS (
    SELECT id, token FROM gambit_celo.ArcadeEscrow_evt_MatchCreated
),
paid AS (
    SELECT s.id, p.payout
    FROM gambit_celo.ArcadeEscrow_evt_MatchSettled s
    CROSS JOIN UNNEST(s.payouts) AS p(payout)
)
SELECT
    t.symbol,
    sum(CAST(p.payout AS double) / power(10, t.decimals)) AS paid_to_winners
FROM paid p
JOIN created c ON c.id = p.id
JOIN tokens  t ON t.token = c.token
GROUP BY 1
ORDER BY 2 DESC;


-- ============================================================
-- 2. Fees earned, by token (one fee per settled match — no unnest)
-- ============================================================
WITH tokens (token, symbol, decimals) AS (
    VALUES
        (0x765de816845861e75a25fca122bb6898b8b1282a, 'USDm', 18),
        (0xceba9300f2b948710d2653dd7b07f33a8b32118c, 'USDC', 6),
        (0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a, 'G$',   18)
),
created AS (
    SELECT id, token FROM gambit_celo.ArcadeEscrow_evt_MatchCreated
)
SELECT
    t.symbol,
    sum(CAST(s.fee AS double) / power(10, t.decimals)) AS fees_earned
FROM gambit_celo.ArcadeEscrow_evt_MatchSettled s
JOIN created c ON c.id = s.id
JOIN tokens  t ON t.token = c.token
GROUP BY 1
ORDER BY 2 DESC;


-- ============================================================
-- 3. Staked volume per day, by token
-- Pot = stake * capacity, counted when the match actually filled (Activated).
-- ============================================================
WITH tokens (token, symbol, decimals) AS (
    VALUES
        (0x765de816845861e75a25fca122bb6898b8b1282a, 'USDm', 18),
        (0xceba9300f2b948710d2653dd7b07f33a8b32118c, 'USDC', 6),
        (0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a, 'G$',   18)
)
SELECT
    date_trunc('day', a.evt_block_time) AS day,
    t.symbol,
    sum(CAST(c.stake AS double) / power(10, t.decimals) * c.capacity) AS volume_staked
FROM gambit_celo.ArcadeEscrow_evt_MatchActivated a
JOIN gambit_celo.ArcadeEscrow_evt_MatchCreated  c ON c.id = a.id
JOIN tokens t ON t.token = c.token
GROUP BY 1, 2
ORDER BY 1;


-- ============================================================
-- 4. Which games people actually stake on
-- gameType is a uint8 set at creation. Keep this mapping in sync with the app.
-- ============================================================
SELECT
    CASE gameType
        WHEN 0 THEN 'Chess'
        WHEN 1 THEN 'Tic-Tac-Toe'
        WHEN 2 THEN 'Snakes & Ladders'
        WHEN 3 THEN 'Naija Whot'
        WHEN 4 THEN 'Block Blitz'
        ELSE 'Other'
    END AS game,
    count(*) AS matches_created
FROM gambit_celo.ArcadeEscrow_evt_MatchCreated
GROUP BY 1
ORDER BY 2 DESC;


-- ============================================================
-- 5. Average pot size and time-to-settle (product health)
-- ============================================================
WITH tokens (token, symbol, decimals) AS (
    VALUES
        (0x765de816845861e75a25fca122bb6898b8b1282a, 'USDm', 18),
        (0xceba9300f2b948710d2653dd7b07f33a8b32118c, 'USDC', 6),
        (0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a, 'G$',   18)
)
SELECT
    t.symbol,
    count(*) AS settled_matches,
    avg(CAST(c.stake AS double) / power(10, t.decimals) * c.capacity) AS avg_pot,
    approx_percentile(date_diff('second', a.evt_block_time, s.evt_block_time), 0.5) AS median_seconds_to_settle
FROM gambit_celo.ArcadeEscrow_evt_MatchSettled  s
JOIN gambit_celo.ArcadeEscrow_evt_MatchActivated a ON a.id = s.id
JOIN gambit_celo.ArcadeEscrow_evt_MatchCreated   c ON c.id = s.id
JOIN tokens t ON t.token = c.token
GROUP BY 1;
