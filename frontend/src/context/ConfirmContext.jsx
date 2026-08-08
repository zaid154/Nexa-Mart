import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// This context shows a popup box that asks the user to confirm or cancel.
const ConfirmContext = createContext(null);

// Helper hook so other files can ask for confirmation easily.
export const useConfirm = () => useContext(ConfirmContext);

// Default text for the popup box.
const defaultOptions = {
  title: "Are you sure?",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "danger",
};

// Everything inside the dialog that can take keyboard focus.
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const ConfirmProvider = ({ children }) => {
  // "popup" holds the current popup options, or null when nothing is shown.
  const [popup, setPopup] = useState(null);
  // We keep the promise "resolve" function here so we can call it later.
  const resolveRef = useRef(null);

  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);
  // Whatever had focus before we opened, so we can hand it back on close.
  const lastFocusedRef = useRef(null);

  // Open the popup. You can pass a string message or an options object.
  const confirm = useCallback((options) => {
    if (!options) {
      options = {};
    }
    let chosenOptions;
    if (typeof options === "string") {
      chosenOptions = { message: options };
    } else {
      chosenOptions = options;
    }

    // If a popup is somehow already open, settle its promise instead of
    // leaving the caller waiting forever.
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }

    lastFocusedRef.current = document.activeElement;
    setPopup({ ...defaultOptions, ...chosenOptions });
    // Return a promise. It finishes when the user clicks a button.
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  // Close the popup and send back the result (true or false).
  const close = useCallback((result) => {
    setPopup(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    // Put focus back where it was, so keyboard users are not dumped at the
    // top of the page.
    const last = lastFocusedRef.current;
    lastFocusedRef.current = null;
    if (last && typeof last.focus === "function") {
      last.focus();
    }
  }, []);

  // Move focus into the dialog when it opens. For destructive actions we focus
  // Cancel, so a stray Enter left over from whatever opened the dialog cannot
  // delete anything by itself.
  useEffect(() => {
    if (!popup) {
      return;
    }
    if (popup.tone === "danger") {
      cancelBtnRef.current?.focus();
    } else {
      confirmBtnRef.current?.focus();
    }
  }, [popup]);

  // Escape cancels, and Tab is kept inside the dialog while it is open.
  useEffect(() => {
    if (!popup) {
      return;
    }
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusables || focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [popup, close]);

  // Stop the page behind the popup from scrolling.
  useEffect(() => {
    if (!popup) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [popup]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {popup && (
        <div
          className="fixed inset-0 z-[90] grid animate-fade-in place-items-center bg-ink-950/45 p-4 backdrop-blur-[2px]"
          onClick={() => close(false)}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-deep"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={popup.message ? "confirm-message" : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-ink-900" id="confirm-title">{popup.title}</h3>
            {popup.message && (
              <p className="mt-2 text-sm leading-relaxed text-ink-500" id="confirm-message">
                {popup.message}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                ref={cancelBtnRef}
                className="btn btn-ghost w-full sm:w-auto"
                onClick={() => close(false)}
              >
                {popup.cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={`btn w-full sm:w-auto ${popup.tone === "danger" ? "btn-danger" : ""}`}
                onClick={() => close(true)}
              >
                {popup.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
