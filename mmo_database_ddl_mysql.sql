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
-- To load a guild and its leader's membership, either set
-- FOREIGN_KEY_CHECKS = 0 around the inserts (as the DML file does)
-- or make guild.leader_id nullable and fill it in after the membership row exists.
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
