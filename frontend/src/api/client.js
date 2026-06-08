import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = null;

const isHtmlPayload = (data) =>
  typeof data === "string" && /^\s*</.test(data);

const isWakeUpError = (error) => {
  const status = error.response?.status;
  const type = error.response?.headers?.["content-type"] || "";
  return (
    !error.response ||
    status === 502 ||
    status === 503 ||
    type.includes("text/html") ||
    isHtmlPayload(error.response?.data)
  );
};

const wakeUpMessage =
  "Backend is waking up (free Render server). Wait 30–50 seconds and click Try again.";

api.interceptors.response.use(
  (res) => {
    const type = res.headers?.["content-type"] || "";
    if (type.includes("text/html") || isHtmlPayload(res.data)) {
      const err = new Error(wakeUpMessage);
      err.isWakeUp = true;
      return Promise.reject(err);
    }
    return res;
  },
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    if (
      config.method === "get" &&
      (error.isWakeUp || isWakeUpError(error)) &&
      (config._wakeRetry || 0) < 4
    ) {
      config._wakeRetry = (config._wakeRetry || 0) + 1;
      await new Promise((r) => setTimeout(r, 3000));
      return api(config);
    }

    const isStartupError = !error.response || status === 503;
    if (isStartupError && config.method === "get" && !config._retried) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 800));
      return api(config);
    }

    if (status === 401 && !config._refreshAttempted && !config.url?.includes("/auth/refresh")) {
      config._refreshAttempted = true;
      try {
        if (!refreshing) {
          refreshing = api.post("/auth/refresh").finally(() => {
            refreshing = null;
          });
        }
        const res = await refreshing;
        localStorage.setItem("token", res.data.token);
        config.headers.Authorization = `Bearer ${res.data.token}`;
        return api(config);
      } catch {
        localStorage.removeItem("token");
      }
    }

    if (status === 401 && !config.url?.includes("/auth/")) {
      localStorage.removeItem("token");
    }

    const message =
      error.message?.includes("waking up") || isWakeUpError(error)
        ? wakeUpMessage
        : error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
