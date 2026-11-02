# Arena Ops database design

This is the implemented MySQL 8 schema. It replaces the earlier 34-entity proposal, which did not match the application. The executable source of truth is [the fresh-install DDL](mmo_database_ddl_mysql.sql); existing databases use the ordered [migrations](database/migrations).

## ER diagram

![Implemented entity relationships](ER%20diag.svg)

Core cardinalities: a player has many inventory entries, match participations, sessions and achievement unlocks; each inventory entry references one item. A player belongs to at most one guild. A guild has many memberships and its leader must reference a membership in that same guild. A match has one mode and one season, many participants and rounds. An unlock references an existing participation and achievement. Friendships reference two players. Login-attempt counters intentionally do not identify a player by foreign key, so unknown usernames can also be throttled.

## Relational schema and data dictionary

PK = primary key, FK = foreign key, UQ = unique. Compound keys prevent duplicate relationships. All tables use InnoDB transactions. Monetary values use DECIMAL rather than floating point. `guild.leader_id` is nullable during transactional creation/deletion; the application assigns a valid membership before committing a new guild. SQL alone permits an unassigned leader, so use the application transaction for complete guild creation.

### player

```sql
player (
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
)
```

### friendship

```sql
friendship (
player_low BIGINT NOT NULL,
    player_high BIGINT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    since TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_friendship PRIMARY KEY (player_low, player_high),
    CONSTRAINT fk_friend_low FOREIGN KEY (player_low) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_high FOREIGN KEY (player_high) REFERENCES player(player_id) ON DELETE CASCADE
)
```

### guild

```sql
guild (
guild_id BIGINT NOT NULL AUTO_INCREMENT,
    guild_name VARCHAR(32) NOT NULL,
    guild_tag CHAR(4) NOT NULL,
    leader_id BIGINT NULL,
    treasury DECIMAL(12, 2) NOT NULL DEFAULT 0,
    CONSTRAINT pk_guild PRIMARY KEY (guild_id),
    CONSTRAINT uq_guild_name UNIQUE (guild_name),
    CONSTRAINT uq_guild_tag UNIQUE (guild_tag)
)
```

### guild_membership

```sql
guild_membership (
guild_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    guild_role ENUM('MEMBER', 'OFFICER', 'LEADER') NOT NULL DEFAULT 'MEMBER',
    joined_on DATE NOT NULL DEFAULT (CURRENT_DATE),
    CONSTRAINT pk_guild_membership PRIMARY KEY (guild_id, player_id),
    CONSTRAINT fk_gm_guild FOREIGN KEY (guild_id) REFERENCES guild(guild_id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT uq_gm_one_guild UNIQUE (player_id)
)
```

### item

```sql
item (
item_id BIGINT NOT NULL AUTO_INCREMENT,
    item_kind ENUM('WEAPON', 'COSMETIC') NOT NULL,
    item_name VARCHAR(60) NOT NULL,
    rarity ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL DEFAULT 'COMMON',
    base_price DECIMAL(10, 2) NOT NULL,
    damage SMALLINT NULL,          -- NULL if COSMETIC
    slot_type VARCHAR(16) NULL,    -- NULL if WEAPON
    CONSTRAINT pk_item PRIMARY KEY (item_id),
    CONSTRAINT uq_item_name UNIQUE (item_name)
)
```

### inventory

```sql
inventory (
player_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventory PRIMARY KEY (player_id, item_id),
    CONSTRAINT fk_inv_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_item FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE RESTRICT
)
```

### game_mode

```sql
game_mode (
mode_code VARCHAR(10) NOT NULL,
    mode_name VARCHAR(40) NOT NULL,
    team_size SMALLINT NOT NULL,
    CONSTRAINT pk_game_mode PRIMARY KEY (mode_code),
    CONSTRAINT uq_game_mode_name UNIQUE (mode_name)
)
```

### season

```sql
season (
season_id INT NOT NULL AUTO_INCREMENT,
    season_name VARCHAR(40) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT pk_season PRIMARY KEY (season_id),
    CONSTRAINT uq_season_name UNIQUE (season_name)
)
```

### game_match

