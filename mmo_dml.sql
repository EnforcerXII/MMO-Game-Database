USE arena;

-- Disable Foreign Key checks so insertion order doesn't fail on circular references
SET FOREIGN_KEY_CHECKS = 0;

-- 1. GAME MODE
INSERT INTO game_mode (mode_code, mode_name, team_size) VALUES
('BR_SOLO', 'Battle Royale Solo', 1),
('BR_SQUAD', 'Battle Royale Squad', 4),
('DOM_5V5', 'Domination 5v5', 5);

-- 2. SEASON
INSERT INTO season (season_name, start_date, end_date) VALUES
('Season 1: Genesis', '2026-01-01', '2026-03-31'),
('Season 2: Escalation', '2026-04-01', '2026-06-30');

-- 3. PLAYER
INSERT INTO player (username, email, password_hash, date_of_birth, role, status) VALUES
('ShadowSlayer', 'shadow@example.com', '$2a$12$eImiTXuWVxfM37uY4JANjO2B.86C.1T2yL5Iu6f5aGgY3g8z5bJ1S', '1998-05-14', 'ADMIN', 'ACTIVE'),
('Valkyrie', 'valk@example.com', '$2a$12$eImiTXuWVxfM37uY4JANjO2B.86C.1T2yL5Iu6f5aGgY3g8z5bJ1S', '2001-09-22', 'PLAYER', 'ACTIVE'),
('PixelKnight', 'pixel@example.com', '$2a$12$eImiTXuWVxfM37uY4JANjO2B.86C.1T2yL5Iu6f5aGgY3g8z5bJ1S', '1995-12-03', 'PLAYER', 'ACTIVE');

-- 4. FRIENDSHIP
INSERT INTO friendship (player_low, player_high, status) VALUES
(1, 2, 'ACCEPTED'),
(1, 3, 'PENDING'),
(2, 3, 'ACCEPTED');

-- 5. ITEM
INSERT INTO item (item_kind, item_name, rarity, base_price, damage, slot_type) VALUES
('WEAPON', 'Dragonfire Rifle', 'LEGENDARY', 1500.00, 85, NULL),
('WEAPON', 'Iron Dagger', 'COMMON', 50.00, 20, NULL),
('COSMETIC', 'Neon Cyber Visor', 'RARE', 300.00, NULL, 'HELMET');

-- 6. INVENTORY
INSERT INTO inventory (player_id, item_id, quantity) VALUES
(1, 1, 1),
(1, 3, 1),
(2, 2, 2),
(3, 1, 1);

-- 7. GUILD
INSERT INTO guild (guild_name, guild_tag, leader_id, treasury) VALUES
('Alpha Vanguard', 'AVNG', 1, 5000.00),
('Phoenix Order', 'PHNX', 2, 1200.50);

-- 8. GUILD MEMBERSHIP
INSERT INTO guild_membership (guild_id, player_id, guild_role) VALUES
(1, 1, 'LEADER'),
(1, 3, 'OFFICER'),
(2, 2, 'LEADER');

-- 9. GAME MATCH
INSERT INTO game_match (mode_code, season_id, started_at, ended_at, status) VALUES
('BR_SQUAD', 1, '2026-02-10 14:00:00', '2026-02-10 14:25:00', 'COMPLETED'),
('DOM_5V5', 1, '2026-02-10 15:00:00', NULL, 'LIVE');

-- 10. MATCH PARTICIPATION
INSERT INTO match_participation (match_id, player_id, team_no, kills, deaths, damage_dealt) VALUES
(1, 1, 1, 8, 1, 1450),
(1, 2, 1, 5, 2, 980),
(1, 3, 2, 2, 8, 420);

-- 11. MATCH ROUND
INSERT INTO match_round (match_id, round_no, winning_team, duration_sec) VALUES
(1, 1, 1, 300),
(1, 2, 1, 420),
(2, 1, 2, 180);

-- 12. ACHIEVEMENT
INSERT INTO achievement (achievement_code, title, points) VALUES
('FIRST_BLOOD', 'First Blood', 10),
('PENTA_KILL', 'Pentakill Legend', 50),
('VICTORY_ROYALE', 'Last Man Standing', 25);

-- 13. PLAYER ACHIEVEMENT
INSERT INTO player_achievement (player_id, achievement_code, match_id) VALUES
(1, 'FIRST_BLOOD', 1),
(1, 'VICTORY_ROYALE', 1),
(2, 'FIRST_BLOOD', 1);

-- Re-enable Foreign Key checks
SET FOREIGN_KEY_CHECKS = 1;

DELIMITER //

-- Triggers, Functions, Procedures
CREATE TRIGGER trg_friendship_auto_sort
BEFORE INSERT ON friendship
FOR EACH ROW
BEGIN
    DECLARE temp_id BIGINT;
    IF NEW.player_low > NEW.player_high THEN
        SET temp_id = NEW.player_low;
        SET NEW.player_low = NEW.player_high;
        SET NEW.player_high = temp_id;
    END IF;
END //

CREATE TRIGGER trg_update_match_ended_at
BEFORE UPDATE ON game_match
FOR EACH ROW
BEGIN
    IF (NEW.status IN ('COMPLETED', 'ABANDONED')) AND OLD.status = 'LIVE' THEN
        SET NEW.ended_at = CURRENT_TIMESTAMP;
    END IF;
END //

CREATE FUNCTION get_player_kd(p_id BIGINT)
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_kills INT DEFAULT 0;
    DECLARE total_deaths INT DEFAULT 0;

    SELECT COALESCE(SUM(kills), 0), COALESCE(SUM(deaths), 0)
    INTO total_kills, total_deaths
    FROM match_participation
    WHERE player_id = p_id;

    IF total_deaths = 0 THEN
        RETURN total_kills;
    END IF;

    RETURN ROUND(total_kills / total_deaths, 2);
END //

CREATE PROCEDURE transfer_item(
    IN p_sender_id BIGINT,
    IN p_receiver_id BIGINT,
    IN p_item_id BIGINT,
    IN p_qty INT
)
BEGIN
    DECLARE current_qty INT DEFAULT 0;

    SELECT quantity INTO current_qty
    FROM inventory
    WHERE player_id = p_sender_id AND item_id = p_item_id;

    IF current_qty >= p_qty THEN
        UPDATE inventory
        SET quantity = quantity - p_qty
        WHERE player_id = p_sender_id AND item_id = p_item_id;

        DELETE FROM inventory
        WHERE player_id = p_sender_id AND item_id = p_item_id AND quantity = 0;

        INSERT INTO inventory (player_id, item_id, quantity)
        VALUES (p_receiver_id, p_item_id, p_qty)
        ON DUPLICATE KEY UPDATE quantity = quantity + p_qty;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transfer failed: Sender does not have enough quantity.';
    END IF;
END //

DELIMITER ;
