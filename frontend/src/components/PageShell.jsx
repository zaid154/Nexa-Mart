import { useLocation } from "react-router-dom";

// Wraps the page content. Admin pages and auth pages get different layouts.
const PageShell = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  // Admin pages bring their own layout, so we just return the content.
  const isAdminPage = path.startsWith("/admin");

  // These are the login / register style pages.
  let isAuthPage = false;
  if (
    path === "/login" ||
    path === "/register" ||
    path === "/verify-otp" ||
    path === "/forgot-password" ||
    path === "/reset-password"
  ) {
    isAuthPage = true;
  }

  if (isAdminPage) {
    return children;
  }

  let shellClass = "page-shell";
  if (isAuthPage) {
    shellClass = "page-shell page-shell-auth";
  }

  return <div className={shellClass}>{children}</div>;
};

export default PageShell;
