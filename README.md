# NexaMart — Electronics E-Commerce Marketplace

NexaMart is a full online store for selling electronics (smartphones, laptops, headphones, smart watches, tablets, gaming devices, and accessories). It is built with the **MERN stack** (MongoDB, Express, React, Node.js) and includes everything a real shop needs: product browsing, cart, wishlist, checkout, online payments, order tracking, returns, and a complete **admin dashboard**.

This README explains the whole project in simple language so anyone — even someone new to coding — can understand what it does, how to run it, and how to deploy it for free.

---

## Table of Contents

1. [What can it do?](#what-can-it-do)
2. [Tech stack](#tech-stack)
3. [How the project is organized](#how-the-project-is-organized)
4. [How it all works (the flow)](#how-it-all-works-the-flow)
5. [Getting started (run locally)](#getting-started-run-locally)
6. [Demo login accounts](#demo-login-accounts)
7. [Environment variables explained](#environment-variables-explained)
8. [Available commands](#available-commands)
9. [API overview](#api-overview)
10. [Data models](#data-models)
11. [Admin dashboard features](#admin-dashboard-features)
12. [Deployment A to Z (100% free)](#deployment-a-to-z-100-free)
13. [Redeploy after making changes](#redeploy-after-making-changes)
14. [Troubleshooting](#troubleshooting)
15. [Good to know](#good-to-know)

---

## What can it do?

### For customers (shoppers)
- **Browse products** on a clean homepage with featured items, categories, and best sellers.
- **Search & filter** products by keyword, category, brand, and price range.
- **Product details page** with images, specifications, ratings, and customer reviews.
- **Wishlist** — save products you like for later.
- **Shopping cart** — add items, change quantities, see the total.
- **Checkout** — enter a shipping address, choose delivery and payment method.
- **Online payments** through Razorpay (test mode), or Cash on Delivery.
- **Track orders** — see order status step by step, download an invoice.
- **Returns** — request a return with a reason.
- **Account** — register with email + OTP verification, login, reset password, edit profile.

### For admins (shop owners)
- **Dashboard** with sales stats and charts.
- **Manage products** — add, edit, delete, upload images, set stock and pricing.
- **Manage orders** — update status, mark payments, add notes, bulk update.
- **Handle returns** — approve or reject return requests and process refunds.
- **Manage users** — change roles, suspend accounts, delete users.
- **Store settings** — SMTP, email templates, site info, company info, security, **Razorpay keys**, and **social media links**.
- **Activity logs** — record of admin actions.
- **Export** orders and products to CSV.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router 6, Vite 5, Axios, Recharts (charts), Firebase (analytics) |
| **Backend** | Node.js 20, Express 4 |
| **Database** | MongoDB (with Mongoose 8) |
| **Auth** | JWT (access + refresh tokens), bcrypt for passwords |
| **Payments** | Razorpay |
| **Email/OTP** | Nodemailer (SMTP) |
| **Image storage** | Cloudinary (optional) or stored in MongoDB |
| **Security** | Helmet, CORS, rate limiting, mongo-sanitize, Zod validation |

---

## How the project is organized

```
NexaMart/
├── package.json          # Root scripts (run everything together)
├── .env                  # Your secret config (you create this)
├── .env.example          # Template showing what goes in .env
├── render.yaml           # Render backend deploy config
├── firebase.json         # Firebase Hosting config
├── .firebaserc           # Default Firebase project
│
├── backend/              # The server (API)
│   ├── server.js         # App entry point — starts the server
│   ├── firebaseApi.js    # Optional: run the API as a Firebase Function
│   └── src/
│       ├── config/       # Database, env, Cloudinary, Razorpay setup
│       ├── models/       # Database shapes (User, Product, Order, Settings, etc.)
│       ├── controllers/  # The logic for each feature
│       ├── routes/       # The API URLs (endpoints)
│       ├── middleware/   # Auth checks, error handling, file uploads
│       ├── validators/   # Input validation rules (Zod)
│       └── utils/        # Helpers (email, tokens, seed data, etc.)
│
└── frontend/             # The website (what users see)
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx       # App entry point
        ├── App.jsx        # All the page routes
        ├── firebase.js    # Firebase analytics init
        ├── pages/         # Each screen (Home, Cart, Checkout, Admin, ...)
        ├── components/    # Reusable pieces (Navbar, Footer, ProductCard, ...)
        ├── context/       # Shared state (Auth, Cart, Toast, Confirm)
        ├── api/           # Axios setup for talking to the backend
        ├── utils/         # Helpers (formatting, etc.)
        └── styles/        # All the CSS
```

**Simple way to think about it:**
- The **frontend** is the shop you see and click on.
- The **backend** is the brain that stores data and makes decisions.
- The **database** is the warehouse where everything (products, users, orders) is kept.

> Note: The frontend uses React **Context API** (not Redux) for shared state — see `frontend/src/context/`.

---

## How it all works (the flow)

### Big picture

```mermaid
flowchart LR
    user["Customer / Admin (Browser)"]
    frontend["React Frontend (Vite, port 5173)"]
    backend["Express API (port 5000)"]
    db[("MongoDB Database")]
    services["Razorpay / Email / Cloudinary"]

    user -->|clicks and views| frontend
    frontend -->|API calls via /api| backend
    backend -->|read / write| db
    backend -->|payments, emails, images| services
    backend -->|JSON response| frontend
    frontend -->|shows result| user
```

When you open the website, the **frontend** sends requests (like "give me products") to the **backend** through `/api/...` URLs. The backend talks to the **database**, then sends back the answer, and the frontend shows it on screen.

> During development, Vite forwards any request starting with `/api` to the backend on port 5000, so both run together smoothly.

### Sign up & login flow

```mermaid
flowchart TD
    a["User registers with name, email, password"] --> b["Backend creates account + sends OTP to email"]
    b --> c["User enters OTP to verify"]
    c --> d["Account verified — user can log in"]
    d --> e["Backend gives access token + refresh token"]
    e --> f["User stays logged in; token auto-refreshes"]
```

- Passwords are **hashed** (scrambled) before saving — never stored as plain text.
- Login uses **JWT tokens**: a short-lived access token and a longer refresh token (stored in a secure cookie).

### Shopping & order flow

```mermaid
flowchart TD
    browse["Browse / search products"] --> cart["Add items to cart"]
    cart --> checkout["Go to checkout"]
    checkout --> address["Enter shipping address"]
    address --> pay{"Choose payment"}
    pay -->|Razorpay| online["Pay online and verify"]
    pay -->|Cash on Delivery| cod["Place order directly"]
    online --> placed["Order placed"]
    cod --> placed
    placed --> track["Track order status"]
    track --> deliver["Delivered"]
    deliver --> ret["Optional: request a return"]
```

---

## Getting started (run locally)

### 1. Prerequisites
You need these installed on your computer:
- **Node.js** (v20 recommended) — [download here](https://nodejs.org)
- **A MongoDB database** — easiest is a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### 2. Install everything
From the project root folder, run:

```bash
npm run install:all
```

This installs packages for the root, backend, and frontend in one go.

### 3. Create your `.env` file
Copy the example file and fill in your own values:

```bash
copy .env.example .env      # Windows
# or
cp .env.example .env        # macOS / Linux
```

At minimum, set your `MONGO_URI` (your MongoDB connection string) and the `JWT_SECRET` values. See [Environment variables explained](#environment-variables-explained) below.

### 4. Add sample data (seeding)
This fills the database with realistic electronics products and demo accounts:

```bash
npm run seed
```

### 5. Start the app
Run the backend and frontend together:

```bash
npm run dev
```

Now open:
- **Website:** http://localhost:5173
- **API health check:** http://localhost:5000/api/health

> Tip: `npm run setup` does install + seed in one shot.

---

## Demo login accounts

After seeding, you can log in with these test accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@shop.com` | `Admin@123` |
| **Customer** | `user@shop.com` | `User@123` |

The admin account can access the dashboard at **http://localhost:5173/admin**.

---

## Environment variables explained

These go in your `.env` file (in the project root). Here is what each one means:

| Variable | What it's for |
|----------|---------------|
| `PORT` | Port the backend runs on (default `5000`). |
| `NODE_ENV` | `development` or `production`. |
| `CLIENT_URL` | The frontend address (for CORS), e.g. `http://localhost:5173`. |
| `MONGO_URI` | Your MongoDB connection string. **Required.** |
| `JWT_SECRET` | Secret key to sign login tokens. Use a long random string. |
| `JWT_EXPIRES_IN` | How long an access token lasts (e.g. `15m`). |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens. Use a different long random string. |
| `JWT_REFRESH_EXPIRES_IN` | How long a refresh token lasts (e.g. `7d`). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Email server settings for sending OTP and reset emails. |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Email login + the "from" address. |
| `OTP_EXPIRES_MIN` / `OTP_LENGTH` | How long an OTP is valid and how many digits. |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Limits how many requests a user can make (anti-abuse). |
| `COOKIE_SECURE` | Set `true` in production (HTTPS) for secure cookies. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional — for storing uploaded product images in the cloud. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay keys for online payments (can also be set from the admin dashboard). |

> If you leave `SMTP_*`, `CLOUDINARY_*`, or `RAZORPAY_*` empty, the core app still works — those just enable email, cloud images, and online payments.

---

## Available commands

Run these from the **project root**:

| Command | What it does |
|---------|--------------|
| `npm run install:all` | Installs all dependencies (root + backend + frontend). |
| `npm run dev` | Starts backend and frontend together. |
| `npm run seed` | Fills the database with demo products and accounts. |
| `npm run setup` | Installs everything and seeds the database. |
| `npm run build` | Builds the frontend for production. |
| `npm run deploy:hosting` | Builds + deploys the frontend to Firebase Hosting. |

Backend-only (run inside `backend/`):
- `npm start` — run the server in production mode.
- `npm run dev` — run the server with auto-reload (nodemon).
- `npm run seed` — seed the database.

---

## API overview

All endpoints start with `/api`. Here are the main groups:

| Group | Base URL | Purpose |
|-------|----------|---------|
| Auth | `/api/auth` | Register, verify OTP, login, logout, refresh, profile, password reset. |
| Products | `/api/products` | List, search, filter, product details, admin add/edit/delete. |
| Cart | `/api/cart` | View and update the shopping cart. |
| Wishlist | `/api/wishlist` | Add/remove saved products. |
| Reviews | `/api/reviews` | Read and post product reviews. |
| Orders | `/api/orders` | Place orders, view orders, cancel, request returns. |
| Payment | `/api/payment` | Create and verify Razorpay payments. |
| Admin | `/api/admin` | Stats, orders, returns, users, exports, logs. |
| Settings | `/api/admin/settings` | Store settings (admin). Public part at `/api/admin/settings/public`. |

**Example auth endpoints:**
```
POST /api/auth/register      # create account (sends OTP)
POST /api/auth/verify-otp    # verify email with OTP
POST /api/auth/login         # log in
POST /api/auth/refresh       # get a new access token
GET  /api/auth/profile       # get logged-in user info
```

---

## Data models

The main "things" stored in the database:

- **User** — name, email, hashed password, role (`user` or `admin`), cart, wishlist, addresses, verification status.
- **Product** — name, brand, category, description, price, MRP, stock, images, specs, rating, reviews, featured flag.
- **Order** — the buyer, list of items, shipping address, totals, status, payment info, tracking events, returns.
- **Review** — a product rating + comment by a user.
- **Settings** — store-wide config: SMTP, email templates, site, company, security, Razorpay keys, and social media links.
- **Otp** — one-time codes for email verification.
- **ActivityLog** — record of admin actions for auditing.

---

## Admin dashboard features

Open **`/admin`** (admin login required). The **Settings** page has these tabs:

| Tab | What you can set |
|-----|------------------|
| **SMTP** | Email server host, port, user, password, from address. Send a test email. |
| **Email Templates** | Edit OTP, reset password, and order confirmation email text. |
| **Site** | Site name and support email. |
| **Company** | Company name, address, GSTIN. |
| **Security** | OTP expiry minutes and max login attempts. |
| **API** | **Razorpay Key ID + Key Secret.** Leave blank to use the keys from `.env`. |
| **Social** | **Facebook, Instagram, Twitter/X, YouTube, LinkedIn, WhatsApp links.** These show in the website footer (empty ones are hidden). |

**How Razorpay keys are picked at payment time:**
1. First, the keys set in **Admin → Settings → API** (saved in the database).
2. If those are blank, the keys from the server **`.env`** file.
3. If both are blank, payment shows a clear "keys missing" error.

> The Razorpay secret and SMTP password are never sent back to the browser in plain text — they show as `********`.

---

## Deployment A to Z (100% free)

This project is deployed **completely free** using:

- **Frontend** -> **Firebase Hosting** (free)
- **Backend API** -> **Render** (free web service)
- **Database** -> **MongoDB Atlas** (free M0 cluster)

> Why two services? Firebase Hosting only serves static files. The Node/Express backend needs a real server, so it runs on Render. This keeps everything free.

**Live URLs**
| What | URL |
|------|-----|
| Website (open this) | https://nexamart-28c93.web.app |
| Backend API | https://nexa-mart.onrender.com/api |
| API health check | https://nexa-mart.onrender.com/api/health |
| GitHub repo | https://github.com/zaid154/Nexa-Mart |

> Note: opening `https://nexa-mart.onrender.com` directly shows `Not Found` — that is normal. It is an API server, not a website. The API lives under `/api/...`.

### How it fits together

```mermaid
flowchart LR
    browser["Browser"]
    hosting["Firebase Hosting (React build)"]
    render["Render Web Service (Express API)"]
    db[("MongoDB Atlas")]

    browser -->|"opens site"| hosting
    browser -->|"/api/** calls"| render
    render -->|"read / write"| db
```

The React app is built with `VITE_API_URL=https://nexa-mart.onrender.com/api`, so the live site calls the Render backend directly.

### Files that power the deploy
| File | Purpose |
|------|---------|
| `firebase.json` | Firebase Hosting config (serves `frontend/dist`, SPA rewrite to `index.html`). |
| `.firebaserc` | Sets the default Firebase project (`nexamart-28c93`). |
| `render.yaml` | Render service config (build/start commands + env var list). |
| `backend/server.js` | Backend entry point used by Render (`node server.js`). |
| `backend/src/createApp.js` | Builds the Express app (CORS allows the Firebase site). |
| `frontend/.env.production` | `VITE_API_URL` pointing to the live Render API. |
| `frontend/src/firebase.js` | Firebase app + Analytics init for the frontend. |

---

### Part 1 — MongoDB Atlas (database)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Database Access** -> create a user with a username + password.
3. **Network Access** -> **Add IP Address** -> **Allow access from anywhere** (`0.0.0.0/0`).
   - Required because Render's free IP changes. Without this, the API cannot connect.
4. **Connect** -> copy your connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ecommerce
   ```
5. Put this in your root `.env` as `MONGO_URI`, then seed once:
   ```bash
   npm run seed
   ```

---

### Part 2 — Push code to GitHub

```bash
# from the project root
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/zaid154/Nexa-Mart.git
git push -u origin main
```

> Your secrets are safe: `.env` and `backend/.env` are in `.gitignore`, so they are never pushed.

For later updates:
```bash
git add -A
git commit -m "your message"
git push
```

---

### Part 3 — Backend on Render (free)

1. Go to [dashboard.render.com](https://dashboard.render.com) -> **Sign in with GitHub**.
2. **New +** -> **Web Service** -> connect the `Nexa-Mart` repo.
3. Render reads `render.yaml`, but confirm these settings:

   | Field | Value |
   |-------|-------|
   | **Name** | `nexamart-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Health Check Path** | `/api/health` |
   | **Instance Type** | **Free** |

4. Add **Environment Variables** (the ones marked `sync: false` in `render.yaml` must be added by hand). Minimum required:

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string |
   | `JWT_REFRESH_SECRET` | another long random string |
   | `CLIENT_URL` | `https://nexamart-28c93.web.app` |
   | `NODE_ENV` | `production` |
   | `COOKIE_SECURE` | `true` |

   Optional (enable email OTP / payments): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

5. **Create Web Service** -> wait 2–3 minutes. You will get a URL like `https://nexa-mart.onrender.com`.
6. Test it:
   ```
   https://nexa-mart.onrender.com/api/health   ->   {"status":"ok"}
   ```

> **Free tier sleep:** Render free services spin down after ~15 minutes of inactivity. The first request after sleeping takes ~30–50 seconds to "wake up", then it is fast again. The frontend automatically retries during wake-up.

---

### Part 4 — Frontend on Firebase Hosting (free)

One-time setup:
```bash
npm install -g firebase-tools   # install the CLI
firebase login                  # log in to your Google account
```

Point the frontend at your Render API — edit `frontend/.env.production`:
```
VITE_API_URL=https://nexa-mart.onrender.com/api
```

Deploy:
```bash
# from the project root
firebase use nexamart-28c93
npm run deploy:hosting
```

This builds the React app and uploads it to Firebase Hosting. When it finishes you will see:
```
Hosting URL: https://nexamart-28c93.web.app
```

---

### Command cheat sheet

Run all from the **project root**:

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run backend + frontend locally. |
| `npm run seed` | Fill MongoDB with demo products + accounts. |
| `npm run build` | Build the frontend for production. |
| `git add -A && git commit -m "msg" && git push` | Push updates to GitHub (Render auto-redeploys). |
| `firebase login` | Log in to Firebase. |
| `firebase use nexamart-28c93` | Select the Firebase project. |
| `npm run deploy:hosting` | Build + deploy the frontend to Firebase. |
| `firebase deploy --only hosting` | Same as above (direct CLI form). |

---

## Redeploy after making changes

| You changed... | Do this |
|----------------|---------|
| **Backend** (`backend/`) | `git push` -> Render auto-redeploys. Or click **Manual Deploy -> Deploy latest commit** in Render. |
| **Frontend** (`frontend/`) | `npm run deploy:hosting` from the project root. |
| **Both** | `git push`, then `npm run deploy:hosting`. |
| **Environment variables** | Update them in the **Render dashboard** (they are not pushed via git). |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site shows "Could not load store data" | Render server is asleep — wait 30–50s, click **Try again**. |
| `Could not connect to MongoDB Atlas` in Render logs | Add `0.0.0.0/0` in Atlas -> Network Access. |
| Products load locally but not live | Check `frontend/.env.production` has the correct Render URL, then redeploy hosting. |
| CORS error in browser console | Ensure `CLIENT_URL=https://nexamart-28c93.web.app` is set in Render env vars. |
| Render deploy "Exited with status 1" | Check that `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` are set in Render env vars. |
| `nexa-mart.onrender.com` shows "Not Found" | Normal — that is the API root. Use `/api/health` or open the Firebase site. |
| Razorpay "keys missing" error | Set keys in **Admin -> Settings -> API**, or in the server `.env`. |
| Footer social icons not showing | Add the links in **Admin -> Settings -> Social** and save. |

---

## Good to know

- **Security built in:** passwords are hashed, requests are rate-limited, inputs are validated (Zod), and common attacks are blocked (Helmet, mongo-sanitize).
- **Images:** seeded products use online image URLs; admin uploads can use Cloudinary (if configured) or be stored in MongoDB. If an image fails to load, a branded placeholder is shown.
- **Tokens auto-refresh:** users stay logged in smoothly without re-entering passwords often.
- **Responsive design:** the site works on mobile, tablet, and desktop.
- **Beginner-friendly code:** the codebase uses simple React + Context API and plain Express, written to be easy to read and explain.

---

Built with the MERN stack. Happy shopping!
