-- =========================================================
-- Migration: Customer Security panel (admin order page).
--   - orders.customer_ip — captured at checkout (see client_ip() in
--     config.php), shown next to a small copy icon in the new Customer
--     Security panel.
--
-- The Trust/Risk icon, Trust Level, and Customer Trust Details popup
-- next to it do NOT need a new table — they're computed live from your
-- existing orders/replacements data by grafiq-api/customer_trust.php
-- every time the panel loads. Nothing to backfill for that part.
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
  ADD COLUMN IF NOT EXISTS customer_ip VARCHAR(45) NULL AFTER customer_email;

-- Existing orders will simply show "Not recorded" for IP Address in the
-- admin panel — there's no way to retroactively know what IP an already-
-- placed order came from.
