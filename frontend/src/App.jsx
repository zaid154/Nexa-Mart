import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PageShell from "./components/PageShell.jsx";
import Loader from "./components/Loader.jsx";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute.jsx";

// Lazy load pages so they load only when user visits them (faster first load)
const Home = lazy(() => import("./pages/Home.jsx"));
const Catalog = lazy(() => import("./pages/Catalog.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const OrderDetail = lazy(() => import("./pages/OrderDetail.jsx"));
const Invoice = lazy(() => import("./pages/Invoice.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.jsx"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail.jsx"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const Settings = lazy(() => import("./pages/admin/Settings.jsx"));
const Logs = lazy(() => import("./pages/admin/Logs.jsx"));

// Show loader while a lazy page is loading
function PageLoader() {
  return <Loader full />;
}

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Hide footer on admin pages
  let isAdminPage = false;
  if (currentPath.startsWith("/admin")) {
    isAdminPage = true;
  }

  let appClassName = "app";
  if (isAdminPage) {
    appClassName = "app app-admin";
  }

  return (
    <div className={appClassName}>
      <Navbar />

      <main className="main">
        <PageShell>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public pages */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Catalog />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Pages that need login */}
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id/invoice"
                element={
                  <ProtectedRoute>
                    <Invoice />
                  </ProtectedRoute>
                }
              />

              {/* Admin panel routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="returns" element={<AdminReturns />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="logs" element={<Logs />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </PageShell>
      </main>

      {!isAdminPage && <Footer />}
    </div>
  );
}