```sql
game_match (
match_id BIGINT NOT NULL AUTO_INCREMENT,
    mode_code VARCHAR(10) NOT NULL,
    season_id INT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('LIVE', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'LIVE',
    CONSTRAINT pk_game_match PRIMARY KEY (match_id),
    CONSTRAINT fk_match_mode FOREIGN KEY (mode_code) REFERENCES game_mode(mode_code),
    CONSTRAINT fk_match_season FOREIGN KEY (season_id) REFERENCES season(season_id)
)
```

### match_participation

```sql
match_participation (
match_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    team_no SMALLINT NOT NULL,
    kills SMALLINT NOT NULL DEFAULT 0,
    deaths SMALLINT NOT NULL DEFAULT 0,
    damage_dealt INT NOT NULL DEFAULT 0,
    CONSTRAINT pk_participation PRIMARY KEY (match_id, player_id),
    CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES game_match(match_id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE
)
```

### match_round

```sql
match_round (
match_id BIGINT NOT NULL,
    round_no SMALLINT NOT NULL,
    winning_team SMALLINT NULL,
    duration_sec INT NULL,
    CONSTRAINT pk_match_round PRIMARY KEY (match_id, round_no),
    CONSTRAINT fk_round_match FOREIGN KEY (match_id) REFERENCES game_match(match_id) ON DELETE CASCADE
)
```

### achievement

```sql
achievement (
achievement_code VARCHAR(24) NOT NULL,
    title VARCHAR(60) NOT NULL,
    points SMALLINT NOT NULL DEFAULT 10,
    CONSTRAINT pk_achievement PRIMARY KEY (achievement_code),
    CONSTRAINT uq_achievement_title UNIQUE (title)
)
```

### player_achievement

```sql
player_achievement (
player_id BIGINT NOT NULL,
    achievement_code VARCHAR(24) NOT NULL,
    match_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_player_achievement PRIMARY KEY (player_id, achievement_code, match_id),
    CONSTRAINT fk_pa_ach FOREIGN KEY (achievement_code) REFERENCES achievement(achievement_code),
    CONSTRAINT fk_pa_played FOREIGN KEY (match_id, player_id)
        REFERENCES match_participation(match_id, player_id) ON DELETE CASCADE
)
```

### app_session

```sql
app_session (
token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    player_id BIGINT NOT NULL,
    password_version CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_session_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    INDEX ix_session_expiry (expires_at)
)
```

### login_attempt

```sql
login_attempt (
username_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL,
    INDEX ix_login_window (window_start)
)
```

## Additional constraints and consistency

- Unique username/email; nonblank names; email shape and date-of-birth triggers (1900 through today). Roles are ADMIN/PLAYER and status is ACTIVE/BANNED.
- A guild tag is four characters and treasury is nonnegative. The composite leader FK requires membership in the same guild; membership has a unique player_id.
- Weapons require nonnegative damage and no slot; cosmetics require a nonblank slot and no damage. Prices are nonnegative; quantities are strictly positive.
- Season end cannot precede start. Live matches have no end time; terminal matches have an end no earlier than their start.
- Team/round numbers are positive; kills, deaths, damage, duration and achievement points cannot be negative.
- An achievement unlock requires the player to have participated in that match (composite FK).
- Self-friendship is rejected. The DML sorting trigger canonicalizes reversed inserts; updates must preserve low < high.
- Player and match dependent rows cascade; owned items and awarded achievement definitions are restricted from deletion. Guild leaders must be reassigned before deleting a player.
- `app_session` stores a SHA-256 digest of a random token, its player FK, password-hash fingerprint and expiry. Login attempts store a normalized username digest, count and window start.

## SQL implementation and important queries

The DDL creates 13 game tables and two authentication/security tables. The DML loads examples and defines friendship normalization, match-end timestamp triggers, `get_player_kd` and transactional `transfer_item`. Indexes include primary/unique keys, FK indexes, session expiry and login-window cleanup indexes. See [important queries](database/important-queries.sql).

No NoSQL collections, vector indexes, embeddings or similarity retrieval are implemented. MySQL fits the relational game state, compound relationships and transactional inventory requirements. A second database paradigm required by course point 3 remains a separate project gap; it is not satisfied by session or throttle tables.
