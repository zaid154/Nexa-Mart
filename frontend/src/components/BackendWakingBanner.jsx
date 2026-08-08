// A strip that explains the free-tier cold start instead of leaving the page
// looking broken.
//
// api/client.js has always dispatched a "backend-waking" event when it notices
// the server is asleep, and nothing in the app has ever listened to it — so the
// entire cold-start experience was spinners followed by an error string. On a
// free Render instance that is a 30-50 second wait the first time anyone opens
// the site after a quiet spell, which is exactly when a demo gets opened.

import { useEffect, useRef, useState } from "react";

// Long enough to cover a slow boot, short enough that a stuck banner does not
// stay on screen forever if the "ready" event never arrives.
const GIVE_UP_MS = 90000;

const BackendWakingBanner = () => {
  const [state, setState] = useState("idle"); // idle | waking | ready
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    const onWaking = () => {
      startedAt.current = Date.now();
      setSeconds(0);
      setState("waking");
    };

    // Show the good news briefly, so the strip does not just blink out and
    // leave people wondering whether anything happened.
    const onReady = () => {
      setState((current) => (current === "waking" ? "ready" : current));
    };

    window.addEventListener("backend-waking", onWaking);
    window.addEventListener("backend-ready", onReady);
    return () => {
      window.removeEventListener("backend-waking", onWaking);
      window.removeEventListener("backend-ready", onReady);
    };
  }, []);

  useEffect(() => {
    if (state === "waking") {
      const tick = setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
        setSeconds(elapsed);
        if (elapsed * 1000 > GIVE_UP_MS) {
          setState("idle");
        }
      }, 1000);
      return () => clearInterval(tick);
    }

    if (state === "ready") {
      const done = setTimeout(() => setState("idle"), 2500);
      return () => clearTimeout(done);
    }

    return undefined;
  }, [state]);

  if (state === "idle") {
    return null;
  }

  const ready = state === "ready";

  return (
    // Fixed rather than a static bar above the navbar: the navbar is sticky
    // top-0, so inserting a bar above it mid-render would shift the whole page
    // down at the worst possible moment. z-60 sits over the navbar (50) but
    // under the confirm dialog (90) and the toasts (100).
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[60] px-4 py-2 text-center text-xs font-medium text-white shadow-pop ${
        ready ? "bg-success" : "bg-accent-600"
      }`}
    >
      {ready ? (
        <span>Server is awake — thanks for waiting.</span>
      ) : (
        <span>
          Waking the server up… free hosting sleeps after a quiet spell, so the first request
          takes 30–50 seconds. <span className="opacity-80">({seconds}s)</span>
        </span>
      )}
      {!ready && (
        <span
          aria-hidden="true"
          className="mt-1.5 block h-0.5 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)] bg-[length:200%_100%]"
        />
      )}
    </div>
  );
};

export default BackendWakingBanner;
