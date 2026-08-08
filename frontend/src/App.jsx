import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PageShell from "./components/PageShell.jsx";
import Loader from "./components/Loader.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute.jsx";
import BackendWakingBanner from "./components/BackendWakingBanner.jsx";

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
const StaticPage = lazy(() => import("./pages/StaticPage.jsx"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.jsx"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail.jsx"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons.jsx"));
const Settings = lazy(() => import("./pages/admin/Settings.jsx"));
const Logs = lazy(() => import("./pages/admin/Logs.jsx"));
const AdminPages = lazy(() => import("./pages/admin/Pages.jsx"));

// Show loader while a lazy page is loading
function PageLoader() {
  return <Loader full />;
}

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  // The admin panel is its own console: it brings its own header and hides the
  // storefront navbar and footer.
  let isAdminPage = false;
  if (currentPath.startsWith("/admin")) {
    isAdminPage = true;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Outside the admin guard: a sleeping server is just as confusing in
          the admin console as it is on the storefront. */}
      <BackendWakingBanner />
      {!isAdminPage && <Navbar />}
      {!isAdminPage && <CartDrawer />}

      <main className="flex flex-1 flex-col">
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
              <Route path="/page/:slug" element={<StaticPage />} />

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
                <Route path="pages" element={<AdminPages />} />
                <Route path="coupons" element={<AdminCoupons />} />
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
