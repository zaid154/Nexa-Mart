import axios from "axios";

// Create axios instance for all API calls
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  // Without this a hung socket hangs the page forever.
  timeout: 20000,
});

// ── In-memory token storage (never touches localStorage) ─────────────
// Storing the JWT in a module-level variable instead of localStorage
// means JavaScript injected via an XSS hole cannot read it — the token
// lives only in this closure and is never accessible from the DOM.
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
  "Backend is waking up (free Render server). Wait 30–50 seconds and click Try again.";

// A request the user (or React) gave up on is not a failure worth retrying.
function isCancelled(error) {
  const config = error.config || {};
  return error.code === "ERR_CANCELED" || config.signal?.aborted === true;
}

// Only these are worth another go. The old code retried on *any* response-less
// error, which swept in CORS failures, DNS errors and aborted requests.
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

// Backoff with jitter, so ten requests failing together do not all come back at
// the same instant and stampede a server that is still starting.
function backoffDelay(attempt) {
  const base = attempt === 1 ? 400 : 1200;
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

// When the backend is cold, every in-flight request discovers it at once. Let
// the first one probe /health and have the rest wait on that single promise
// instead of each running its own retry ladder.
let warmingUp = null;

// Whether we have told the app the backend is asleep. Used to fire the
// matching "it is back" event exactly once, on the first response that really
// succeeds — resolving on the /health probe instead would clear the notice
// even when that probe failed, since it swallows its own errors.
let announcedWaking = false;

function warmUpBackend() {
  if (!warmingUp) {
    warmingUp = axios
      .get(`${api.defaults.baseURL}/health`, { timeout: 15000, withCredentials: false })
      .catch(() => null)
      .finally(() => {
        warmingUp = null;
      });

    // Let the app show "waking the server up" rather than freezing silently.
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

    // A real response means the server is up. If we told the app it was
    // waking, take that back now.
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

    // A cancelled request is not an error the user should ever see.
    if (isCancelled(error)) {
      return Promise.reject(error);
    }

    // Retry GETs on a cold or flapping backend. Two attempts with jittered
    // backoff, so the worst case is ~1.6s rather than the ~12.8s of silent
    // hang the old flat 4x3s ladder produced on every one of the ten requests
    // a page load fires.
    const isGetRequest = config.method === "get";
    const attempt = config._retryCount || 0;

    if (isGetRequest && !config.noRetry && isRetryable(error) && attempt < 2) {
      config._retryCount = attempt + 1;

      // The first request to notice wakes the server; the rest just wait.
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

    return Promise.reject(new Error(message));
  }
);

export default api;
