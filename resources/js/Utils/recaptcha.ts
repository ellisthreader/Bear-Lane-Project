const envSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() || "";
const envProvider = (import.meta.env.VITE_RECAPTCHA_PROVIDER as string | undefined)?.trim().toLowerCase() || "";

const readMetaValue = (name: string): string =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content?.trim() || "";

const RECAPTCHA_SITE_KEY = envSiteKey || readMetaValue("recaptcha-site-key");
const providerFromMeta = readMetaValue("recaptcha-provider").toLowerCase();
const providerCandidate = envProvider || providerFromMeta;
const RECAPTCHA_PROVIDER =
  (providerCandidate === "enterprise" ? "enterprise" : "standard") as "standard" | "enterprise";

let scriptLoadPromise: Promise<void> | null = null;

type RecaptchaReady = (cb: () => void) => void;
type RecaptchaExecute = (siteKey: string, options: { action: string }) => Promise<string>;

const resolveRecaptchaApi = (): { ready: RecaptchaReady; execute: RecaptchaExecute } | null => {
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) {
    return null;
  }

  const enterpriseExecute = grecaptcha.enterprise?.execute;
  const enterpriseReady = grecaptcha.enterprise?.ready;
  const standardExecute = grecaptcha.execute;
  const standardReady = grecaptcha.ready;
  const immediateReady: RecaptchaReady = (cb) => cb();

  if (RECAPTCHA_PROVIDER === "enterprise" && enterpriseExecute) {
    return {
      execute: enterpriseExecute,
      ready: enterpriseReady || standardReady || immediateReady,
    };
  }

  if (standardExecute) {
    return {
      execute: standardExecute,
      ready: standardReady || immediateReady,
    };
  }

  if (enterpriseExecute) {
    return {
      execute: enterpriseExecute,
      ready: enterpriseReady || standardReady || immediateReady,
    };
  }

  return null;
};

const loadRecaptchaScript = async (): Promise<void> => {
  if (!RECAPTCHA_SITE_KEY) {
    return;
  }

  const hasExecutor = Boolean(resolveRecaptchaApi());

  if (hasExecutor) {
    return;
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const scriptPath =
      RECAPTCHA_PROVIDER === "enterprise"
        ? "https://www.google.com/recaptcha/enterprise.js"
        : "https://www.google.com/recaptcha/api.js";
    const src = `${scriptPath}?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      const existingHasExecutor = Boolean(resolveRecaptchaApi());
      if (existingHasExecutor) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load CAPTCHA script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load CAPTCHA script."));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const isRecaptchaConfigured = (): boolean => RECAPTCHA_SITE_KEY.length > 0;

export const executeRecaptcha = async (action: string): Promise<string> => {
  if (!isRecaptchaConfigured()) {
    return "";
  }

  await loadRecaptchaScript();

  const api = resolveRecaptchaApi();

  if (!api) {
    throw new Error("CAPTCHA failed to initialise.");
  }

  return new Promise<string>((resolve, reject) => {
    api.ready(async () => {
      try {
        const token = await api.execute(RECAPTCHA_SITE_KEY, { action });
        if (!token) {
          reject(new Error("CAPTCHA token was empty."));
          return;
        }
        resolve(token);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("CAPTCHA verification failed."));
      }
    });
  });
};
