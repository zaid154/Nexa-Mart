# NexaMart - Flipkart-Inspired Electronics E-Commerce Platform

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment_Gateway-02042B?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

NexaMart is a production-ready, full-stack MERN e-commerce web platform engineered with an authentic **1:1 Flipkart-inspired design system** and modern full-stack web architecture. It features a clean single-product model, dual-panel media showcase, an interactive persistent cart quantity stepper, a 4-step accordion checkout flow, verified-buyer delivery-enforced product reviews, dual payment processing (Razorpay UPI/Cards/Netbanking + Cash on Delivery), and a comprehensive **12-Module Seller Hub (Admin Console)**.

---

## Live Demo & Repositories

- **Frontend Application:** [nexamart-pro.vercel.app](https://nexamart-pro.vercel.app/)
- **Backend REST API:** [nexa-mart.onrender.com/api](https://nexa-mart.onrender.com/api)
- **GitHub Repository:** [github.com/zaid154/Nexa-Mart](https://github.com/zaid154/Nexa-Mart)
- **Author:** Mohd Zaid ([Portfolio](https://zaid-pro.vercel.app/) | [GitHub](https://github.com/zaid154) | [LinkedIn](https://www.linkedin.com/in/mohd-zaid-794090231/))

---

## Key Features & Highlights

### 1. Flipkart 1:1 Design System & UX Experience
- **Signature Visual Canvas:** Built on Flipkart's `#f1f3f6` body canvas with crisp `#ffffff` cards, distinct drop shadows, and authentic typography scale.
- **Dual-Panel Showcase (Above the Fold):** Product detail page features a responsive vertical thumbnail rail alongside a high-resolution interactive image preview with Flipkart-style action triggers (`Add to Cart` in `#ff9f00` amber and `Buy Now` in `#fb641b` orange) completely visible without vertical scrolling.
- **Interactive Cart Stepper:** Seamless transition between `Add to Cart` and Flipkart-style `[ − ] 1 IN CART [ + ]` quantity stepper with zero layout shift (`h-8 sm:h-9` matched dimensions) across product cards, catalog, and detail pages.
- **Sticky Price Details Sidebar:** Real-time breakdown card computing Base MRP, Product Discount savings, Delivery Charges (Free delivery threshold), and Total Payable amount.

### 2. Streamlined Single-Product Data Architecture
- **Performant Data Model:** Optimized MongoDB schema eliminating legacy variant bloat. Each product encapsulates SEO-friendly slugs, categories, brand, specifications matrix, stock availability, pricing, and discount percentages.
- **Faceted Catalog Filtering:** Multi-criteria filtering by category chips, price sliders, brand selection, and minimum rating thresholds, paired with responsive sorting (Price: Low to High, High to Low, Newest Arrivals, Customer Rating).

### 3. Flipkart 4-Step Accordion Checkout Flow
- **Step 1: Login Check:** Automatically detects and verifies user session state, allowing instant seamless progression.
- **Step 2: Delivery Address:** Interactive address book supporting saved address selection, inline edit/creation, and automatic persistence.
- **Step 3: Order Summary:** Itemized review of selected products, quantities, delivery estimates, and notification preferences.
- **Step 4: Payment Options:** Complete payment gateway selection:
  - **Online Payment:** Integrated Razorpay checkout modal with support for UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking.
  - **Cash on Delivery (COD):** Direct order confirmation for doorstep cash payment.

### 4. Verified Buyer Delivered-Only Reviews & Ratings
- **Strict Verification Gate:** Customers can only review and submit star ratings for a product if they have an order with `status: "delivered"` for that exact product (`GET /api/products/:id/review-eligibility`).
- **Separated Full-Width Layout:** Product Description and Technical Specifications are structured in a dedicated full-width container separate from the Customer Reviews section, preventing awkward white spaces regardless of review volume.

### 5. Comprehensive 12-Module Seller Hub (Admin Console)
A dedicated administrative back-office protected with Role-Based Access Control (RBAC):
1. **Dashboard (`/admin`):** Live KPI cards (Total Revenue, Orders, Products, Active Customers), sales trend charts, and recent activity.
2. **Products Management (`/admin/products`):** Paginated inventory view with real-time stock counters, status toggles, and live search.
3. **Product Editor (`/admin/products/new` & `/admin/products/:id`):** Multi-tab product creation/editing with image upload, technical specification key-value pairs, and category mapping.
4. **Order Fulfillment (`/admin/orders`):** Complete order lifecycle state machine (`Placed` → `Confirmed` → `Shipped` → `Delivered` → `Cancelled`).
5. **Order Details (`/admin/orders/:id`):** Detailed breakdown of customer shipping address, payment status, tracking numbers, and direct invoice link.
6. **Returns & Refunds (`/admin/returns`):** Return request management center to review, approve, or reject customer return submissions.
7. **Coupons & Promotions (`/admin/coupons`):** Create percentage or flat discounts with minimum order thresholds, usage caps, and validity schedules.
8. **User Directory (`/admin/users`):** Manage registered customers, view individual order histories, and toggle account activation.
9. **CMS Pages (`/admin/pages`):** Manage static policy pages (Terms of Use, Privacy Policy, Shipping Info).
10. **Store Settings (`/admin/settings`):** Configure store metadata, currency symbols, tax rates, and payment gateway keys.
11. **Activity Logs (`/admin/logs`):** Audit trail of administrative operations and critical store events.
12. **Printable Tax Invoices (`/orders/:id/invoice`):** Formatted GST-compliant tax invoices with itemized HSN codes, CGST/SGST breakdowns, and print-ready CSS.

---

## Tech Stack

### Frontend
- **Framework & Tooling:** React 18, Vite 5
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 3 (Custom Flipkart Bazaar design tokens)
- **Icons:** Custom Flipkart-authentic SVG icon suite & Lucide React
- **Data Visualization:** Recharts (Admin analytics charts)
- **State Management:** React Context API (`authContext`, `cartContext`, `toastContext`)
- **HTTP Client:** Axios with centralized interceptors

### Backend & Database
- **Runtime:** Node.js (v18+)
- **Web Framework:** Express.js 4
- **Database:** MongoDB Atlas with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with Bcrypt password hashing
- **Security & Performance:** Helmet, CORS, Compression, express-rate-limit, express-mongo-sanitize
- **Payment Gateway:** Razorpay SDK (Order generation, cryptographic signature verification, test mode)
- **File Uploads:** Multer with Cloudinary CDN integration

---

## Project Structure

```
Nexa-Mart/
├── server/
│   ├── config/              # dbConfig.js, envConfig.js, razorpayConfig.js, validateEnvConfig.js
│   ├── controllers/         # productController.js, orderController.js, cartController.js, adminController.js
│   ├── middleware/          # authMiddleware.js, errorMiddleware.js, uploadMiddleware.js
│   ├── models/              # productModel.js, orderModel.js, userModel.js, couponModel.js, pageModel.js, settingsModel.js
│   ├── routes/              # productRoutes.js, orderRoutes.js, authRoutes.js, reviewRoutes.js, adminRoutes.js, ...
│   ├── seed/                # catalogueData.js, seedData.js, uploadCloudinary.js
│   ├── services/            # emailService.js, orderService.js, tokenService.js
│   ├── utils/               # formatUtils.js, couponUtils.js, productImageUtils.js
│   ├── validators/          # authValidators.js, orderValidators.js
│   ├── seedData.js          # Database seeding script (npm run seed)
│   ├── server.js            # Express application entry point (npm start)
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/             # apiClient.js (Axios instance with auth interceptor)
│   │   ├── Component/       # Storefront pages & reusable UI components
│   │   │   ├── homePage.jsx
│   │   │   ├── catalogPage.jsx
│   │   │   ├── productDetailPage.jsx
│   │   │   ├── cartPage.jsx
│   │   │   ├── cartQuantity.jsx      # Flipkart-style [ − ] 1 [ + ] quantity stepper
│   │   │   ├── checkoutPage.jsx      # Flipkart 4-step accordion checkout
│   │   │   ├── ordersPage.jsx
│   │   │   ├── orderDetailsPage.jsx
│   │   │   ├── wishlistPage.jsx
│   │   │   ├── loginPage.jsx
│   │   │   ├── registerPage.jsx
│   │   │   ├── profilePage.jsx
│   │   │   ├── invoicePage.jsx       # Printable tax invoice
│   │   │   ├── navbar.jsx            # Flipkart header with category search
│   │   │   ├── footer.jsx
│   │   │   ├── productCard.jsx       # Product showcase with inline cart stepper
│   │   │   ├── icons.jsx             # Authentic Flipkart SVG icons
│   │   │   └── admin/                # Dedicated 12-Module Seller Hub
│   │   │       ├── adminLayout.jsx
│   │   │       ├── adminDashboardPage.jsx
│   │   │       ├── adminProductsPage.jsx
│   │   │       ├── adminProductFormPage.jsx
│   │   │       ├── adminOrdersPage.jsx
│   │   │       ├── adminOrderDetailPage.jsx
│   │   │       ├── adminReturnsPage.jsx
│   │   │       ├── adminCouponsPage.jsx
│   │   │       ├── adminPagesPage.jsx
│   │   │       ├── adminUsersPage.jsx
│   │   │       ├── adminSettingsPage.jsx
│   │   │       └── adminLogsPage.jsx
│   │   ├── context/         # authContext.jsx, cartContext.jsx, toastContext.jsx
│   │   ├── utils/           # formatUtils.js, paymentUtils.js, pricingUtils.js
│   │   ├── App.jsx          # Route definitions & protected route guards
│   │   └── main.jsx         # React application root
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## Getting Started Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Active MongoDB Atlas connection URI or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/zaid154/Nexa-Mart.git
cd Nexa-Mart
```

### 2. Backend Configuration & Setup
```bash
cd server
npm install

# Create environment configuration
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nexamart?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Seed the database with sample products and administrative accounts:
```bash
npm run seed
```

Start the backend API server:
```bash
npm run dev
# Backend API server running at http://localhost:5000
```

### 3. Frontend Configuration & Setup
In a separate terminal:
```bash
cd client
npm install

# Start Vite development server
npm run dev
# Frontend running at http://localhost:5173
```

### 4. Production Build
```bash
cd client
npm run build
```

---

## Default Demo Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@nexamart.com` | `admin123` | Full access to Seller Hub, product catalog, inventory, orders, and system logs |
| **Customer** | `customer@nexamart.com` | `password123` | Storefront buyer access with cart, wishlist, orders, and verified reviews |

---

## API Endpoints Reference

### Authentication & Users
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |
| `POST` | `/api/auth/logout` | Clear user session cookie | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `PUT` | `/api/auth/profile` | Update profile information & addresses | Yes |

### Products & Reviews
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/products` | Get paginated products with category, brand, rating, and price filters | No |
| `GET` | `/api/products/:id` | Get single product details, specifications, and reviews | No |
| `GET` | `/api/products/:id/review-eligibility` | Check if current user has a delivered order for this product | Yes |
| `POST` | `/api/products/:id/reviews` | Submit rating & review (Verified Delivered Buyers only) | Yes |

### Cart & Wishlist
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/cart` | Get authenticated user's cart | Yes |
| `POST` | `/api/cart` | Add item or increment quantity in cart | Yes |
| `PUT` | `/api/cart/:productId` | Update item quantity | Yes |
| `DELETE`| `/api/cart/:productId` | Remove item from cart | Yes |
| `GET` | `/api/wishlist` | Get user's saved wishlist items | Yes |
| `POST` | `/api/wishlist` | Toggle item in wishlist | Yes |

### Orders & Payment
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/orders` | Place new order (Cash on Delivery or Online) | Yes |
| `GET` | `/api/orders` | Get authenticated user's order history | Yes |
| `GET` | `/api/orders/:id` | Get detailed order milestone tracking & items | Yes |
| `PUT` | `/api/orders/:id/cancel` | Cancel an order prior to shipment | Yes |
| `POST` | `/api/payment/razorpay/:id` | Generate Razorpay order token | Yes |
| `POST` | `/api/payment/verify` | Verify Razorpay cryptographic payment signature | Yes |

### Admin & Seller Hub
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Get KPI metrics and revenue analytics | Admin |
| `GET` | `/api/admin/products` | Get all products with stock and status filters | Admin |
| `POST` | `/api/admin/products` | Create new product | Admin |
| `PUT`, `DELETE` | `/api/admin/products/:id` | Update product details or delete product | Admin |
| `GET` | `/api/admin/orders` | Get all orders with status filters | Admin |
| `PUT` | `/api/admin/orders/:id/status` | Transition order status (`Placed` → `Delivered`) | Admin |
| `GET` | `/api/admin/returns` | Manage and review customer return requests | Admin |
| `GET`, `POST` | `/api/coupons` | Manage discount coupons and thresholds | Admin |
| `GET` | `/api/admin/users` | View customer directory and manage account statuses | Admin |
| `GET`, `PUT` | `/api/admin/settings` | Retrieve and update global store configurations | Admin |
| `GET` | `/api/admin/logs` | Fetch system audit and activity logs | Admin |

---

## License

This project is open source and available under the [MIT License](LICENSE).
