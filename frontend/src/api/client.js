import axios from "axios";

// Create axios instance for all API calls
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  // Request timeout in milliseconds
  timeout: 20000,
});

// In-memory access token storage (isolated from localStorage to mitigate XSS risk)
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

// Add token to every request if user is logged in
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = "Bearer " + _accessToken;
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
  "Server is starting up. Please wait a moment and click Try again.";

// Ignore requests aborted by user navigation or component unmounting
function isCancelled(error) {
  const config = error.config || {};
  return error.code === "ERR_CANCELED" || config.signal?.aborted === true;
}

// Retry on gateway errors (502, 503, 504) or network dropouts
function isRetryable(error) {
  if (isCancelled(error)) {
    return false;
  }
  const status = error.response?.status;
  if (!error.response) {
    return true;
  }
  return status === 502 || status === 503 || status === 504;
}

// Exponential backoff with random jitter to prevent thundering herd
function backoffDelay(attempt) {
  const base = attempt === 1 ? 400 : 1200;
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

// Deduplicate health probes across concurrent requests during startup
let warmingUp = null;
let announcedWaking = false;

function warmUpBackend() {
  if (!warmingUp) {
    warmingUp = axios
      .get(`${api.defaults.baseURL}/health`, { timeout: 15000, withCredentials: false })
      .catch(() => null)
      .finally(() => {
        warmingUp = null;
      });

    if (typeof window !== "undefined") {
      announcedWaking = true;
      window.dispatchEvent(new CustomEvent("backend-waking"));
    }
  }

  return warmingUp;
}

// Handle all API responses and errors
api.interceptors.response.use(
  (res) => {
    const contentType = res.headers ? res.headers["content-type"] || "" : "";

    if (contentType.includes("text/html") || isHtmlPayload(res.data)) {
      const err = new Error(wakeUpMessage);
      err.isWakeUp = true;
      return Promise.reject(err);
    }

    if (announcedWaking && typeof window !== "undefined") {
      announcedWaking = false;
      window.dispatchEvent(new CustomEvent("backend-ready"));
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

    if (isCancelled(error)) {
      return Promise.reject(error);
    }

    // Retry idempotent GET requests with jittered backoff on connection drops (up to 2 attempts)
    const isGetRequest = config.method === "get";
    const attempt = config._retryCount || 0;

    if (isGetRequest && !config.noRetry && isRetryable(error) && attempt < 2) {
      config._retryCount = attempt + 1;

      // Wait for backend warm-up probe or backoff delay
      await Promise.race([
        warmUpBackend(),
        new Promise((resolve) => setTimeout(resolve, backoffDelay(config._retryCount))),
      ]);

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

        _accessToken = newToken;
        config.headers.Authorization = "Bearer " + newToken;

        return api(config);
      } catch (refreshError) {
        _accessToken = null;
      }
    }

    // Clear token on any other 401 error
    const isAuthUrl = config.url && config.url.includes("/auth/");

    if (is401 && !isAuthUrl) {
      _accessToken = null;
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

    const err = new Error(message);
    err.response = response;
    err.status = status;
    err.data = response?.data;
    return Promise.reject(err);
  }
);

export default api;
