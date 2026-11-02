USE arena;
-- 1. JOIN + GROUP BY + HAVING + ORDER BY: active guilds with at least two members.
SELECT g.guild_name, p.username AS leader, COUNT(gm.player_id) AS members
FROM guild g JOIN player p ON p.player_id = g.leader_id
JOIN guild_membership gm ON gm.guild_id = g.guild_id
GROUP BY g.guild_id, g.guild_name, p.username
HAVING COUNT(gm.player_id) >= 2 ORDER BY members DESC;

-- 2. Aggregate statistics across matches, including players without participation.
SELECT p.username, COALESCE(SUM(mp.kills), 0) AS kills,
       COALESCE(SUM(mp.deaths), 0) AS deaths, get_player_kd(p.player_id) AS kd
FROM player p LEFT JOIN match_participation mp ON mp.player_id = p.player_id
GROUP BY p.player_id, p.username ORDER BY kills DESC;

-- 3. Correlated subquery: active players not yet in a selected match.
SET @MatchId = 1;
SELECT p.player_id, p.username FROM player p
WHERE p.status = 'ACTIVE' AND NOT EXISTS (
  SELECT 1 FROM match_participation mp
  WHERE mp.match_id = @MatchId AND mp.player_id = p.player_id
) ORDER BY p.username;

-- 4. Inventory valuation, preserving exact decimal arithmetic.
SELECT p.username, SUM(i.quantity * it.base_price) AS inventory_value
FROM inventory i JOIN player p ON p.player_id = i.player_id
JOIN item it ON it.item_id = i.item_id
GROUP BY p.player_id, p.username ORDER BY inventory_value DESC;

-- 5. Composite relationship: achievement earned by a participant in a match.
SELECT p.username, a.title, a.points, gm.match_id, gm.mode_code
FROM player_achievement pa JOIN player p ON p.player_id = pa.player_id
JOIN achievement a ON a.achievement_code = pa.achievement_code
JOIN game_match gm ON gm.match_id = pa.match_id ORDER BY pa.unlocked_at DESC;

-- Mutation examples below are comments: use real IDs in an isolated demo database.
-- CALL transfer_item(sender_id, receiver_id, item_id, positive_quantity);
-- UPDATE game_match SET status = 'COMPLETED' WHERE match_id = 2;
-- The trigger supplies ended_at and CHECK constraints verify the resulting state.
-- CREATE/ALTER appear in the schema/migrations; DROP is demonstrated by fresh setup
-- and replacement of the old transfer procedure. Never run destructive setup on live data.
