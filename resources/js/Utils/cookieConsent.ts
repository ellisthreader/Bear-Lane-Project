export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentState = {
  version: number;
  status: "accept_all" | "reject_non_essential" | "custom";
  preferences: CookiePreferences;
  consentedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "bearlane_cookie_consent_v1";
const COOKIE_CONSENT_VERSION = 1;

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function loadCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (!parsed || typeof parsed !== "object") return null;

    const preferences = parsed.preferences;
    if (!preferences || typeof preferences !== "object") return null;

    return {
      version: COOKIE_CONSENT_VERSION,
      status:
        parsed.status === "accept_all" || parsed.status === "reject_non_essential" || parsed.status === "custom"
          ? parsed.status
          : "custom",
      preferences: {
        necessary: true,
        analytics: Boolean(preferences.analytics),
        marketing: Boolean(preferences.marketing),
      },
      consentedAt: typeof parsed.consentedAt === "string" ? parsed.consentedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
}

export function buildCookieConsentState(
  preferences: CookiePreferences,
  status: CookieConsentState["status"],
): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    status,
    preferences: {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
    },
    consentedAt: new Date().toISOString(),
  };
}
