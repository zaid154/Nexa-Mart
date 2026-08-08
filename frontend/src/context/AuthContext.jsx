import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAccessToken, clearAccessToken } from "../api/client.js";

// This context keeps track of the logged in user for the whole app.
const AuthContext = createContext(null);

// Helper hook so other files can read the auth data easily.
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app first loads, try a silent refresh to restore the session
  // from the HttpOnly refresh-token cookie. The access token is never
  // persisted in localStorage — it lives only in memory.
  useEffect(() => {
    api
      .post("/auth/refresh")
      .then((res) => {
        setAccessToken(res.data.token);
        return api.get("/auth/profile");
      })
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        // No valid refresh cookie — user is not logged in.
        clearAccessToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Log the user in with email and password.
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email: email, password: password });
    setAccessToken(res.data.token);
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
    setAccessToken(res.data.token);
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
    clearAccessToken();
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

  // Memoised so a re-render here does not cascade into every consumer — and
  // through them into CartContext, which depends on `user`.
  const value = useMemo(
    () => ({ user, loading, login, register, verifyOtp, logout, updateUser, isAdmin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
