import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAccessToken, clearAccessToken } from "../api/client.js";

// This context keeps track of the logged in user for the whole app.
const AuthContext = createContext(null);

// Helper hook so other files can read the auth data easily.
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via HttpOnly refresh cookie (access token stored in-memory only)
  useEffect(() => {
    api
      .post("/auth/refresh")
      .then((res) => {
        if (res.data?.token) {
          setAccessToken(res.data.token);
          return api.get("/auth/profile").then((profileRes) => {
            setUser(profileRes.data.user);
          });
        } else {
          clearAccessToken();
          setUser(null);
        }
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    return res.data;
  };

  const verifyOtp = async (email, code) => {
    const res = await api.post("/auth/verify-otp", { email, code });
    setAccessToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignored: client-side session is cleared regardless
    }
    clearAccessToken();
    setUser(null);
  };

  const updateUser = (changes) => {
    setUser((oldUser) => ({ ...oldUser, ...changes }));
  };

  const isAdmin = Boolean(user && user.role === "admin");

  const value = useMemo(
    () => ({ user, loading, login, register, verifyOtp, logout, updateUser, isAdmin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
