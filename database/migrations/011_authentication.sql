-- Apply once to an existing arena database; also included in fresh DDL.
USE arena;
CREATE TABLE app_session (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    player_id BIGINT NOT NULL,
    password_version CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_session_player FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    INDEX ix_session_expiry (expires_at)
) ENGINE=InnoDB;
