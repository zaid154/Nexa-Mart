import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./Component/navbar.jsx";
import Footer from "./Component/footer.jsx";
import PageShell from "./Component/pageShell.jsx";
import Loader from "./Component/loader.jsx";
import CartDrawer from "./Component/cartDrawer.jsx";
import { ProtectedRoute, AdminRoute } from "./Component/protectedRoute.jsx";
import BackendWakingBanner from "./Component/backendWakingBanner.jsx";
import MobileBottomNav from "./Component/mobileBottomNav.jsx";

// Lazy-loaded pages
const HomePage = lazy(() => import("./Component/homePage.jsx"));
const CatalogPage = lazy(() => import("./Component/catalogPage.jsx"));
const ProductDetailPage = lazy(() => import("./Component/productDetailPage.jsx"));
const CartPage = lazy(() => import("./Component/cartPage.jsx"));
const WishlistPage = lazy(() => import("./Component/wishlistPage.jsx"));
const LoginPage = lazy(() => import("./Component/loginPage.jsx"));
const RegisterPage = lazy(() => import("./Component/registerPage.jsx"));
const VerifyOtpPage = lazy(() => import("./Component/verifyOtpPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./Component/forgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./Component/resetPasswordPage.jsx"));
const ProfilePage = lazy(() => import("./Component/profilePage.jsx"));
const CheckoutPage = lazy(() => import("./Component/checkoutPage.jsx"));
const OrdersPage = lazy(() => import("./Component/ordersPage.jsx"));
const OrderDetailsPage = lazy(() => import("./Component/orderDetailsPage.jsx"));
const InvoicePage = lazy(() => import("./Component/invoicePage.jsx"));
const NotFoundPage = lazy(() => import("./Component/notFoundPage.jsx"));
const StaticPage = lazy(() => import("./Component/staticPage.jsx"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./Component/admin/adminLayout.jsx"));
const AdminDashboardPage = lazy(() => import("./Component/admin/adminDashboardPage.jsx"));
const AdminProductsPage = lazy(() => import("./Component/admin/adminProductsPage.jsx"));
const AdminProductFormPage = lazy(() => import("./Component/admin/adminProductFormPage.jsx"));
const AdminOrdersPage = lazy(() => import("./Component/admin/adminOrdersPage.jsx"));
const AdminOrderDetailPage = lazy(() => import("./Component/admin/adminOrderDetailPage.jsx"));
const AdminReturnsPage = lazy(() => import("./Component/admin/adminReturnsPage.jsx"));
const AdminUsersPage = lazy(() => import("./Component/admin/adminUsersPage.jsx"));
const AdminCouponsPage = lazy(() => import("./Component/admin/adminCouponsPage.jsx"));
const AdminSettingsPage = lazy(() => import("./Component/admin/adminSettingsPage.jsx"));
const AdminLogsPage = lazy(() => import("./Component/admin/adminLogsPage.jsx"));
const AdminPagesPage = lazy(() => import("./Component/admin/adminPagesPage.jsx"));

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
