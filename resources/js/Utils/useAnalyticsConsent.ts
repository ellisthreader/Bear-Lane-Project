import { useEffect, useState } from "react";
import { loadCookieConsent, type CookieConsentState } from "@/Utils/cookieConsent";

const hasWindow = () => typeof window !== "undefined";

const readAnalyticsConsent = (): boolean => {
  if (!hasWindow()) return false;
  const consent = loadCookieConsent();
  return Boolean(consent?.preferences.analytics);
};

export default function useAnalyticsConsent(): boolean {
  const [hasConsent, setHasConsent] = useState<boolean>(() => readAnalyticsConsent());

  useEffect(() => {
    if (!hasWindow()) return;

    const onConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail;
      if (detail?.preferences) {
        setHasConsent(Boolean(detail.preferences.analytics));
        return;
      }
      setHasConsent(readAnalyticsConsent());
    };

    window.addEventListener("cookie-consent-updated", onConsentUpdated as EventListener);

    return () => {
      window.removeEventListener("cookie-consent-updated", onConsentUpdated as EventListener);
    };
  }, []);

  return hasConsent;
}
