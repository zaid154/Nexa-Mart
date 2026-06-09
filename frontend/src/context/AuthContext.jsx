import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

// This context keeps track of the logged in user for the whole app.
const AuthContext = createContext(null);

// Helper hook so other files can read the auth data easily.
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app first loads, check if we already have a saved token.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    // We have a token, so ask the server who this user is.
    api
      .get("/auth/profile")
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        // Token is not valid anymore, so remove it.
        localStorage.removeItem("token");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Log the user in with email and password.
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email: email, password: password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  // Create a new account.
  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name: name, email: email, password: password });
    return res.data;
  };

  // Verify the OTP code sent to the user's email.
  const verifyOtp = async (email, code) => {
    const res = await api.post("/auth/verify-otp", { email: email, code: code });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  // Log the user out.
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // If the server call fails we still log out on our side.
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  // Update only some fields of the user object.
  const updateUser = (changes) => {
    setUser((oldUser) => ({ ...oldUser, ...changes }));
  };

  // Check if the current user is an admin.
  let isAdmin = false;
  if (user && user.role === "admin") {
    isAdmin = true;
  }

  const value = {
    user: user,
    loading: loading,
    login: login,
    register: register,
    verifyOtp: verifyOtp,
    logout: logout,
    updateUser: updateUser,
    isAdmin: isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
