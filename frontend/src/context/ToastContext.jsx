import { createContext, useContext, useState } from "react";

// Notification toast system context
const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((oldToasts) => oldToasts.filter((item) => item.id !== id));
  };

  const showToast = (message, type = "info") => {
    nextId = nextId + 1;
    const id = nextId;
    setToasts((oldToasts) => [...oldToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const toast = {
    success: (message) => showToast(message, "success"),
    error: (message) => showToast(message, "error"),
    info: (message) => showToast(message, "info"),
  };

  const dotColors = {
    success: "bg-accent-400",
    error: "bg-danger",
    info: "bg-copper-400",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex min-w-[240px] max-w-sm animate-rise-in cursor-pointer items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-deep"
            onClick={() => removeToast(item.id)}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${dotColors[item.type] || dotColors.info}`}
              aria-hidden="true"
            />
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
