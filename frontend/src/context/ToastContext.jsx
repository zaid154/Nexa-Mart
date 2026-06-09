import { createContext, useContext, useState } from "react";

// This context shows small popup messages (toasts) on the screen.
const ToastContext = createContext(null);

// Helper hook so other files can use the toast easily.
export const useToast = () => useContext(ToastContext);

// A simple counter so every toast gets a unique id.
let nextId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Remove one toast by its id.
  const removeToast = (id) => {
    setToasts((oldToasts) => oldToasts.filter((item) => item.id !== id));
  };

  // Add a new toast and remove it automatically after 3.5 seconds.
  const showToast = (message, type) => {
    if (!type) {
      type = "info";
    }
    nextId = nextId + 1;
    const id = nextId;
    setToasts((oldToasts) => [...oldToasts, { id: id, message: message, type: type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  // Three easy functions for the rest of the app to call.
  const toast = {
    success: (message) => showToast(message, "success"),
    error: (message) => showToast(message, "error"),
    info: (message) => showToast(message, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast toast-${item.type}`}
            onClick={() => removeToast(item.id)}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
