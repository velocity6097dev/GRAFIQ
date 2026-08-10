-- =========================================================
-- Migration: admin order page overhaul + partial-COD.
--   - orders.customer_email  (Customer section on the admin order page)
--   - orders.admin_notes     (Admin Notes section)
--   - orders.advance_amount / orders.advance_paid  (partial-COD advance
--     tracking — the non-refundable upfront % a customer pays online to
--     confirm a COD order before it ships)
--   - settings.cod_advance_percent  (the % itself, set from Admin →
--     Settings; 0 = COD works exactly as before, no upfront charge)
--
-- Run this ONLY if you already imported an earlier schema.sql and have
-- data you want to keep. Setting up fresh? Just import schema.sql — it
-- already includes everything below.
--
-- In phpMyAdmin: select the grafiq_store database → Import → choose
-- this file → Go.
-- =========================================================

SET NAMES utf8mb4;
USE grafiq_store;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150) NULL AFTER customer_phone,
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total,
  ADD COLUMN IF NOT EXISTS advance_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER advance_amount,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL AFTER refund_id;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS cod_advance_percent DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Nothing to backfill: every existing order was placed before this
-- feature existed, so advance_amount/advance_paid correctly default to
-- "no advance was collected" (0 / 0), and cod_advance_percent starts at
-- 0 (COD keeps behaving exactly as it did before) until you set it under
-- Admin → Settings.
