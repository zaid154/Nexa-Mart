# NexaMart - Electronics E-Commerce Marketplace

NexaMart is a full-stack MERN e-commerce web application inspired by modern Indian electronics marketplaces. It features multi-attribute product variants, dynamic SKU pricing, cart and wishlist persistence, Cash on Delivery (COD) and Razorpay payment flows, live order milestone tracking, and a dedicated **Seller Hub (Admin Dashboard)**.

---

## Live Demo & Links

- **Frontend:** [nexa-mart-psi.vercel.app](https://nexa-mart-psi.vercel.app/)
- **Backend API:** [nexa-mart.onrender.com/api](https://nexa-mart.onrender.com/api)
- **Author:** Mohd Zaid ([GitHub](https://github.com/zaid154) | [LinkedIn](https://www.linkedin.com/in/mohd-zaid-794090231/))

---

## Features

### Customer Experience
- **Electronics Catalog & Faceted Search:** Browse and search electronics (Smartphones, Laptops, Audio, Smartwatches, Accessories) with category chips, price ranges, customer ratings, and dynamic sorting.
- **Dynamic Product Variant Engine:** Real-time attribute selection (e.g. Storage: 128GB / 256GB, Color: Space Grey / Silver), dynamic SKU resolution, image galleries, and live stock sync.
- **Cart & Wishlist Synchronization:** Persistent shopping cart and wishlist backed by React Context API and synced directly to MongoDB for authenticated users.
- **Streamlined 2-Step Checkout:** Verified Indian address collection (Phone, Street, City, State, Pincode), order breakdown, and instant coupon code discounts.
- **Dual Payment Modes:**
  - **Online Payment:** Integrated Razorpay checkout modal supporting UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking.
  - **Cash on Delivery (COD):** Direct order placement for doorstep cash collection.
- **Live Order Milestone Tracking:** Step-by-step progress tracking (`Placed` -> `Confirmed` -> `Shipped` -> `Delivered`) and self-serve order cancellation.
- **Printable Tax Invoices:** Dedicated invoice view (`/orders/:id/invoice`) with itemized HSN breakdowns and order totals.

### Seller Hub (Admin Console)
- **Inventory & Product Management (`/admin/products`):** Add, update, and manage product variants, specifications, images, and live inventory stock.
- **Order Fulfillment Center (`/admin/orders`):** Update delivery lifecycle stages, view customer contact details, and handle order cancellations.
- **Discount & Coupon Manager (`/admin/coupons`):** Create percentage or fixed-value coupon codes with minimum cart thresholds and expiry dates.
- **Customer Directory (`/admin/users`):** View registered buyers, order histories, and manage customer account statuses.

---

## Tech Stack

- **Frontend:** React 18, Vite 5, React Router v6, Tailwind CSS 3, Axios
- **Backend:** Node.js, Express.js 4, Mongoose ODM
- **Database:** MongoDB Atlas Cloud
- **Payments:** Razorpay SDK (Test Mode & Live Webhooks)
- **Authentication:** JWT (JSON Web Tokens) with Bcrypt password hashing
- **Deployment:** Vercel (Frontend), Render (Backend API)

---

## Project Structure

```
Nexa-Mart/
├── backend/
│   ├── config/              # dbConfig.js, envConfig.js, razorpayConfig.js
│   ├── controllers/         # productController.js, orderController.js, cartController.js
│   ├── middleware/          # authMiddleware.js, errorMiddleware.js, uploadMiddleware.js
│   ├── models/              # productModel.js, orderModel.js, userModel.js, otpModel.js
│   ├── routes/              # productRoutes.js, orderRoutes.js, authRoutes.js
│   ├── seed/                # catalogueData.js, seedData.js, uploadCloudinary.js
│   ├── services/            # emailService.js, orderService.js, tokenService.js
│   ├── utils/               # formatUtils.js, couponUtils.js, productImageUtils.js
│   ├── validators/          # authValidators.js, orderValidators.js
│   ├── seedData.js          # Database seeder entry point (npm run seed)
│   ├── server.js            # Express application entry point (npm start)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # apiClient.js
│   │   ├── Component/       # camelCase storefront pages & UI components
│   │   │   ├── homePage.jsx
│   │   │   ├── catalogPage.jsx
│   │   │   ├── productDetailPage.jsx
│   │   │   ├── cartPage.jsx
│   │   │   ├── checkoutPage.jsx
│   │   │   ├── ordersPage.jsx
│   │   │   ├── orderDetailsPage.jsx
│   │   │   ├── wishlistPage.jsx
│   │   │   ├── loginPage.jsx
│   │   │   ├── registerPage.jsx
│   │   │   ├── profilePage.jsx
│   │   │   ├── invoicePage.jsx
│   │   │   ├── navbar.jsx
│   │   │   ├── footer.jsx
│   │   │   ├── productCard.jsx
│   │   │   ├── cartDrawer.jsx
│   │   │   └── admin/       # Dedicated Seller Hub pages
│   │   │       ├── adminLayout.jsx
│   │   │       ├── adminDashboardPage.jsx
│   │   │       ├── adminProductsPage.jsx
│   │   │       ├── adminProductFormPage.jsx
│   │   │       ├── adminOrdersPage.jsx
│   │   │       ├── adminOrderDetailPage.jsx
│   │   │       ├── adminCouponsPage.jsx
│   │   │       ├── adminReturnsPage.jsx
│   │   │       ├── adminUsersPage.jsx
│   │   │       ├── adminSettingsPage.jsx
│   │   │       └── adminLogsPage.jsx
│   │   ├── context/         # authContext.jsx, cartContext.jsx, toastContext.jsx
│   │   ├── utils/           # formatUtils.js, paymentUtils.js, pricingUtils.js
│   │   ├── App.jsx          # Declarative React Router routing switch
│   │   └── main.jsx         # Application root mount point
│   ├── index.html
│   └── package.json
└── README.md
```

---

## Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and supply your MONGO_URI and JWT_SECRET

# Seed sample electronics catalogue
npm run seed

# Start development server
npm run dev
# Server running at http://localhost:5000
```

### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
# Application running at http://localhost:5173
```

### 3. Production Build
```bash
cd frontend
npm run build
```

---

## Default Demo Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@nexamart.com` | `admin123` | Full access to Seller Hub, product catalog, inventory, and orders |
| **Customer** | `customer@nexamart.com` | `password123` | Customer profile with cart, orders, and review privileges |

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Get paginated products with search, category, brand, and price filters |
| `GET` | `/api/products/:id` | Get single product details, variants, and customer reviews |
| `POST` | `/api/products` | Create new product (Admin) |
| `PUT`, `DELETE`| `/api/products/:id` | Update product or soft-delete from catalog (Admin) |
| `GET` | `/api/cart` | Get current user's shopping cart |
| `POST` | `/api/cart` | Add item or variant to cart |
| `PUT`, `DELETE`| `/api/cart/:productId` | Update item quantity or remove line item |
| `GET` | `/api/wishlist` | Get user's saved wishlist items |
| `POST`, `DELETE`| `/api/wishlist` | Add or remove product from wishlist |
| `POST` | `/api/orders` | Place new order (supports COD and Razorpay online checkout) |
| `GET` | `/api/orders` | Get authenticated user's order history |
| `GET` | `/api/orders/:id` | Get detailed order timeline and shipping info |
| `PUT` | `/api/orders/:id/cancel`| Cancel pending order |
| `POST` | `/api/payment/razorpay/:id`| Generate Razorpay order token |
| `POST` | `/api/payment/verify` | Verify Razorpay payment signature |
| `POST` | `/api/auth/register` | Register new customer account |
| `POST` | `/api/auth/login` | Authenticate customer or admin account |
| `POST` | `/api/auth/logout` | Clear user session |

---

## License

This project is open source and available under the [MIT License](LICENSE).
