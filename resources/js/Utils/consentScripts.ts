import type { CookiePreferences } from "@/Utils/cookieConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "";
const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || "";

const GA_SCRIPT_ID = "cookie-consent-ga";
const META_PIXEL_SCRIPT_ID = "cookie-consent-meta-pixel";

function appendScript(src: string, id: string): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) return existing;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
  return script;
}

function ensureGoogleAnalytics(): void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`, GA_SCRIPT_ID);
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
}

function ensureMetaPixel(): void {
  if (!META_PIXEL_ID || typeof window === "undefined" || typeof document === "undefined") return;
  if (document.getElementById(META_PIXEL_SCRIPT_ID)) return;

  const bootstrap = document.createElement("script");
  bootstrap.id = META_PIXEL_SCRIPT_ID;
  bootstrap.text = `
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${META_PIXEL_ID}');
  `;
  document.head.appendChild(bootstrap);
}

export function applyConsentPreferences(preferences: CookiePreferences): void {
  if (typeof window === "undefined") return;

  if (GA_MEASUREMENT_ID) {
    const disableKey = `ga-disable-${GA_MEASUREMENT_ID}`;
    (window as Record<string, unknown>)[disableKey] = !preferences.analytics;
  }

  if (preferences.analytics) {
    ensureGoogleAnalytics();
  }

  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: preferences.analytics ? "granted" : "denied",
      ad_storage: preferences.marketing ? "granted" : "denied",
      ad_user_data: preferences.marketing ? "granted" : "denied",
      ad_personalization: preferences.marketing ? "granted" : "denied",
      functionality_storage: "granted",
      security_storage: "granted",
    });
  }

  if (preferences.marketing) {
    ensureMetaPixel();
    if (typeof window.fbq === "function") {
      window.fbq("consent", "grant");
      window.fbq("track", "PageView");
    }
  } else if (typeof window.fbq === "function") {
    window.fbq("consent", "revoke");
  }
}
