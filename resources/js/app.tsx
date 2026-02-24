import "./bootstrap"; // Echo + axios first
import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

import { DarkModeProvider } from "@/Context/DarkModeContext";
import { CartProvider } from "@/Context/CartContext";
import { CheckoutProvider } from "@/Context/CheckoutContext";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../css/google-autocomplete.css";
import "../css/checkout-toast.css";

// Import all pages for Vite
const pages = import.meta.glob("./Pages/**/*.tsx");

// Boot Inertia
createInertiaApp({
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.tsx`, 
      pages
    ),

  setup: ({ el, App, props }) => {
    const root = createRoot(el as HTMLElement);

    root.render(
      <React.StrictMode>
        <CartProvider>
          <DarkModeProvider>
            <CheckoutProvider>
              <App {...props} />

              <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover
                theme="colored"
              />
            </CheckoutProvider>
          </DarkModeProvider>
        </CartProvider>
      </React.StrictMode>
    );
  },
});
 
