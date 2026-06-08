import { useLocation } from "react-router-dom";

export default function PageShell({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  const isAuth =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-otp" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (isAdmin) return children;

  return (
    <div className={`page-shell ${isAuth ? "page-shell-auth" : ""}`}>
      {children}
    </div>
  );
}
