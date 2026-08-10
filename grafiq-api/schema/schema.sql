-- =========================================================
-- GRAFIQ store — MySQL schema + seed data
-- Import this whole file in phpMyAdmin (XAMPP) and you're set.
-- It creates the `grafiq_store` database, all tables, and seeds
-- them with the same demo data the site used to ship with
-- (src/data/*.js), so the storefront looks identical on first run.
-- =========================================================

-- Forces the ₹ symbol / en-dashes in the seed data below to be read as
-- UTF-8 regardless of the importing client's default charset.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS grafiq_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grafiq_store;

-- ---------- categories ----------
DROP TABLE IF EXISTS replacements;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS shipping_partners;

CREATE TABLE categories (
  id          VARCHAR(60) PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) NOT NULL,
  image       TEXT,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
  id          VARCHAR(60) PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  category_id VARCHAR(60) NULL,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount    INT NOT NULL DEFAULT 0,
  images      JSON NULL,
  colors      JSON NULL,
  sizes       JSON NULL,
  stock       INT NOT NULL DEFAULT 0,
  rating      DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  reviews     INT NOT NULL DEFAULT 0,
  tags        JSON NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE banners (
  id               VARCHAR(60) PRIMARY KEY,
  eyebrow          VARCHAR(255),
  title_line1      VARCHAR(255),
  title_highlight1 VARCHAR(255),
  title_line2      VARCHAR(255),
  title_highlight2 VARCHAR(255),
  subtitle         VARCHAR(255),
  image            TEXT,
  cta_primary      JSON NULL,
  cta_secondary    JSON NULL,
  active           TINYINT(1) NOT NULL DEFAULT 1,
  sort_order       INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  store_name          VARCHAR(150),
  tagline             VARCHAR(255),
  ticker_text         VARCHAR(255),
  currency_symbol     VARCHAR(10),
  delivery_fee        DECIMAL(10,2) DEFAULT 0,
  free_delivery_above DECIMAL(10,2) DEFAULT 0,
  contact_email       VARCHAR(150),
  contact_phone       VARCHAR(50),
  instagram           VARCHAR(255),
  facebook            VARCHAR(255),
  twitter             VARCHAR(255),
  features            JSON NULL,
  -- Partial-COD: % of an order's total a customer must pay upfront online
  -- (Razorpay) to confirm a Cash-on-Delivery order before it ships; the
  -- rest is collected in cash on delivery. 0 = COD behaves as a normal,
  -- fully-pay-on-delivery order (no upfront charge at all).
  cod_advance_percent DECIMAL(5,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
  id         VARCHAR(60) PRIMARY KEY,
  phone      VARCHAR(15) UNIQUE NOT NULL,
  name       VARCHAR(150) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                   VARCHAR(20) PRIMARY KEY,
  customer_phone       VARCHAR(15),
  -- Optional — collected at checkout alongside phone/address. Shown in
  -- the admin order page's Customer section; nothing in the app requires
  -- it (OTP login only ever needed the phone number).
  customer_email       VARCHAR(150) NULL,
  status               VARCHAR(30) NOT NULL DEFAULT 'Pending',
  -- JSON array of {status, at} entries — one appended every time `status`
  -- changes (see orders.php). This is what powers the customer-facing
  -- "Track Order" timeline (Order Placed → Confirmed → Processing →
  -- Shipped → Out for Delivery → Delivered) with real timestamps rather
  -- than just guessing dates from the current status alone.
  status_history       JSON NULL,
  items                JSON NULL,
  address              JSON NULL,
  payment_method       VARCHAR(30),
  -- unpaid | partial | paid | failed. 'partial' = partial-COD: the
  -- non-refundable advance was paid online via Razorpay, the rest is due
  -- in cash on delivery. See advance_amount/advance_paid below.
  payment_status       VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  subtotal             DECIMAL(10,2) DEFAULT 0,
  discount_total       DECIMAL(10,2) DEFAULT 0,
  delivery_fee         DECIMAL(10,2) DEFAULT 0,
  total                DECIMAL(10,2) DEFAULT 0,
  -- Partial-COD advance actually collected online for this order (0 for
  -- every order placed while settings.cod_advance_percent was 0, and for
  -- all non-COD orders). By policy this amount is non-refundable if the
  -- order is later cancelled — any refund of it is a manual admin action
  -- (Payment section → Refund), not automatic.
  advance_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  advance_paid         TINYINT(1) NOT NULL DEFAULT 0,
  shipping             JSON NULL,
  cancelled_at         TIMESTAMP NULL,
  cancellation_reason  VARCHAR(255) NULL,
  -- Only meaningful when a *paid* order gets cancelled — NULL means "not
  -- applicable" (never paid, or never cancelled). See order_cancel.php.
  refund_status        VARCHAR(20) NULL, -- pending | processing | refunded | failed
  refund_id            VARCHAR(64) NULL,
  -- Free-text, admin-only (never shown to customers) — space for internal
  -- context on this order (special instructions, call notes, etc).
  admin_notes          TEXT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- One row per payment attempt. Razorpay payments land here first with
-- status='pending_verification' the instant the client-side signature
-- check passes — that's what makes this a queue: razorpay_queue_worker.php
-- (run via cron, or the admin "Verify Pending Payments" button) works
-- through every pending_verification row and independently re-confirms
-- each one directly against Razorpay's API before trusting it fully.
CREATE TABLE payments (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  order_id             VARCHAR(20) NOT NULL,
  provider             VARCHAR(30) NOT NULL DEFAULT 'razorpay',
  razorpay_order_id    VARCHAR(64),
  razorpay_payment_id  VARCHAR(64),
  razorpay_signature   VARCHAR(128),
  amount               DECIMAL(10,2),
  currency             VARCHAR(10) DEFAULT 'INR',
  status               VARCHAR(30) NOT NULL DEFAULT 'pending_verification', -- pending_verification | verified | failed
  attempts             INT NOT NULL DEFAULT 0,
  error_message        TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at          TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE shipping_partners (
  id          VARCHAR(60) PRIMARY KEY,
  name        VARCHAR(150),
  eta_days    VARCHAR(50),
  base_rate   DECIMAL(10,2),
  per_kg_rate DECIMAL(10,2),
  rating      DECIMAL(2,1)
) ENGINE=InnoDB;

-- One row per "request a replacement" submission. Independent status
-- timeline from the parent order (Replacement Requested → Under Review →
-- Approved → Replacement Processing → Replacement Shipped → Out for
-- Delivery → Replacement Delivered, or Rejected) so a customer can track
-- their original order and any replacement side by side without them
-- getting mixed up.
CREATE TABLE replacements (
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

-- =========================================================
-- Seed data
-- =========================================================

INSERT INTO categories (id, name, slug, image, description) VALUES
('cat-oversized', 'Oversized Tees', 'oversized-tees', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', 'Drop-shoulder, boxy fit, built for layering.'),
('cat-graphic', 'Graphic Prints', 'graphic-prints', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80', 'Statement art, one print run at a time.'),
('cat-anime', 'Anime Series', 'anime-series', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', 'Panel-inspired drops for the fans.'),
('cat-hoodies', 'Hoodies', 'hoodies', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', 'Heavyweight fleece, made for the cold drops.'),
('cat-minimal', 'Minimal Basics', 'minimal-basics', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80', 'Clean canvases — perfect for Design Your Own.');

INSERT INTO products (id, name, category_id, price, discount, images, colors, sizes, stock, rating, reviews, tags, description) VALUES
('p-create-reality', 'Create Reality', 'cat-graphic', 899, 22,
  JSON_ARRAY('https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80','https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80'),
  JSON_ARRAY('Black'), JSON_ARRAY('S','M','L','XL','XXL'), 42, 4.6, 128,
  JSON_ARRAY('new','bestseller'), 'Heavyweight 240 GSM cotton tee with a distressed portrait print. Oversized, boxy fit.'),
('p-express', 'Express', 'cat-graphic', 799, 12,
  JSON_ARRAY('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80','https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80'),
  JSON_ARRAY('White','Black'), JSON_ARRAY('S','M','L','XL'), 31, 4.4, 76,
  JSON_ARRAY('new'), '"Express, not to impress" — glitch-art bust print with barcode tag graphic.'),
('p-chaos', 'Chaos', 'cat-oversized', 849, 0,
  JSON_ARRAY('https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&q=80','https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80'),
  JSON_ARRAY('Black'), JSON_ARRAY('M','L','XL','XXL'), 18, 4.7, 54,
  JSON_ARRAY('bestseller'), 'Drip-smile graphic, "Find Your Fire" back print. Drop-shoulder oversized cut.'),
('p-imagine', 'Imagine', 'cat-anime', 799, 15,
  JSON_ARRAY('https://images.unsplash.com/photo-1622445275576-721325763afe?w=800&q=80','https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&q=80'),
  JSON_ARRAY('White'), JSON_ARRAY('S','M','L','XL'), 25, 4.5, 41,
  JSON_ARRAY('new'), 'Manga-panel collage print on premium combed cotton.'),
('p-static', 'Static Mind', 'cat-anime', 899, 10,
  JSON_ARRAY('https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80','https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80'),
  JSON_ARRAY('Black'), JSON_ARRAY('S','M','L','XL','XXL'), 12, 4.3, 19,
  JSON_ARRAY(), 'Fragmented character print, distressed wash finish.'),
('p-nightshade', 'Nightshade Hoodie', 'cat-hoodies', 1799, 18,
  JSON_ARRAY('https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80','https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=800&q=80'),
  JSON_ARRAY('Black','Grey'), JSON_ARRAY('M','L','XL','XXL'), 20, 4.8, 63,
  JSON_ARRAY('bestseller'), '380 GSM fleece hoodie, kangaroo pocket, ribbed cuffs.'),
('p-blackout', 'Blackout Hoodie', 'cat-hoodies', 1899, 0,
  JSON_ARRAY('https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800&q=80','https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=800&q=80'),
  JSON_ARRAY('Black'), JSON_ARRAY('S','M','L','XL'), 15, 4.6, 22,
  JSON_ARRAY('new'), 'All-black hoodie, tonal chest embroidery, brushed interior.'),
('p-canvas-basic', 'Canvas Basic Tee', 'cat-minimal', 599, 0,
  JSON_ARRAY('https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'),
  JSON_ARRAY('White','Black','Grey'), JSON_ARRAY('S','M','L','XL','XXL'), 60, 4.2, 90,
  JSON_ARRAY(), 'Blank canvas tee — the recommended base for Design Your Own.');

INSERT INTO banners (id, eyebrow, title_line1, title_highlight1, title_line2, title_highlight2, subtitle, image, cta_primary, cta_secondary, active, sort_order) VALUES
('b1', "Not just clothes, it's your identity.", 'YOUR STYLE,', 'OUR VISION.', 'MADE TO BE', 'SEEN.', 'WEAR YOUR IMAGINATION.',
  'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1000&q=80',
  JSON_OBJECT('label','Shop Now','link','/shop'), JSON_OBJECT('label','Design Your Own','link','/design-your-own'), 1, 1),
('b2', 'Something creative is launching', 'CODE', 'GRAFIQ', '', '', 'YOUR STYLE, OUR VISION. MADE TO BE SEEN.',
  'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=1000&q=80',
  JSON_OBJECT('label','Explore Now','link','/shop'), NULL, 1, 2),
('b3', 'Flat 20% off', 'END OF', 'SEASON', 'DROP IS', 'LIVE.', 'ON ALL HOODIES, THIS WEEK ONLY.',
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1000&q=80',
  JSON_OBJECT('label','Grab the Deal','link','/shop?category=cat-hoodies'), NULL, 1, 3);

INSERT INTO settings (id, store_name, tagline, ticker_text, currency_symbol, delivery_fee, free_delivery_above, contact_email, contact_phone, instagram, facebook, twitter, cod_advance_percent, features) VALUES
(1, 'GRAFIQ', "Not just clothes, it's your identity.", 'YOU IMAGINE. WE CREATE. YOU WEAR. YOU STAND OUT.', '₹', 79, 999,
  'hello@grafiq.in', '+91 98765 43210', 'https://instagram.com/grafiq.in', 'https://facebook.com/grafiq.in', 'https://twitter.com/grafiq_in',
  0,
  JSON_ARRAY(
    JSON_OBJECT('id','f1','icon','shirt','title','Premium Quality','desc','Built to last. Made to feel.'),
    JSON_OBJECT('id','f2','icon','palette','title','Unlimited Designs','desc','Endless ideas. One destination.'),
    JSON_OBJECT('id','f3','icon','user','title','Made For You','desc','Your style. Your statement.'),
    JSON_OBJECT('id','f4','icon','truck','title','Fast & Safe Delivery','desc','Quick by us. Safe for you.')
  ));

INSERT INTO shipping_partners (id, name, eta_days, base_rate, per_kg_rate, rating) VALUES
('delhivery', 'Delhivery', '2–4 days', 40, 25, 4.3),
('bluedart', 'Blue Dart', '1–3 days', 60, 35, 4.6),
('dtdc', 'DTDC', '3–5 days', 35, 20, 4.0),
('xpressbees', 'Xpressbees', '2–5 days', 38, 22, 4.1),
('ecomexpress', 'Ecom Express', '3–6 days', 32, 18, 3.9),
('shadowfax', 'Shadowfax', '1–2 days', 55, 30, 4.4);

-- Demo admin login: username "admin", password "admin123"
-- (bcrypt hash below is that password — change it after your first login
-- by updating this row, or add an admin-password-change screen later)
INSERT INTO admin_users (username, password_hash) VALUES
('admin', '$2b$10$BFjY0PPmpBwNW3XS.BsB5uoO8mAU.udddrpXE/LChQ9KnrTvMzfFi');
