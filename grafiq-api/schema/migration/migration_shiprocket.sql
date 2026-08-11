-- Adds the Shiprocket integration's token cache. Run this in phpMyAdmin
-- (Import tab) if you already have a database from before the Shiprocket
-- integration — a fresh `schema.sql` import already includes this table.
--
-- Nothing else needs a schema change: booked-shipment details (courier
-- name, AWB/tracking number, Shiprocket's own order/shipment ids, etc.)
-- all live inside the existing `orders.shipping` JSON column, the same
-- one the old mock "compare & book" flow already used.

CREATE TABLE IF NOT EXISTS shiprocket_auth (
  id         INT PRIMARY KEY DEFAULT 1,
  -- Bearer token from POST /v1/external/auth/login. Valid 240 hours
  -- (10 days) per Shiprocket's docs — see shiprocket_get_token() in
  -- config.php, which refreshes it a little early (230h) and retries
  -- once on a 401 in case Shiprocket invalidated it sooner.
  token      TEXT,
  expires_at DATETIME
) ENGINE=InnoDB;

-- The old mock quote system (grafiq-api/shipping_partners.php,
-- src/data/shippingPartners.js) is gone — nothing reads this table
-- anymore, safe to drop.
DROP TABLE IF EXISTS shipping_partners;
