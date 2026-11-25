import { createContext, useContext, useState, useCallback, useRef } from "react";

const ConfirmContext = createContext(() => Promise.resolve(true));
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    setModal({
      title: opts.title || "Confirm Action",
      message: opts.message || "Are you sure you want to proceed?",
      confirmLabel: opts.confirmLabel || "Confirm",
      cancelLabel: opts.cancelLabel || "Cancel",
    });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (result) => {
    setModal(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
              >
                {modal.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
