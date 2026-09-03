import "./bootstrap"; // Echo + axios first
import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

import { CartProvider } from "@/Context/CartContext";
import { WishlistProvider } from "@/Context/WishlistContext";
import { CheckoutProvider } from "@/Context/CheckoutContext";
import CookieConsentManager from "@/Components/Cookies/CookieConsentManager";
import FloatingHelpLauncher from "@/Components/Support/FloatingHelpLauncher";
import SiteDesignProvider from "@/Theme/SiteDesignProvider";
import { PREVIEW_QUERY_PARAM, applySiteDesignToDocument, isAdminPath, type SiteDesign } from "@/Theme/siteDesign";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : typeof reason?.message === "string"
        ? reason.message
        : "";

    // Stripe telemetry endpoint can be blocked by browser extensions (ad/privacy blockers).
    // Silence only this known non-critical rejection to avoid console spam.
    if (
      /r\.stripe\.com\/b/i.test(message) ||
      (/ERR_BLOCKED_BY_CLIENT/i.test(message) && /stripe/i.test(message))
    ) {
      event.preventDefault();
    }
  });
}

// Import all pages for Vite
const pages = import.meta.glob("./Pages/**/*.tsx", { eager: false });

// Boot Inertia
createInertiaApp({
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.tsx`, 
      pages
    ),

  setup: ({ el, App, props }) => {
    const root = createRoot(el as HTMLElement);

    // Apply the saved Website Design before first paint so themed pages never flash the default palette.
    const initialDesign = (props.initialPage.props as { storeSettings?: { design?: SiteDesign } }).storeSettings?.design ?? null;
    applySiteDesignToDocument(document, isAdminPath(window.location.pathname) ? null : initialDesign);
    const isDesignPreviewFrame =
      window.parent !== window && new URLSearchParams(window.location.search).get(PREVIEW_QUERY_PARAM) === "1";

    root.render(
      <React.StrictMode>
        <CartProvider>
          <WishlistProvider>
            <CheckoutProvider>
              <App {...props} />
              <SiteDesignProvider initialDesign={initialDesign} />
              {isDesignPreviewFrame ? null : <CookieConsentManager />}
              {isDesignPreviewFrame ? null : <FloatingHelpLauncher />}

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
          </WishlistProvider>
        </CartProvider>
      </React.StrictMode>
    );
  },
});
 
