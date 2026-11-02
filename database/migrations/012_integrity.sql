-- Apply once after 011. Existing invalid records must be corrected before migration.
USE arena;
ALTER TABLE player
    ADD CONSTRAINT ck_player_username CHECK (CHAR_LENGTH(TRIM(username)) BETWEEN 1 AND 24),
    ADD CONSTRAINT ck_player_email CHECK (email REGEXP '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
    ADD CONSTRAINT ck_player_role CHECK (role IN ('ADMIN', 'PLAYER')),
    ADD CONSTRAINT ck_player_status CHECK (status IN ('ACTIVE', 'BANNED'));
ALTER TABLE guild
    MODIFY leader_id BIGINT NULL,
    ADD CONSTRAINT ck_guild_name CHECK (CHAR_LENGTH(TRIM(guild_name)) > 0),
    ADD CONSTRAINT ck_guild_tag CHECK (CHAR_LENGTH(TRIM(guild_tag)) = 4),
    ADD CONSTRAINT ck_guild_treasury CHECK (treasury >= 0);
ALTER TABLE item
    ADD CONSTRAINT ck_item_name CHECK (CHAR_LENGTH(TRIM(item_name)) > 0),
    ADD CONSTRAINT ck_item_price CHECK (base_price >= 0),
    ADD CONSTRAINT ck_item_rarity CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
    ADD CONSTRAINT ck_item_subtype CHECK (
        (item_kind = 'WEAPON' AND damage IS NOT NULL AND damage >= 0 AND slot_type IS NULL)
        OR (item_kind = 'COSMETIC' AND damage IS NULL AND slot_type IS NOT NULL AND CHAR_LENGTH(TRIM(slot_type)) > 0)
    );
ALTER TABLE inventory ADD CONSTRAINT ck_inventory_quantity CHECK (quantity > 0);
ALTER TABLE game_mode ADD CONSTRAINT ck_mode_size CHECK (team_size > 0);
ALTER TABLE season ADD CONSTRAINT ck_season_dates CHECK (end_date >= start_date);
ALTER TABLE game_match
    ADD CONSTRAINT ck_match_status CHECK (status IN ('LIVE', 'COMPLETED', 'ABANDONED')),
    ADD CONSTRAINT ck_match_times CHECK (
      (status = 'LIVE' AND ended_at IS NULL) OR
      (status IN ('COMPLETED', 'ABANDONED') AND ended_at IS NOT NULL AND ended_at >= started_at)
    );
ALTER TABLE match_participation
    ADD CONSTRAINT ck_participation_stats CHECK (team_no > 0 AND kills >= 0 AND deaths >= 0 AND damage_dealt >= 0);
ALTER TABLE match_round
    ADD CONSTRAINT ck_round_values CHECK (round_no > 0 AND (winning_team IS NULL OR winning_team > 0) AND (duration_sec IS NULL OR duration_sec >= 0));
ALTER TABLE achievement
    ADD CONSTRAINT ck_achievement_values CHECK (CHAR_LENGTH(TRIM(achievement_code)) > 0 AND CHAR_LENGTH(TRIM(title)) > 0 AND points >= 0);

DELIMITER //
CREATE TRIGGER trg_player_validate_insert BEFORE INSERT ON player FOR EACH ROW
BEGIN
    IF NEW.date_of_birth > CURRENT_DATE OR NEW.date_of_birth < '1900-01-01' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid date of birth';
    END IF;
END //
CREATE TRIGGER trg_player_validate_update BEFORE UPDATE ON player FOR EACH ROW
BEGIN
    IF NEW.date_of_birth > CURRENT_DATE OR NEW.date_of_birth < '1900-01-01' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid date of birth';
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS transfer_item;
DELIMITER //
CREATE PROCEDURE transfer_item(
    IN p_sender_id BIGINT,
    IN p_receiver_id BIGINT,
    IN p_item_id BIGINT,
    IN p_qty INT
)
BEGIN
    DECLARE current_qty INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    IF p_qty IS NULL OR p_qty <= 0 OR p_sender_id = p_receiver_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid transfer quantity or recipient';
    END IF;

    SELECT quantity INTO current_qty FROM inventory
    WHERE player_id = p_sender_id AND item_id = p_item_id FOR UPDATE;
    IF current_qty IS NULL OR current_qty < p_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient inventory';
    END IF;

    IF current_qty = p_qty THEN
        DELETE FROM inventory WHERE player_id = p_sender_id AND item_id = p_item_id;
    ELSE
        UPDATE inventory SET quantity = quantity - p_qty
        WHERE player_id = p_sender_id AND item_id = p_item_id;
    END IF;
    INSERT INTO inventory (player_id, item_id, quantity)
    VALUES (p_receiver_id, p_item_id, p_qty)
    ON DUPLICATE KEY UPDATE quantity = quantity + p_qty;
    COMMIT;
END //

DELIMITER ;
