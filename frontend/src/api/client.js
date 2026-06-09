import axios from "axios";

// Create axios instance for all API calls
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

// Add token to every request if user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  return config;
});

// Used when token expires - only one refresh call at a time
let refreshing = null;

// Check if response data is HTML (means server returned wrong page)
function isHtmlPayload(data) {
  if (typeof data !== "string") {
    return false;
  }

  const startsWithTag = /^\s*</.test(data);
  return startsWithTag;
}

// Check if error is because Render free server is sleeping
function isWakeUpError(error) {
  const response = error.response;
  let status = null;
  let contentType = "";

  if (response) {
    status = response.status;
    if (response.headers) {
      contentType = response.headers["content-type"] || "";
    }
  }

  if (!response) {
    return true;
  }

  if (status === 502 || status === 503) {
    return true;
  }

  if (contentType.includes("text/html")) {
    return true;
  }

  if (response.data && isHtmlPayload(response.data)) {
    return true;
  }

  return false;
}

const wakeUpMessage =
  "Backend is waking up (free Render server). Wait 30–50 seconds and click Try again.";

// Handle all API responses and errors
api.interceptors.response.use(
  (res) => {
    const contentType = res.headers ? res.headers["content-type"] || "" : "";

    if (contentType.includes("text/html") || isHtmlPayload(res.data)) {
      const err = new Error(wakeUpMessage);
      err.isWakeUp = true;
      return Promise.reject(err);
    }

    return res;
  },
  async (error) => {
    const config = error.config || {};
    const response = error.response;
    let status = null;

    if (response) {
      status = response.status;
    }

    // Retry GET requests when Render server is waking up (up to 4 times)
    const isGetRequest = config.method === "get";
    const isWakeUp = error.isWakeUp || isWakeUpError(error);
    const retryCount = config._wakeRetry || 0;

    if (isGetRequest && isWakeUp && retryCount < 4) {
      config._wakeRetry = retryCount + 1;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    // Retry once if backend is still starting
    const isStartupError = !response || status === 503;
    const alreadyRetried = config._retried;

    if (isStartupError && isGetRequest && !alreadyRetried) {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return api(config);
    }

    // If 401 error, try to refresh the token
    const is401 = status === 401;
    const alreadyTriedRefresh = config._refreshAttempted;
    const isRefreshUrl = config.url && config.url.includes("/auth/refresh");

    if (is401 && !alreadyTriedRefresh && !isRefreshUrl) {
      config._refreshAttempted = true;

      try {
        if (!refreshing) {
          refreshing = api.post("/auth/refresh").finally(() => {
            refreshing = null;
          });
        }

        const refreshResult = await refreshing;
        const newToken = refreshResult.data.token;

        localStorage.setItem("token", newToken);
        config.headers.Authorization = "Bearer " + newToken;

        return api(config);
      } catch (refreshError) {
        localStorage.removeItem("token");
      }
    }

    // Remove token on any other 401 error
    const isAuthUrl = config.url && config.url.includes("/auth/");

    if (is401 && !isAuthUrl) {
      localStorage.removeItem("token");
    }

    // Build error message for user
    let message = "Something went wrong";

    if (error.message && error.message.includes("waking up")) {
      message = wakeUpMessage;
    } else if (isWakeUpError(error)) {
      message = wakeUpMessage;
    } else if (response && response.data && response.data.message) {
      message = response.data.message;
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
