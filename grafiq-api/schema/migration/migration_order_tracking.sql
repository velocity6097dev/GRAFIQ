-- =========================================================
-- Migration: order status timeline, cancellation + refund tracking,
-- and the replacement-request feature (View/Track/Cancel/Request
-- Replacement on the customer account page).
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
  ADD COLUMN IF NOT EXISTS status_history JSON NULL AFTER status,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER shipping,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL AFTER cancelled_at,
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NULL AFTER cancellation_reason,
  ADD COLUMN IF NOT EXISTS refund_id VARCHAR(64) NULL AFTER refund_status;

-- Backfill status_history for existing orders so "Track Order" has at
-- least one entry to show instead of an empty timeline. We don't know
-- the real historical timestamps, so every existing order just gets a
-- single entry at its current status, dated to when it was created.
UPDATE orders
SET status_history = JSON_ARRAY(JSON_OBJECT('status', status, 'at', created_at))
WHERE status_history IS NULL;

CREATE TABLE IF NOT EXISTS replacements (
  id                   VARCHAR(20) PRIMARY KEY,
  order_id             VARCHAR(20) NOT NULL,
  product_id           VARCHAR(60),
  product_name         VARCHAR(200),
  reason               VARCHAR(120),
  note                 TEXT,
  photo_url            TEXT,
  status               VARCHAR(40) NOT NULL DEFAULT 'Replacement Requested',
  status_history       JSON NULL,
  courier_name         VARCHAR(150),
  tracking_id          VARCHAR(100),
  estimated_delivery   DATE NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
