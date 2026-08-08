import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { CartDrawerProvider } from "./context/CartDrawerContext.jsx";
import "./styles/index.css";

// Find the root div in index.html and render our React app inside it
const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <CartProvider>
                <CartDrawerProvider>
                  <App />
                </CartDrawerProvider>
              </CartProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
