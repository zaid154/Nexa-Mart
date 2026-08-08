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

  if (isAuthPage) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-14">
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-20 pt-8 sm:px-6">
      {children}
    </div>
  );
};

export default PageShell;
