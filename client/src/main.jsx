import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/authContext.jsx";
import { CartProvider } from "./context/cartContext.jsx";
import { ToastProvider } from "./context/toastContext.jsx";
import { ConfirmProvider } from "./context/confirmContext.jsx";
import { SettingsProvider } from "./context/settingsContext.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SettingsProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
