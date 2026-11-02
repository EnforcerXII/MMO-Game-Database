-- MySQL 8.0.16+ version of the arena schema (InnoDB, utf8mb4)
-- In MySQL, "schema" and "database" are the same thing.

DROP DATABASE IF EXISTS arena;
CREATE DATABASE arena CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE arena;

-- 1. PLAYER (Strong Entity)
CREATE TABLE player (
    player_id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(24) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash CHAR(60) NOT NULL,
    date_of_birth DATE NOT NULL,
    role ENUM('PLAYER', 'ADMIN') NOT NULL DEFAULT 'PLAYER',
    status ENUM('ACTIVE', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_player PRIMARY KEY (player_id),
    CONSTRAINT uq_player_username UNIQUE (username),
    CONSTRAINT uq_player_email UNIQUE (email)
) ENGINE=InnoDB;

-- 2. FRIENDSHIP (Recursive M:N Relationship)
-- NOTE: MySQL does not allow a CHECK constraint on columns that have
-- ON DELETE/UPDATE referential actions (error 3823), so the
-- "player_low < player_high" rule is enforced with triggers below.
-- (The sorting trigger trg_friendship_auto_sort in the DML file swaps reversed pairs.)
CREATE TABLE friendship (
    player_low BIGINT NOT NULL,
    player_high BIGINT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    since TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_friendship PRIMARY KEY (player_low, player_high),
    CONSTRAINT fk_friend_low FOREIGN KEY (player_low) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_high FOREIGN KEY (player_high) REFERENCES player(player_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. GUILD (Strong Entity)
CREATE TABLE guild (
    guild_id BIGINT NOT NULL AUTO_INCREMENT,
    guild_name VARCHAR(32) NOT NULL,
    guild_tag CHAR(4) NOT NULL,
    leader_id BIGINT NOT NULL,
    treasury DECIMAL(12, 2) NOT NULL DEFAULT 0,
    CONSTRAINT pk_guild PRIMARY KEY (guild_id),
    CONSTRAINT uq_guild_name UNIQUE (guild_name),
    CONSTRAINT uq_guild_tag UNIQUE (guild_tag)
) ENGINE=InnoDB;

-- 4. GUILD MEMBERSHIP (M:N Relationship with Descriptive Attributes)
CREATE TABLE guild_membership (
    guild_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    guild_role ENUM('MEMBER', 'OFFICER', 'LEADER') NOT NULL DEFAULT 'MEMBER',
    joined_on DATE NOT NULL DEFAULT (CURRENT_DATE),
    CONSTRAINT pk_guild_membership PRIMARY KEY (guild_id, player_id),
    CONSTRAINT fk_gm_guild FOREIGN KEY (guild_id) REFERENCES guild(guild_id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT uq_gm_one_guild UNIQUE (player_id)
) ENGINE=InnoDB;

-- 5. ITEM (Strong Entity / Subclass Container)
CREATE TABLE item (
    item_id BIGINT NOT NULL AUTO_INCREMENT,
    item_kind ENUM('WEAPON', 'COSMETIC') NOT NULL,
    item_name VARCHAR(60) NOT NULL,
    rarity ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL DEFAULT 'COMMON',
    base_price DECIMAL(10, 2) NOT NULL,
    damage SMALLINT NULL,          -- NULL if COSMETIC
    slot_type VARCHAR(16) NULL,    -- NULL if WEAPON
    CONSTRAINT pk_item PRIMARY KEY (item_id),
    CONSTRAINT uq_item_name UNIQUE (item_name)
) ENGINE=InnoDB;

-- 6. INVENTORY (M:N Relationship PLAYER -> ITEM)
CREATE TABLE inventory (
    player_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventory PRIMARY KEY (player_id, item_id),
    CONSTRAINT fk_inv_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_item FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. GAME MODE (Strong Entity, Natural Primary Key)
CREATE TABLE game_mode (
    mode_code VARCHAR(10) NOT NULL,
    mode_name VARCHAR(40) NOT NULL,
    team_size SMALLINT NOT NULL,
    CONSTRAINT pk_game_mode PRIMARY KEY (mode_code),
    CONSTRAINT uq_game_mode_name UNIQUE (mode_name)
) ENGINE=InnoDB;

-- 8. SEASON (Strong Entity)
CREATE TABLE season (
    season_id INT NOT NULL AUTO_INCREMENT,
    season_name VARCHAR(40) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT pk_season PRIMARY KEY (season_id),
    CONSTRAINT uq_season_name UNIQUE (season_name)
) ENGINE=InnoDB;

-- 9. GAME MATCH (Strong Entity)
CREATE TABLE game_match (
    match_id BIGINT NOT NULL AUTO_INCREMENT,
    mode_code VARCHAR(10) NOT NULL,
    season_id INT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('LIVE', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'LIVE',
    CONSTRAINT pk_game_match PRIMARY KEY (match_id),
    CONSTRAINT fk_match_mode FOREIGN KEY (mode_code) REFERENCES game_mode(mode_code),
    CONSTRAINT fk_match_season FOREIGN KEY (season_id) REFERENCES season(season_id)
) ENGINE=InnoDB;

-- 10. MATCH PARTICIPATION (M:N Relationship PLAYER <-> GAME_MATCH)
CREATE TABLE match_participation (
    match_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    team_no SMALLINT NOT NULL,
    kills SMALLINT NOT NULL DEFAULT 0,
    deaths SMALLINT NOT NULL DEFAULT 0,
    damage_dealt INT NOT NULL DEFAULT 0,
    CONSTRAINT pk_participation PRIMARY KEY (match_id, player_id),
    CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES game_match(match_id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. MATCH ROUND (Weak Entity owned by GAME_MATCH)
CREATE TABLE match_round (
    match_id BIGINT NOT NULL,
    round_no SMALLINT NOT NULL,
    winning_team SMALLINT NULL,
    duration_sec INT NULL,
    CONSTRAINT pk_match_round PRIMARY KEY (match_id, round_no),
    CONSTRAINT fk_round_match FOREIGN KEY (match_id) REFERENCES game_match(match_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. ACHIEVEMENT (Strong Entity / Natural Key)
CREATE TABLE achievement (
    achievement_code VARCHAR(24) NOT NULL,
    title VARCHAR(60) NOT NULL,
    points SMALLINT NOT NULL DEFAULT 10,
    CONSTRAINT pk_achievement PRIMARY KEY (achievement_code),
    CONSTRAINT uq_achievement_title UNIQUE (title)
) ENGINE=InnoDB;

-- 13. PLAYER ACHIEVEMENT (Ternary Relationship: PLAYER x ACHIEVEMENT x GAME_MATCH)
CREATE TABLE player_achievement (
    player_id BIGINT NOT NULL,
    achievement_code VARCHAR(24) NOT NULL,
    match_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_player_achievement PRIMARY KEY (player_id, achievement_code, match_id),
    CONSTRAINT fk_pa_ach FOREIGN KEY (achievement_code) REFERENCES achievement(achievement_code),
    CONSTRAINT fk_pa_played FOREIGN KEY (match_id, player_id)
        REFERENCES match_participation(match_id, player_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Closing circular FK for Guild Leader.
-- MySQL has no DEFERRABLE constraints, so this is checked immediately.
-- The integrity migration below makes leader_id nullable so a transaction can
-- insert the guild, insert membership, then assign its leader with FK checks on.
ALTER TABLE guild
    ADD CONSTRAINT fk_guild_leader FOREIGN KEY (guild_id, leader_id)
    REFERENCES guild_membership(guild_id, player_id);

-- Triggers replacing the PostgreSQL CHECK (player_low < player_high)
DELIMITER //

-- Rejects self-friendships. Reversed pairs are fixed by trg_friendship_auto_sort in the DML file.
CREATE TRIGGER trg_friendship_reject_self
BEFORE INSERT ON friendship
FOR EACH ROW
BEGIN
    IF NEW.player_low = NEW.player_high THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A player cannot befriend themselves.';
    END IF;
END //

-- Keeps the low < high ordering intact on updates.
CREATE TRIGGER trg_friendship_validate_update
BEFORE UPDATE ON friendship
FOR EACH ROW
BEGIN
    IF NEW.player_low >= NEW.player_high THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'friendship requires player_low < player_high.';
    END IF;
END //

DELIMITER ;

CREATE TABLE app_session (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    player_id BIGINT NOT NULL,
    password_version CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_session_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    INDEX ix_session_expiry (expires_at)
) ENGINE=InnoDB;

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

CREATE TABLE login_attempt (
    username_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL,
    INDEX ix_login_window (window_start)
) ENGINE=InnoDB;
