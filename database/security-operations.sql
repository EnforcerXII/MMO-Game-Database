USE arena;
-- Run with a maintenance account periodically. No application credential literals.
DELETE FROM app_session WHERE expires_at <= UTC_TIMESTAMP();
DELETE FROM login_attempt WHERE window_start < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE);
-- Grant only SELECT/INSERT/UPDATE/DELETE on arena to the application account.
-- The runtime must not have CREATE, ALTER, DROP, GRANT, or FILE privileges.
-- Keep schema migrations and account bootstrap restricted to a separate operator.
