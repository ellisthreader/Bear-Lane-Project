import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_COOKIE_PREFERENCES,
  buildCookieConsentState,
  loadCookieConsent,
  saveCookieConsent,
  type CookieConsentState,
  type CookiePreferences,
} from "@/Utils/cookieConsent";
import { applyConsentPreferences } from "@/Utils/consentScripts";

declare global {
  interface Window {
    openCookiePreferences?: () => void;
  }
}

function PreferenceToggle({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#ECE9E2] bg-[#FCFCFA] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[#1F1B14]">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#61594E]">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-label={`${label} cookie preference`}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-1 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443] ${
          checked ? "border-[#B89443] bg-[#B89443]" : "border-[#D6D0C4] bg-white"
        } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function CookieConsentManager() {
  const [hasChoice, setHasChoice] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [draft, setDraft] = useState<CookiePreferences>(DEFAULT_COOKIE_PREFERENCES);

  const openPreferences = useMemo(
    () => () => {
      const existing = loadCookieConsent();
      setDraft(existing?.preferences ?? DEFAULT_COOKIE_PREFERENCES);
      setIsPreferencesOpen(true);
    },
    [],
  );

  useEffect(() => {
    const existing = loadCookieConsent();
    if (existing) {
      setHasChoice(true);
      applyConsentPreferences(existing.preferences);
    } else {
      setHasChoice(false);
      setIsBannerVisible(true);
      requestAnimationFrame(() => setHasAnimatedIn(true));
    }

    const handleOpenPreferences = () => openPreferences();
    window.addEventListener("open-cookie-preferences", handleOpenPreferences);
    window.openCookiePreferences = openPreferences;

    return () => {
      window.removeEventListener("open-cookie-preferences", handleOpenPreferences);
      if (window.openCookiePreferences === openPreferences) {
        delete window.openCookiePreferences;
      }
    };
  }, [openPreferences]);

  useEffect(() => {
    if (!isPreferencesOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreferencesOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPreferencesOpen]);

  const persistConsentServerSide = async (state: CookieConsentState) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    try {
      await fetch("/cookie-consent", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify(state),
      });
    } catch {
      // Consent UI should never fail due to logging transport issues.
    }
  };

  const commitChoice = (preferences: CookiePreferences, status: CookieConsentState["status"]) => {
    const nextState = buildCookieConsentState(preferences, status);
    saveCookieConsent(nextState);
    applyConsentPreferences(nextState.preferences);
    setHasChoice(true);
    setIsBannerVisible(false);
    setIsPreferencesOpen(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: nextState }));
    void persistConsentServerSide(nextState);
  };

  const handleAcceptAll = () => {
    commitChoice(
      {
        necessary: true,
        analytics: true,
        marketing: true,
      },
      "accept_all",
    );
  };

  const handleRejectNonEssential = () => {
    commitChoice(
      {
        necessary: true,
        analytics: false,
        marketing: false,
      },
      "reject_non_essential",
    );
  };

  const handleSavePreferences = () => {
    commitChoice(
      {
        necessary: true,
        analytics: Boolean(draft.analytics),
        marketing: Boolean(draft.marketing),
      },
      "custom",
    );
  };

  return (
    <>
      {isBannerVisible && !hasChoice ? (
        <section
          role="region"
          aria-label="Cookie consent banner"
          className={`fixed bottom-4 left-4 right-4 z-[220] w-auto rounded-[18px] border border-[#ECE7DD] bg-white p-5 shadow-[0_12px_30px_rgba(23,20,14,0.12)] transition-all duration-500 sm:right-auto sm:max-w-[430px] ${
            hasAnimatedIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <h2 className="text-base font-semibold tracking-tight text-[#1F1B14]">We value your privacy</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5E564B]">
            We use cookies to improve your experience, analyse traffic, and personalise content. You can accept all
            cookies or manage your preferences.
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            <button
              type="button"
              aria-label="Accept all cookies"
              onClick={handleAcceptAll}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A9832F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
            >
              Accept All
            </button>

            <button
              type="button"
              aria-label="Reject non-essential cookies"
              onClick={handleRejectNonEssential}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#CFC7B6] bg-white px-4 text-sm font-semibold text-[#3F372A] transition hover:bg-[#FAF8F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
            >
              Reject Non-Essential
            </button>
          </div>

          <button
            type="button"
            aria-label="Manage cookie preferences"
            onClick={openPreferences}
            className="mt-3 text-xs font-medium text-[#6A5C3D] underline underline-offset-4 transition hover:text-[#4B412E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
          >
            Manage Preferences
          </button>
        </section>
      ) : null}

      {isPreferencesOpen ? (
        <div className="fixed inset-0 z-[230] flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cookie preferences"
            className="w-full max-w-lg rounded-[20px] border border-[#E8E4DA] bg-white p-6 shadow-[0_18px_46px_rgba(20,17,12,0.18)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#1F1B14]">Cookie Preferences</h3>
                <p className="mt-1 text-sm text-[#5E564B]">
                  Choose which cookies you allow. You can update this at any time.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close cookie preferences"
                onClick={() => setIsPreferencesOpen(false)}
                className="rounded-lg border border-[#D9D2C2] px-2.5 py-1.5 text-xs font-semibold text-[#4A4234] transition hover:bg-[#F6F4EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <PreferenceToggle
                label="Necessary"
                description="Required for core site features and security. Always enabled."
                checked
                disabled
              />
              <PreferenceToggle
                label="Analytics"
                description="Helps us understand usage and improve site performance."
                checked={draft.analytics}
                onChange={(next) => setDraft((prev) => ({ ...prev, analytics: next }))}
              />
              <PreferenceToggle
                label="Marketing"
                description="Used to personalise promotions and measure campaign effectiveness."
                checked={draft.marketing}
                onChange={(next) => setDraft((prev) => ({ ...prev, marketing: next }))}
              />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                aria-label="Save cookie preferences"
                onClick={handleSavePreferences}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A9832F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
              >
                Save Preferences
              </button>
              <button
                type="button"
                aria-label="Reject non-essential cookies"
                onClick={handleRejectNonEssential}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#CFC7B6] bg-white px-4 text-sm font-semibold text-[#3F372A] transition hover:bg-[#FAF8F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
              >
                Reject Non-Essential
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
