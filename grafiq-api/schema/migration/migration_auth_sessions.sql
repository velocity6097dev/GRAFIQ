-- Adds real, server-verified sessions for both admin and customer auth.
-- Run this in phpMyAdmin (Import tab) if you already have a database
-- from before this fix — a fresh `schema.sql` import already includes
-- both tables.
--
-- Before this migration, admin_auth.php / customer_auth.php's OTP-verify
-- only ever returned {success: true} — the frontend's "am I logged in"
-- state was just a localStorage flag with nothing behind it, and every
-- other endpoint trusted whatever the client claimed about itself (an
-- `isAdmin` flag, a `phone`/`customerPhone` field in the request body,
-- etc). These two tables are what a login/OTP-verify now actually issues
-- a token into, and what require_admin()/require_customer() in
-- config.php check against on every request that needs to know who's
-- really asking.

CREATE TABLE IF NOT EXISTS admin_sessions (
  token      CHAR(64) PRIMARY KEY,
  username   VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_sessions (
  token      CHAR(64) PRIMARY KEY,
  phone      VARCHAR(15) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  INDEX idx_customer_sessions_phone (phone)
) ENGINE=InnoDB;
