import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ConfirmContext = createContext(null);

export const useConfirm = () => useContext(ConfirmContext);

const DEFAULTS = {
  title: "Are you sure?",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "danger",
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    const opts = typeof options === "string" ? { message: options } : options;
    setState({ ...DEFAULTS, ...opts });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback(
    (result) => {
      setState(null);
      if (resolver.current) {
        resolver.current(result);
        resolver.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title" id="confirm-title">{state.title}</h3>
            {state.message && <p className="modal-message">{state.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${state.tone === "danger" ? "btn-danger" : ""}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
