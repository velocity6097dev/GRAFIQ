-- =========================================================
-- Migration: adds Razorpay payment tracking.
-- Run this ONLY if you already imported the old schema.sql and have
-- data you want to keep (products you've added, real orders, etc).
-- If you're setting up fresh, just import schema.sql — it already
-- includes everything below.
--
-- In phpMyAdmin: select the grafiq_store database → Import → choose
-- this file → Go.
-- =========================================================

SET NAMES utf8mb4;
USE grafiq_store;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' AFTER payment_method;

CREATE TABLE IF NOT EXISTS payments (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  order_id             VARCHAR(20) NOT NULL,
  provider             VARCHAR(30) NOT NULL DEFAULT 'razorpay',
  razorpay_order_id    VARCHAR(64),
  razorpay_payment_id  VARCHAR(64),
  razorpay_signature   VARCHAR(128),
  amount               DECIMAL(10,2),
  currency             VARCHAR(10) DEFAULT 'INR',
  status               VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
  attempts             INT NOT NULL DEFAULT 0,
  error_message        TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at          TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Existing orders paid by COD are, definitionally, not "unpaid" in the
-- sense the new column is tracking (that's for online-payment
-- reconciliation) — leave them as 'unpaid' since COD is genuinely
-- collected later, on delivery. Nothing to backfill here.
