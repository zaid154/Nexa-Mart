import { createContext, useContext, useEffect, useRef, useState } from "react";

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

export const ConfirmProvider = ({ children }) => {
  // "popup" holds the current popup options, or null when nothing is shown.
  const [popup, setPopup] = useState(null);
  // We keep the promise "resolve" function here so we can call it later.
  const resolveRef = useRef(null);

  // Open the popup. You can pass a string message or an options object.
  const confirm = (options) => {
    if (!options) {
      options = {};
    }
    let chosenOptions;
    if (typeof options === "string") {
      chosenOptions = { message: options };
    } else {
      chosenOptions = options;
    }
    setPopup({ ...defaultOptions, ...chosenOptions });
    // Return a promise. It finishes when the user clicks a button.
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  };

  // Close the popup and send back the result (true or false).
  const close = (result) => {
    setPopup(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  // Let the user press Escape to cancel and Enter to confirm.
  useEffect(() => {
    if (!popup) {
      return;
    }
    const handleKey = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
      if (event.key === "Enter") {
        close(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [popup]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {popup && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="modal-title" id="confirm-title">{popup.title}</h3>
            {popup.message && <p className="modal-message">{popup.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {popup.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${popup.tone === "danger" ? "btn-danger" : ""}`}
                onClick={() => close(true)}
                autoFocus
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
