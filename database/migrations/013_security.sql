USE arena;
CREATE TABLE login_attempt (
    username_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL,
    INDEX ix_login_window (window_start)
) ENGINE=InnoDB;
