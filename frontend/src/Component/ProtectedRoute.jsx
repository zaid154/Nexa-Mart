import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./Loader.jsx";

// Only lets logged in users see the page. Others go to the login page.
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still checking if the user is logged in.
  if (loading) {
    return <Loader full />;
  }
  // Not logged in, so send them to login and remember where they came from.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

// Only lets admin users see the page.
export const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader full />;
  }
  // Not logged in at all.
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Logged in but not an admin.
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
};
