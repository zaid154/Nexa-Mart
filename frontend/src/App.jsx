import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./Component/Navbar.jsx";
import Footer from "./Component/Footer.jsx";
import PageShell from "./Component/PageShell.jsx";
import Loader from "./Component/Loader.jsx";
import CartDrawer from "./Component/CartDrawer.jsx";
import { ProtectedRoute, AdminRoute } from "./Component/ProtectedRoute.jsx";
import BackendWakingBanner from "./Component/BackendWakingBanner.jsx";
import MobileBottomNav from "./Component/MobileBottomNav.jsx";

// Lazy-loaded pages
const HomePage = lazy(() => import("./Component/HomePage.jsx"));
const CatalogPage = lazy(() => import("./Component/CatalogPage.jsx"));
const ProductDetailPage = lazy(() => import("./Component/ProductDetailPage.jsx"));
const CartPage = lazy(() => import("./Component/CartPage.jsx"));
const WishlistPage = lazy(() => import("./Component/WishlistPage.jsx"));
const LoginPage = lazy(() => import("./Component/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./Component/RegisterPage.jsx"));
const VerifyOtpPage = lazy(() => import("./Component/VerifyOtpPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./Component/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./Component/ResetPasswordPage.jsx"));
const ProfilePage = lazy(() => import("./Component/ProfilePage.jsx"));
const CheckoutPage = lazy(() => import("./Component/CheckoutPage.jsx"));
const OrdersPage = lazy(() => import("./Component/OrdersPage.jsx"));
const OrderDetailsPage = lazy(() => import("./Component/OrderDetailsPage.jsx"));
const InvoicePage = lazy(() => import("./Component/InvoicePage.jsx"));
const NotFoundPage = lazy(() => import("./Component/NotFoundPage.jsx"));
const StaticPage = lazy(() => import("./Component/StaticPage.jsx"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./Component/admin/AdminLayout.jsx"));
const AdminDashboardPage = lazy(() => import("./Component/admin/AdminDashboardPage.jsx"));
const AdminProductsPage = lazy(() => import("./Component/admin/AdminProductsPage.jsx"));
const AdminProductFormPage = lazy(() => import("./Component/admin/AdminProductFormPage.jsx"));
const AdminOrdersPage = lazy(() => import("./Component/admin/AdminOrdersPage.jsx"));
const AdminOrderDetailPage = lazy(() => import("./Component/admin/AdminOrderDetailPage.jsx"));
const AdminReturnsPage = lazy(() => import("./Component/admin/AdminReturnsPage.jsx"));
const AdminUsersPage = lazy(() => import("./Component/admin/AdminUsersPage.jsx"));
const AdminCouponsPage = lazy(() => import("./Component/admin/AdminCouponsPage.jsx"));
const AdminSettingsPage = lazy(() => import("./Component/admin/AdminSettingsPage.jsx"));
const AdminLogsPage = lazy(() => import("./Component/admin/AdminLogsPage.jsx"));
const AdminPagesPage = lazy(() => import("./Component/admin/AdminPagesPage.jsx"));

function PageLoader() {
  return <Loader full />;
}

export default function App() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      <BackendWakingBanner />
      {!isAdminPage && <Navbar />}
      {!isAdminPage && <CartDrawer />}
      {!isAdminPage && <MobileBottomNav />}

      <main className="flex flex-1 flex-col">
        <PageShell>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public storefront routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<CatalogPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/page/:slug" element={<StaticPage />} />

              {/* Protected user routes */}
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id/invoice"
                element={
                  <ProtectedRoute>
                    <InvoicePage />
                  </ProtectedRoute>
                }
              />

              {/* Protected admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="products/new" element={<AdminProductFormPage />} />
                <Route path="products/:id/edit" element={<AdminProductFormPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="orders/:id" element={<AdminOrderDetailPage />} />
                <Route path="returns" element={<AdminReturnsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="pages" element={<AdminPagesPage />} />
                <Route path="coupons" element={<AdminCouponsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="logs" element={<AdminLogsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </PageShell>
      </main>

      {!isAdminPage && <Footer />}
    </div>
  );
}
