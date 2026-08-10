# GRAFIQ — Database Setup (XAMPP / MySQL)

The store now runs on a real MySQL database instead of localStorage.
Products, categories, banners, settings, orders, admin login, and
customer accounts are all stored in MySQL and served through a small
PHP API. Here's how to get it running.

## 1. Install / open XAMPP

Download from https://www.apachefriends.org if you don't have it, then
open the **XAMPP Control Panel** and click **Start** next to:
- **Apache**
- **MySQL**

Both need the status to go green before continuing.

## 2. Copy the API folder into htdocs

Copy the `grafiq-api` folder (in this project) into your XAMPP `htdocs`
folder:

| OS      | htdocs path                          |
|---------|---------------------------------------|
| Windows | `C:\xampp\htdocs\`                    |
| macOS   | `/Applications/XAMPP/htdocs/`         |
| Linux   | `/opt/lampp/htdocs/`                  |

So you end up with `htdocs/grafiq-api/products.php`, etc.

## 3. Create the database

1. Open **phpMyAdmin**: http://localhost/phpmyadmin
2. Click **Import** in the top nav.
3. Choose the file `grafiq-api/schema.sql` (from this project).
4. Click **Go**.

That's it — this single file creates the `grafiq_store` database, every
table, and seeds it with the same demo products/categories/banners the
site shipped with, plus a working admin login:

```
Admin username: admin
Admin password: admin123
```

(Change this later by editing the `admin_users` row in phpMyAdmin, or
ask me to add a "change password" screen to the admin panel.)

## 4. Check the API is alive

Visit **http://localhost/grafiq-api/** in your browser. You should see
JSON like:

```json
{"status":"ok","message":"GRAFIQ API is running and connected to MySQL.", ...}
```

If instead you get a PHP error about the database connection, double
check step 1 (MySQL running) and step 3 (schema imported).

## 5. Run the frontend

In the project root:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The site now
reads/writes everything through `http://localhost/grafiq-api` — the
homepage, shop, checkout, and admin panel are all live against MySQL.

If your XAMPP Apache isn't on the default port 80, or you deployed the
API somewhere else, edit `.env` in the project root:

```
VITE_API_URL=http://localhost/grafiq-api
```

## What's stored where

| Data                              | Storage                        |
|------------------------------------|--------------------------------|
| Products, categories, banners      | MySQL (`grafiq_store` DB)      |
| Store settings                     | MySQL                          |
| Orders                             | MySQL                          |
| Admin login                        | MySQL (`admin_users`, bcrypt)  |
| Customer accounts (phone/name)     | MySQL (`customers`)            |
| Shipping partner list              | MySQL (seeded, read-only via API — `OrderDetail.jsx` still reads the static `src/data/shippingPartners.js` file for the courier-compare UI; point it at `/shipping_partners.php` too if you want that editable from the DB as well) |
| Cart contents                      | Browser localStorage (per device, same as before — carts are meant to be ephemeral until checkout) |
| Wishlist                           | Browser localStorage           |
| "Which customer/admin is logged in on this browser" | Browser localStorage (the underlying customer/admin *records* live in MySQL either way) |

## Troubleshooting

**"Not connected to the database" banner on the site**
Usually means one of:
- XAMPP's MySQL isn't running.
- `grafiq-api` isn't in `htdocs`, or is in the wrong subfolder.
- The database wasn't imported (redo step 3).
- `VITE_API_URL` in `.env` doesn't match where Apache is actually
  serving the API from.

Open http://localhost/grafiq-api/ directly in your browser — the error
message it shows (if any) will tell you exactly what's wrong.

**Garbled ₹ symbol or dashes after importing**
The schema file starts with `SET NAMES utf8mb4;` specifically to avoid
this, but if you ever re-export/re-import through a tool that ignores
that, re-import via phpMyAdmin's Import tab (not a raw command-line
`mysql <` without `--default-character-set=utf8mb4`).

**CORS errors in the browser console**
The API sends `Access-Control-Allow-Origin: *`, so this should not
happen. If it does, make sure you're hitting the API through Apache
(port 80) and not trying to open the `.php` files directly as local
files.

## Already have a database from before?

If you'd previously set this up and just want the newer features
(order cancellation, replacement requests, order status timeline), run
these two files in phpMyAdmin's **Import** tab — in this order — instead
of re-importing the whole `schema.sql` (which would wipe your data):

1. `grafiq-api/migration_razorpay.sql` (if you haven't already)
2. `grafiq-api/migration_order_tracking.sql`

## Next steps (not done yet, happy to build these on request)
- A real SMS gateway for OTP (currently a demo code, `1234`, for every
  phone number — that's the only thing to swap inside
  `grafiq-api/customer_auth.php`).
- Wiring `OrderDetail.jsx`'s courier-compare UI to the
  `shipping_partners` table via the API instead of the static file.
- An admin "change password" screen instead of editing the DB row by
  hand.

**Online payments (Razorpay) are done** — see
[`RAZORPAY_SETUP.md`](./RAZORPAY_SETUP.md) to turn it on.
