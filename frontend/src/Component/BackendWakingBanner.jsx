// Displays a non-intrusive status notification during backend cold-starts.
// Listens for 'backend-waking' and 'backend-ready' window events dispatched by api/client.js.

import { useEffect, useRef, useState } from "react";

const TIMEOUT_LIMIT_MS = 90000;

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
        if (elapsed * 1000 > TIMEOUT_LIMIT_MS) {
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
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[60] px-4 py-2 text-center text-xs font-medium text-white shadow-pop ${
        ready ? "bg-success" : "bg-accent-600"
      }`}
    >
      {ready ? (
        <span>Server is ready. Resuming requests...</span>
      ) : (
        <span>
          Connecting to server... Cold start in progress, please wait. <span className="opacity-80">({seconds}s)</span>
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
