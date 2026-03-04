const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() || "";

let scriptLoadPromise: Promise<void> | null = null;

const loadRecaptchaScript = async (): Promise<void> => {
  if (!RECAPTCHA_SITE_KEY) {
    return;
  }

  if (window.grecaptcha?.execute) {
    return;
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
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
  if (!grecaptcha?.execute) {
    throw new Error("CAPTCHA failed to initialise.");
  }

  return new Promise<string>((resolve, reject) => {
    grecaptcha.ready(async () => {
      try {
        const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
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

