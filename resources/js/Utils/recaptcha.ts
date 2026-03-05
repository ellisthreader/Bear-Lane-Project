const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() || "";
const RECAPTCHA_PROVIDER =
  ((import.meta.env.VITE_RECAPTCHA_PROVIDER as string | undefined)?.trim().toLowerCase() ||
    "standard") as "standard" | "enterprise";

let scriptLoadPromise: Promise<void> | null = null;

const loadRecaptchaScript = async (): Promise<void> => {
  if (!RECAPTCHA_SITE_KEY) {
    return;
  }

  const hasExecutor =
    RECAPTCHA_PROVIDER === "enterprise"
      ? Boolean(window.grecaptcha?.enterprise?.execute)
      : Boolean(window.grecaptcha?.execute);

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
      const existingHasExecutor =
        RECAPTCHA_PROVIDER === "enterprise"
          ? Boolean(window.grecaptcha?.enterprise?.execute)
          : Boolean(window.grecaptcha?.execute);
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

  const grecaptcha = window.grecaptcha;
  const executeFn =
    RECAPTCHA_PROVIDER === "enterprise"
      ? grecaptcha?.enterprise?.execute
      : grecaptcha?.execute;

  if (!executeFn || !grecaptcha?.ready) {
    throw new Error("CAPTCHA failed to initialise.");
  }

  return new Promise<string>((resolve, reject) => {
    grecaptcha.ready(async () => {
      try {
        const token = await executeFn(RECAPTCHA_SITE_KEY, { action });
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
