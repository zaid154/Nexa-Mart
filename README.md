# NexaMart — Electronics E-Commerce Marketplace

> **Author:** Mohd Zaid &middot; **Contact:** zaidm1323@gmail.com &middot; **GitHub:** [github.com/mohdzaid](https://github.com/mohdzaid)
> A Flipkart-style, full-stack (MERN) marketplace — storefront, cart, checkout, payments, orders, returns, invoices and an admin console.

The UI follows the Flipkart design language: blue header, flat white cards, green rating pills, an amber/orange CTA pair, and the four-step checkout accordion.

```
Live         https://nexa-mart-psi.vercel.app
Live API     https://nexa-mart.onrender.com/api

Storefront   http://localhost:5173
Seller Hub   http://localhost:5173/admin
API          http://localhost:5000/api
```

> The API runs on Render's free plan, which sleeps after a quiet spell. The
> first request after that takes 30–50 seconds; the site shows a banner
> explaining it and retries on its own.

---

## Contents

1. [Quick start](#quick-start)
2. [Demo accounts](#demo-accounts)
3. [Tech stack](#tech-stack)
4. [How a request flows](#how-a-request-flows)
5. [Repository layout](#repository-layout)
6. [Backend — file by file](#backend--file-by-file)
7. [Frontend — file by file](#frontend--file-by-file)
8. [Data models](#data-models)
9. [Product variants](#product-variants)
10. [API reference](#api-reference)
11. [Seed data](#seed-data)
12. [Environment variables](#environment-variables)
13. [Deployment](#deployment)
14. [Design system](#design-system)
15. [Known scope](#known-scope)
16. [Troubleshooting](#troubleshooting)

---

## Quick start

```bash
# 1. install dependencies for root, backend and frontend
npm run install:all

# 2. create the .env file in the project root (see Environment variables)

# 3. fill the database with demo users, products, orders and coupons
npm run seed

# 4. start both servers (backend :5000, frontend :5173)
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run install:all` | Installs root + `backend/` + `frontend/` dependencies |
| `npm run dev` | Runs API and Vite dev server together via `concurrently` |
| `npm run seed` | Wipes and refills the database (`backend/src/utils/seed.js`) |
| `npm run build` | Production build of the React app into `frontend/dist` |
| `npm run setup` | `install:all` followed by `seed` |

The Vite dev server proxies `/api` to `http://localhost:5000`, so the frontend always calls a relative `/api` path and there is no CORS handling in development.

---

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@shop.com` | `Admin@123` |
| Customer | `user@shop.com` | `User@123` |

Five more customers exist (`priya.sharma@example.com` / `Priya@123`, and so on) so that reviews and orders belong to believable people.

---

## Tech stack

**Frontend** — React 18, Vite 5, React Router 6 (lazy routes), Tailwind CSS 3, Axios, Recharts (admin charts). State lives in four React Contexts; there is no Redux.

**Backend** — Node 20, Express 4, Mongoose 8, JWT (access + refresh), bcryptjs, Zod validation, Multer uploads, Cloudinary (optional), Razorpay, Nodemailer/Brevo, Helmet, express-rate-limit, express-mongo-sanitize.

**Database** — MongoDB (Atlas).

**Hosting** — Frontend on Vercel, API on Render, database on Atlas.

---

## How a request flows

Adding a product to the cart, end to end — this is the clearest way to see how the files connect:

```
ProductDetail.jsx                  user picks "256 GB · Graphite" and clicks Add to Cart
 └─ CartContext.addToCart(id, qty, variantId)
     └─ api/client.js              axios instance — injects Authorization: Bearer <token>
         └─ POST /api/cart         Vite proxy forwards to :5000
             └─ cartRoutes.js      route table
                 └─ auth.js        protect — verifies the JWT, loads req.user
                     └─ cartController.addToCart
                          • loads the Product
                          • resolves the chosen variant
                          • checks that variant's own stock
                          • pushes { product, variant, quantity } onto user.cart
                          • returns the rebuilt cart (unit price from the variant)
 └─ setCart(res.data)              every component reading useCart() re-renders
     └─ CartDrawer opens           the confirmation lands on the item just added
```

Errors take the reverse path: anything thrown lands in `middleware/error.js`, which returns `{ success:false, message }`; the Axios response interceptor turns that into a plain `Error`, and the calling page surfaces it through `ToastContext`.

**The three cart endpoints do not agree on what a quantity means**, which is
the one thing to know before touching a stepper: `POST /cart` **adds** to
what is already there, `PUT /cart/:productId` sets an **absolute** value and
rejects anything below 1, so `DELETE` is the only way to reach zero.
`CartQuantity` encapsulates that so no caller has to remember it.

---

## Repository layout

```
Nexa-Mart/
├── package.json              root scripts only (install:all, dev, seed, build)
├── render.yaml               Render blueprint for the API service
├── .env                      shared by backend (dotenv) and frontend (Vite, envDir "..")
│
├── backend/
│   ├── server.js             entry point — connects Mongo, then listens
│   └── src/
│       ├── createApp.js      builds the Express app: middleware + route mounting
│       ├── config/           env validation, DB, Cloudinary, Razorpay
│       ├── models/           Mongoose schemas
│       ├── controllers/      request handlers (the business logic)
│       ├── routes/           URL → controller mapping
│       ├── middleware/       auth, error handling, uploads, validation
│       ├── validators/       Zod schemas (auth, orders + addresses)
│       └── utils/            catalogue, seed, email, SKUs, tokens, order helpers
│
└── frontend/
    ├── index.html            font + Razorpay script tags
    ├── vite.config.js        dev proxy, envDir, vendor chunk split
    ├── tailwind.config.js    design tokens (colours, fonts, shadows)
    ├── src/
    │   ├── main.jsx          mounts App inside the context providers
    │   ├── App.jsx           route table
    │   ├── api/client.js     the single Axios instance
    │   ├── context/          Auth, Cart, CartDrawer, Toast, Confirm, Settings
    │   ├── components/       shared UI
    │   ├── pages/            storefront pages
    │   ├── pages/admin/      Seller Hub pages
    │   ├── styles/index.css  Tailwind entry + component recipes
    │   └── utils/            formatting, address rules, payment, image fallbacks
    └── public/
        ├── images/products/  product photos (shipped with the app)
        └── images/banners/   home page hero art
```

---

## Backend — file by file

### Entry and wiring

| File | Responsibility |
| --- | --- |
| `server.js` | Validates env, connects MongoDB, starts the HTTP listener |
| `src/createApp.js` | Builds the Express app — Helmet, CORS, JSON parsing, mongo-sanitize, rate limiting — then mounts every route group and the error handler |

### `src/config/`

| File | Responsibility |
| --- | --- |
| `env.js` | Reads and exports environment variables |
| `validateEnv.js` | Fails fast at boot if a required variable is missing |
| `db.js` | `mongoose.connect()` with connection logging |
| `cloudinary.js` | Optional image CDN. `isCloudinaryEnabled()` decides whether uploads go to Cloudinary or straight into MongoDB as a Buffer |
| `razorpay.js` | Razorpay SDK instance built from the key id/secret |

### `src/models/`

| Model | Holds | Notable fields |
| --- | --- | --- |
| `User.js` | Accounts | `password` (bcrypt-hashed in a pre-save hook), `role`, `address`, `addresses[]`, `cart[]`, `wishlist[]` |
| `Product.js` | Catalogue | `images[]`, `specs` (Map), `attributes` (Map), `benefits[]`, `variants[]`, `rating`, `numReviews`; a pre-save hook builds the slug |
| `Order.js` | Orders | `items[]` (price + variant snapshot), `shippingAddress`, `status`, `trackingHistory[]`, `returnInfo`, `refund` |
| `Review.js` | Reviews | Unique `(product, user)` index; a post-save hook recalculates the product's `rating` and `numReviews` |
| `Coupon.js` | Discounts | `type` (percent/fixed), `minOrderAmount`, `maxDiscount`, `usageLimit`, `perUserLimit`, `expiresAt` |
| `Page.js` | CMS pages | `slug`, `title`, `content` (HTML), `isPublished` |
| `Settings.js` | Store settings | Site name, social links, invoice details, SMTP config |
| `ActivityLog.js` | Audit trail | `type`, `action`, `actor` — powers Admin → Logs |
| `Otp.js` | Email codes | Verification and password-reset codes with expiry |

### `src/controllers/`

| Controller | Does |
| --- | --- |
| `authController.js` | Register, OTP verification, login, refresh, logout, forgot/reset password, profile read + update |
| `productController.js` | Public listing with filters and pagination, single product with reviews, filter facets, admin CRUD with image upload and variant building |
| `cartController.js` | Variant-aware cart: add, update quantity, remove, clear. Price and stock always come from the chosen variant |
| `wishlistController.js` | Add / remove / list saved products |
| `reviewController.js` | Create, list by product, delete |
| `orderController.js` | Place order (idempotent), my orders, single order, cancel, return request. Snapshots the variant price and label onto each order line |
| `paymentController.js` | Creates the Razorpay order, verifies the signature, handles the webhook |
| `couponController.js` | Validates a code against the live cart; admin CRUD |
| `pageController.js` | Public CMS reads plus `ensureDefaultPages()`, which inserts any missing default page without touching admin edits |
| `settingsController.js` | Public settings for the footer; admin read/write; test email |
| `adminController.js` | Dashboard stats, order management, returns, refunds, users, activity logs, CSV export |

### `src/middleware/`

| File | Does |
| --- | --- |
| `auth.js` | `protect` verifies the JWT and loads `req.user`; `admin` gates admin-only routes |
| `optionalAuth.js` | Attaches the user when a token is present but never rejects — for public routes that behave differently when signed in |
| `error.js` | Converts thrown errors into a consistent JSON error response |
| `upload.js` | Multer memory storage with file-type and size limits |
| `validate.js` | Runs a Zod schema against the request body |

### `src/validators/`

| File | Holds |
| --- | --- |
| `authValidators.js` | Register, login, OTP, forgot/reset password |
| `orderValidators.js` | `addressSchema` (phone `^[6-9]\d{9}$`, pincode `^[1-9]\d{5}$`, name/line/city/state lengths), `createOrderSchema` and `updateProfileSchema` |

The address rules are enforced **at the route** and deliberately *not* as
`match` on the Mongoose schemas — seeded users and older orders hold addresses
that predate them, and a model-level constraint would make those documents
unsaveable for unrelated reasons. `frontend/src/utils/address.js` mirrors these
rules field for field so the browser catches the same mistakes without a round
trip; change one, change the other.

### `src/utils/`

| File | Does |
| --- | --- |
| `catalogue.js` | **The product catalogue** — 34 products with images, specs, highlights and attributes, plus `variantsByProduct` (99 configurations) |
| `seedData.js` | Users, coupons, review text pools, order plans, and the `seedDatabase()` routine |
| `seed.js` | CLI wrapper — connect, seed, disconnect (`npm run seed`) |
| `productView.js` | Turns a Product document into the shape the frontend expects (builds image URLs, converts Maps to plain objects) |
| `orderStatus.js` | Status transition rules, tracking history, and `adjustStock()` — which moves variant stock as well as product stock |
| `coupons.js` | Server-side coupon validation (expiry, minimum order, usage caps) |
| `sku.js` | `generateSku()` and `generateVariantSku()`, plus per-category attribute lists |
| `tokens.js`, `generateToken.js` | Access and refresh token signing |
| `otp.js` | OTP generation, hashing and verification |
| `email.js`, `emailTemplates.js` | Nodemailer/Brevo transport and the HTML templates |
| `logger.js` | Writes `ActivityLog` entries |
| `paginate.js` | Shared page/limit/skip helper |
| `productImages.js` | Normalises uploaded files into image subdocuments |
| `response.js` | Small success/error response helpers |

---

## Frontend — file by file

### Shell

| File | Does |
| --- | --- |
| `main.jsx` | Mounts `<App/>` inside `SettingsProvider → ToastProvider → ConfirmProvider → AuthProvider → CartProvider → CartDrawerProvider` |
| `App.jsx` | The route table. Lazy-loads every page; hides the storefront navbar and footer on `/admin/*` so the Seller Hub reads as its own console. Also mounts the cart drawer and the cold-start banner |
| `api/client.js` | The single Axios instance: base URL `/api`, `withCredentials`, Bearer header injection, retry-on-cold-start (Render free tier), 401 → refresh → replay, and error normalisation. Dispatches `backend-waking` / `backend-ready` window events for the banner |

### `src/context/`

| Context | Exposes | Used by |
| --- | --- | --- |
| `AuthContext` | `user`, `login`, `register`, `verifyOtp`, `logout`, `updateUser`, `isAdmin` | Navbar, all auth pages, `ProtectedRoute`, Checkout, Profile |
| `CartContext` | `cart`, `wishlist`, `addToCart(id, qty, variantId)`, `updateCartItem`, `removeFromCart`, wishlist helpers, `inWishlist` | Navbar badge, ProductCard, ProductDetail, Cart, Checkout, Wishlist |
| `CartDrawerContext` | `open()` / `close()` (stable identity) and the `isOpen` boolean, split into two contexts so a forty-tile grid does not re-render when the drawer opens | ProductCard, Catalog rows, ProductDetail, CartDrawer |
| `SettingsContext` | `settings`, `useCommerce()` — the admin's live pricing, delivery and payment rules | Home, product pages, Cart, Checkout, PriceDetails |
| `ToastContext` | `toast.success/error/info` | Everywhere |
| `ConfirmContext` | `confirm({ title, message })` returning a promise | Destructive actions (cancel order, delete product) |

### `src/components/`

| Component | Renders |
| --- | --- |
| `Navbar.jsx` | Blue sticky header — logo, offers pill, pincode picker, search, login dropdown, cart badge, More menu, mobile drawer |
| `Footer.jsx` | Dark footer with link columns, social icons, payment glyphs, CMS links |
| `Logo.jsx` | The single brand lockup (`variant="light"` on blue, `"dark"` on white) |
| `SearchBar.jsx` | Search input with a recent/popular suggestion dropdown and keyboard navigation |
| `ProductCard.jsx` | Grid tile — image, title, rating pill, price row, Assured badge, wishlist heart, and the add-to-cart control |
| `CartDrawer.jsx` | Slide-in panel that opens on a successful add: line items, quantity steppers, free-delivery progress, subtotal, View cart / Checkout |
| `QuantityStepper.jsx` | The `− 1 +` control. Presentational only |
| `CartQuantity.jsx` | A stepper bound to a real cart line. Owns its own `busy` flag and knows the cart API is asymmetric — `POST` adds, `PUT` sets and rejects anything below 1, so `DELETE` is the only route to zero |
| `AddressForm.jsx` | The eight shipping-address fields with their input types, `maxLength`, `inputMode`, `autoComplete` and required markers. Used by **both** Checkout and Profile |
| `PriceDetails.jsx` | The **PRICE DETAILS** rail shared by Cart, Checkout and OrderDetail |
| `OrderTimeline.jsx` | Vertical delivery progress (Ordered → Confirmed → Packed → Shipped → Out for delivery → Delivered), plus a return track when there is one. A step counts as done because the order's own tracking events say so, not because of an index — so a cancelled order shows only what really happened |
| `TrackingHistory.jsx` | The tracking event list, dot coloured per status. Shared by the customer and admin order pages |
| `BackendWakingBanner.jsx` | The strip that explains Render's free-tier cold start and counts the seconds |
| `AuthShell.jsx` | Two-panel frame (blue copy panel + white form) used by all five auth screens |
| `AuthFields.jsx` | `AuthField` (floating label), `PasswordField` (show/hide + strength meter mirroring the server's rules), `CodeInput` (six OTP boxes with paste support) |
| `Rating.jsx` | Green `4.3 ★` pill |
| `PageShell.jsx` | Picks the page container: admin passthrough, centred auth, or the standard 1280 px column |
| `Icons.jsx` | The inline SVG icon set |
| `Skeleton.jsx`, `Loader.jsx`, `EmptyState.jsx`, `ErrorState.jsx` | Loading, empty and error states |
| `ProtectedRoute.jsx` | `ProtectedRoute` (needs login) and `AdminRoute` (needs admin) |

### `src/utils/`

| File | Does |
| --- | --- |
| `format.js` | Currency and dates, plus the **status vocabulary**: `statusLabel`, `statusTone`, `statusBadgeClass`, `statusDotClass`, `orderActions(order)`. Every badge, dot and timeline node derives its colour from one table here |
| `address.js` | `EMPTY_ADDRESS`, the phone/pincode patterns, the Indian state list, `validateAddress()` and `formatAddressLine()`. Mirrors `backend/src/validators/orderValidators.js` |
| `payment.js` | `payForOrder()` — opens the Razorpay window for an order that already exists. Used by Checkout **and** by the order page's Pay Now |
| `pricing.js` | `calculateTotals`, `calculateSavings`, delivery estimates — all from the admin's commerce rules |
| `variantMedia.js` | Which photos belong to a chosen variant, plus `lineImage(item)` and `variantLabel(variant)` |
| `productImage.js` | Placeholder and `onError` fallback for product images |
| `razorpay.js` | Lazy-loads the Razorpay SDK, so it costs nothing on pages that are not a payment |

### `src/pages/` — storefront

| Route | File | Renders |
| --- | --- | --- |
| `/` | `Home.jsx` | Category strip, hero carousel, promo tiles, coupon strip, deal rails, trust strip |
| `/products` | `Catalog.jsx` | Sticky filter sidebar, sort tabs, grid and list views, pagination |
| `/products/:id` | `ProductDetail.jsx` | Sticky gallery, offers, **variant picker**, pincode check, seller block, specs / description / reviews tabs, similar products |
| `/cart` | `Cart.jsx` | Deliver-to strip, line items with quantity steppers, Saved For Later, price rail |
| `/checkout` | `Checkout.jsx` | One page: saved-address cards and payment side by side, a sticky summary rail with editable quantities, and a sticky bottom bar on phones |
| `/wishlist` | `Wishlist.jsx` | Saved products with Move to Cart |
| `/orders` | `Orders.jsx` | Grouped status chips with counts, order cards, pagination |
| `/orders/:id` | `OrderDetail.jsx` | Delivery timeline, tracking history, items, price rail, invoice / pay / cancel / return |
| `/orders/:id/invoice` | `Invoice.jsx` | Printable tax invoice |
| `/profile` | `Profile.jsx` | Account menu and editable profile |
| `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` | five files | Auth screens built on `AuthShell` |
| `/page/:slug` | `StaticPage.jsx` | Renders an admin-authored CMS page |
| `*` | `NotFound.jsx` | 404 |

### `src/pages/admin/` — Seller Hub

| Route | File | Does |
| --- | --- | --- |
| `/admin` | `Dashboard.jsx` | Eight stat tiles, sales line chart, orders-by-status bars, recent orders and activity |
| `/admin/products` | `AdminProducts.jsx` | Product table with search, filters and bulk actions |
| `/admin/products/new`, `/:id/edit` | `ProductForm.jsx` | Create/edit — details, images, specs, **variants** |
| `/admin/orders` | `AdminOrders.jsx` | Order table with status and payment filters |
| `/admin/orders/:id` | `AdminOrderDetail.jsx` | Advance status, refund, admin notes |
| `/admin/returns` | `AdminReturns.jsx` | Approve or reject return requests |
| `/admin/users` | `AdminUsers.jsx` | Role and status management |
| `/admin/coupons` | `AdminCoupons.jsx` | Coupon CRUD |
| `/admin/pages` | `Pages.jsx` | CMS page editor |
| `/admin/settings` | `Settings.jsx` | Store, invoice, social and SMTP settings |
| `/admin/logs` | `Logs.jsx` | Activity log viewer |
| — | `AdminLayout.jsx` | White top bar with the Seller Hub wordmark plus the sidebar |

---

## Data models

```
User ──< Order >── Product ──< Review >── User
 │                    │
 ├─ cart[]      ──────┤   (each line stores product + variant + quantity)
 └─ wishlist[]  ──────┘

Product.variants[]   configurations with their own SKU, price and stock
Coupon               validated against the live cart at checkout
Page                 CMS content rendered at /page/:slug
Settings             single document holding store configuration
ActivityLog          append-only audit trail
```

---

## Product variants

Every product sells in several configurations, and the variant is the unit that actually carries price and stock:

```js
// backend/src/models/Product.js
variants: [{
  attributes: Map,      // { Storage: "256 GB", Color: "Graphite" }
  sku: String,          // APP-APPLEIPH-001-256-GRA
  price: Number,
  countInStock: Number,
}]
```

How it holds together:

1. **Catalogue** — `utils/catalogue.js` declares each product's configurations in `variantsByProduct`.
2. **Seeding** — `seedData.js` gives every variant a SKU derived from the product SKU, and sets the product's headline stock to the sum of its variants.
3. **Product page** — `ProductDetail.jsx` renders the picker; choosing an option changes the price, the discount, the stock warning and the specification table.
4. **Cart** — `cart[]` stores `{ product, variant, quantity }`, so the same product in two configurations is two separate lines. `cartController` reads price and stock from the variant.
5. **Order** — `orderController` snapshots `price`, `variantLabel` and `variantSku` onto the order line, so the order still reads correctly even if the catalogue changes later.
6. **Stock** — `orderStatus.adjustStock()` moves the variant's own stock along with the product total, and restores it if the order is cancelled.

Products without variants keep working unchanged — `variantId` is optional at every layer.

---

## API reference

All routes are prefixed with `/api`. 🔒 needs a login, 👑 needs an admin.

### Auth — `/auth`
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register` | Create an account, send an OTP |
| POST | `/verify-otp` | Activate the account |
| POST | `/resend-otp` | Send the code again |
| POST | `/login` | Returns the user plus an access token |
| POST | `/refresh` | New access token from the refresh cookie |
| POST | `/logout` | Clears the refresh cookie |
| POST | `/forgot-password`, `/reset-password` | Password reset by OTP |
| GET/PUT | `/profile` 🔒 | Read and update the profile |

### Products — `/products`
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Listing — `keyword`, `category`, `brand`, `minPrice`, `maxPrice`, `rating`, `featured`, `sort`, `page`, `limit` |
| GET | `/filters` | Facet data for the catalogue sidebar |
| GET | `/:id` | One product with its reviews |
| GET | `/:id/image/:imageId` | Serves an image stored as a Buffer |
| POST/PUT/DELETE | `/` 👑 | Catalogue management (multipart, up to 6 images) |

### Cart — `/cart` 🔒
`GET /` · `POST /` (`productId`, `variantId`, `quantity`) · `PUT /:productId` (`quantity`, `variantId`) · `DELETE /:productId?variantId=` · `DELETE /`

### Wishlist — `/wishlist` 🔒
`GET /` · `POST /` · `DELETE /:productId`

### Orders — `/orders`
`GET /return-reasons` · `POST /` 🔒 · `GET /my` 🔒 · `GET /:id` 🔒 · `PUT /:id/cancel` 🔒 · `POST /:id/return` 🔒 (up to 3 photos)

`POST /` is validated by `createOrderSchema`: `shippingAddress` (full address
rules), `paymentMethod` one of `razorpay` | `cod`, optional `couponCode` and
`idempotencyKey`. A bad phone or pincode returns 400 with the field's own
message. `PUT /auth/profile` runs the same address rules on `address` and
`addresses[]`.

### Payment — `/payment`
`POST /razorpay/:orderId` 🔒 · `POST /verify` 🔒 · `POST /webhook`

### Reviews, Coupons, Pages
`/reviews/product/:productId` (GET, POST 🔒) · `/coupons/validate` 🔒 and coupon CRUD 👑 · `/pages`, `/pages/:slug`

### Admin — `/admin` 👑
`/stats` · `/orders` · `/orders/:id/status` · `/returns` · `/refund` · `/users` · `/logs` · `/export/orders` · `/export/products` · `/settings` · `/pages`

---

## Seed data

`npm run seed` clears the database and writes:

| | |
| --- | --- |
| Users | 1 admin + 6 customers, each with a real Indian address |
| Products | 34 across Smartphones, Laptops, Tablets, Audio, Watches, Accessories |
| Variants | 99 configurations (2–5 per product) with their own SKU, price and stock |
| Images | 89 product photos served from `frontend/public/images/products/` |
| Reviews | ~120 real `Review` documents — ratings are recalculated by the model hook, never hardcoded |
| Orders | 10, covering every status from pending to delivered, cancelled and return requested, across COD and Razorpay |
| Coupons | `NEXA15`, `WELCOME10`, `FESTIVE500`, `FLASH20` |

Product photos live inside the repository rather than being hot-linked, so the demo never depends on a third-party CDN staying up.

---

## Environment variables

Create `.env` in the project root. The backend reads it through dotenv; Vite reads it too (`envDir: ".."` in `vite.config.js`), which is why the client variables live in the same file.

```ini
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>

# Auth
JWT_SECRET=<random string>
JWT_REFRESH_SECRET=<random string>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Payments (Razorpay test keys are fine for the demo)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Email (optional — without it, OTPs are logged to the console)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Brevo — mail over HTTPS instead of SMTP. Required on Render (see Deployment).
BREVO_API_KEY=

# Image CDN (optional — without it, uploaded images are stored in MongoDB)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Client (read by Vite)
VITE_API_URL=
VITE_LOGO_URL=
```

`VITE_API_URL` stays blank locally so the Vite proxy handles `/api` — **and it
is deliberately left unset in production too.** See Deployment.

---

## Deployment

- **API** → Render (`render.yaml`, root directory `backend`, health check `/api/health`), live at `https://nexa-mart.onrender.com`.
- **Frontend** → Vercel, live at `https://nexa-mart-psi.vercel.app`. Build `npm run build`, output `frontend/dist`.
- **Database** → MongoDB Atlas.

The API only serves `/api/*` and never serves the SPA, so there is no client-side routing fallback to configure on the backend.

**The frontend does not hold the API URL.** `VITE_API_URL` is left unset on
Vercel, so the client calls a relative `/api` and the rewrite in `vercel.json`
proxies it to Render. That keeps the backend address in git — where it can be
reviewed and changed with a commit — rather than in a dashboard field that can
silently point at a service that no longer exists. It also makes the two
same-origin, so there is no CORS involved.

**Render's free tier blocks the outbound SMTP ports**, so the `SMTP_*` block
cannot connect there and a send fails with `ENETUNREACH …:587`. `BREVO_API_KEY`
must be set in the Render dashboard; `utils/email.js` only takes the Brevo HTTPS
path when that key is present, and without it no OTP or password-reset code ever
leaves the server — silently, because `forgot-password` sends in the background.
The sender address must be verified in Brevo first.

**Free instances also sleep** after a quiet spell. The first request then takes
30–50 seconds: `api/client.js` detects it, retries, and dispatches the events
`BackendWakingBanner` uses to explain the wait.

---

## Design system

Tokens live in `frontend/tailwind.config.js`; shared component recipes live in `frontend/src/styles/index.css`.

| Token | Value | Used for |
| --- | --- | --- |
| `accent-500` | `#2874f0` | Primary blue — header, links, active states |
| `copper-400` | `#ff9f00` | Add to Cart |
| `copper-500` | `#fb641b` | Buy Now, Place Order |
| `success` | `#388e3c` | Rating pills, discounts, delivery confirmation |
| `paper` | `#f1f3f6` | Page background |
| `footer` | `#172337` | Dark footer |
| `ink-50…950` | cool greys | Text, borders, muted surfaces |

Recipes: `.btn` (with `-cart`, `-buy`, `-outline`, `-ghost`, `-danger`, `-sm`), `.input` (plus an `[aria-invalid]` state), `.input-line`, `.select`, `.textarea`, `.label` / `.label-req`, `.card`, `.badge-*`, `.chip`, `.qty-btn` / `.qty-value`, `.table`, `.rating-pill`, `.price-row`, `.step-head`. Cards and buttons are `rounded-sm` throughout — the flat, square-ish look of the reference design. Typography is Roboto.

### Order status tones

Twelve backend statuses, five tones. Everything that shows a status — the
badge, the list dot, the timeline node, the history bullet — reads the one
table in `utils/format.js`, so they can never drift apart.

| Tone | Statuses | Reads as |
| --- | --- | --- |
| `warning` | `pending`, `return_requested` | waiting on someone |
| `info` | `confirmed`, `processing`, `packed`, `return_approved` | being handled |
| `transit` | `shipped`, `out_for_delivery` | **on its way** |
| `success` | `delivered`, `returned` | finished well |
| `danger` | `cancelled`, `return_rejected` | ended badly |

`transit` takes the copper ramp rather than a fifth shade of blue: "it is
physically moving" is the distinction that matters most to a shopper, and blue
already means "we are handling it".

---

## Known scope

Deliberate boundaries, so nothing here reads as an accidental gap:

- **Single seller.** Every product is sold by NexaMart Retail. "Become a Seller" opens the *Sell on NexaMart* CMS page, which explains that onboarding runs through the category team; the Seller Hub at `/admin` is where the catalogue is actually managed. There is no multi-vendor model or seller registration flow.
- **Payments run on Razorpay test keys.** The full order → payment → verification path works; no live money moves. Cash on Delivery is a real second path — the order is confirmed and stock moves without a payment.
- **Email is optional.** Without SMTP configured, OTPs are printed to the server console so registration still completes. On Render it goes over Brevo's HTTPS API instead (see Deployment).
- **India only.** Prices are ₹, dates are `en-IN`, and the address rules assume a 10-digit mobile and a 6-digit PIN code.
- **Product images ship with the repository.** They are not pushed to a CDN in this configuration; admin uploads do go to Cloudinary when its keys are set.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `EADDRINUSE :5000` | An old API process is still running. Kill it, then `npm run dev` again |
| `'nodemon' is not recognized` | Backend dependencies were never installed — run `npm run install:all` |
| Storefront loads but every list is empty | The database has not been seeded — run `npm run seed` |
| Products show a grey placeholder | The `frontend/public/images/products/` folder is missing; restore it from the repository |
| "Waking the server up…" on the deployed site | Render's free tier cold start. It clears itself; the client retries and the banner counts the wait |
| OTP email never arrives locally | SMTP is not configured — read the code from the API server console |
| OTP email never arrives **on the deployed site** | `BREVO_API_KEY` is not set on Render. Free instances block the SMTP ports, so without it the send fails with `ENETUNREACH …:587` — and silently, because `forgot-password` sends in the background. Check with **Admin → Settings → Send test email**, which surfaces the real error |
| Checkout rejects an address that used to work | The phone and pincode rules are new and are enforced on the server too. A saved address that predates them opens in the form so it can be corrected |
| The deployed site loads but every list is empty | The frontend is calling an API that is not there. `VITE_API_URL` should be **unset** on Vercel so the `vercel.json` rewrite handles `/api` |

## Author & Developer

Developed with ❤️ by **Mohd Zaid**
- **GitHub**: [github.com/zaid154](https://github.com/zaid154)
- **LinkedIn**: [linkedin.com/in/mohd-zaid-794090231](https://www.linkedin.com/in/mohd-zaid-794090231/)
- **Email**: [trendykart.app@gmail.com](mailto:trendykart.app@gmail.com)

