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
let recentCspViolations: Array<{ blockedURI: string; violatedDirective: string; effectiveDirective: string }> = [];

if (typeof window !== "undefined") {
  window.addEventListener("securitypolicyviolation", (event) => {
    recentCspViolations = [
      ...recentCspViolations.slice(-9),
      {
        blockedURI: String(event.blockedURI || ""),
        violatedDirective: String(event.violatedDirective || ""),
        effectiveDirective: String(event.effectiveDirective || ""),
      },
    ];
  });
}

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

const getRecaptchaScriptCandidates = (): string[] => {
  const enterpriseScripts = [
    "https://www.google.com/recaptcha/enterprise.js",
    "https://www.recaptcha.net/recaptcha/enterprise.js",
  ];
  const standardScripts = [
    "https://www.google.com/recaptcha/api.js",
    "https://www.recaptcha.net/recaptcha/api.js",
  ];

  return RECAPTCHA_PROVIDER === "enterprise"
    ? [...enterpriseScripts, ...standardScripts]
    : [...standardScripts, ...enterpriseScripts];
};

const waitForRecaptchaApi = async (timeoutMs = 8000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (resolveRecaptchaApi()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return Boolean(resolveRecaptchaApi());
};

const loadScriptSrc = async (src: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.recaptchaLoaded === "true") {
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
    script.onload = () => {
      script.dataset.recaptchaLoaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load CAPTCHA script."));
    document.head.appendChild(script);
  });

const loadRecaptchaScript = async (): Promise<void> => {
  if (!RECAPTCHA_SITE_KEY) {
    return;
  }

  const hasExecutor = Boolean(resolveRecaptchaApi());

  if (hasExecutor) {
    return;
  }

  if (scriptLoadPromise) {
    try {
      await scriptLoadPromise;
    } catch {
      scriptLoadPromise = null;
    }

    if (resolveRecaptchaApi()) {
      return;
    }

    // Stale successful promise with no API available anymore: force a fresh load attempt.
    scriptLoadPromise = null;
  }

  scriptLoadPromise = (async () => {
    const candidates = getRecaptchaScriptCandidates();
    const failures: string[] = [];

    for (const scriptPath of candidates) {
      const src = `${scriptPath}?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
      try {
        await loadScriptSrc(src);
      } catch (error) {
        failures.push(
          `${scriptPath}: ${error instanceof Error ? error.message : "Unknown script load error"}`
        );
        continue;
      }

      if (await waitForRecaptchaApi()) {
        return;
      }
    }

    const grecaptcha = window.grecaptcha;
    const scriptNodes = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha"]')
    ).map((script) => ({
      src: script.src,
      loaded: script.dataset.recaptchaLoaded === "true",
    }));

    throw new Error(
      `CAPTCHA scripts loaded but API unavailable. provider=${RECAPTCHA_PROVIDER}, hasGrecaptcha=${Boolean(
        grecaptcha
      )}, hasReady=${Boolean(grecaptcha?.ready)}, hasExecute=${Boolean(
        grecaptcha?.execute
      )}, hasEnterpriseReady=${Boolean(grecaptcha?.enterprise?.ready)}, hasEnterpriseExecute=${Boolean(
        grecaptcha?.enterprise?.execute
      )}, failures=[${failures.join(" | ")}], scripts=${JSON.stringify(scriptNodes)}, cspViolations=${JSON.stringify(
        recentCspViolations
      )}`
    );
  });

  try {
    await scriptLoadPromise;
  } catch (error) {
    scriptLoadPromise = null;
    throw error;
  }
};

export const isRecaptchaConfigured = (): boolean => RECAPTCHA_SITE_KEY.length > 0;

export const executeRecaptcha = async (action: string): Promise<string> => {
  if (!isRecaptchaConfigured()) {
    return "";
  }

  await loadRecaptchaScript();

  let api = resolveRecaptchaApi();
  if (!api) {
    await waitForRecaptchaApi();
    api = resolveRecaptchaApi();
  }

  if (!api) {
    // One recovery pass in case a stale loader state left us without an API.
    scriptLoadPromise = null;
    await loadRecaptchaScript();
    await waitForRecaptchaApi();
    api = resolveRecaptchaApi();
  }

  if (!api) {
    const grecaptcha = window.grecaptcha;
    const scriptNodes = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha"]')
    ).map((script) => ({
      src: script.src,
      loaded: script.dataset.recaptchaLoaded === "true",
    }));

    throw new Error(
      `CAPTCHA failed to initialise. provider=${RECAPTCHA_PROVIDER}, siteKeyPresent=${
        RECAPTCHA_SITE_KEY.length > 0
      }, hasGrecaptcha=${Boolean(grecaptcha)}, hasReady=${Boolean(
        grecaptcha?.ready
      )}, hasExecute=${Boolean(grecaptcha?.execute)}, hasEnterpriseReady=${Boolean(
        grecaptcha?.enterprise?.ready
      )}, hasEnterpriseExecute=${Boolean(
        grecaptcha?.enterprise?.execute
      )}, scripts=${JSON.stringify(scriptNodes)}, cspViolations=${JSON.stringify(recentCspViolations)}`
    );
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

export const getRecaptchaDiagnostics = () => {
  const grecaptcha = window.grecaptcha;
  const scriptNodes = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha"]')
  ).map((script) => ({
    src: script.src,
    loaded: script.dataset.recaptchaLoaded === "true",
  }));

  return {
    provider: RECAPTCHA_PROVIDER,
    siteKeyPresent: RECAPTCHA_SITE_KEY.length > 0,
    hasGrecaptcha: Boolean(grecaptcha),
    hasReady: Boolean(grecaptcha?.ready),
    hasExecute: Boolean(grecaptcha?.execute),
    hasEnterpriseReady: Boolean(grecaptcha?.enterprise?.ready),
    hasEnterpriseExecute: Boolean(grecaptcha?.enterprise?.execute),
    scripts: scriptNodes,
    cspViolations: recentCspViolations,
    online: navigator.onLine,
    host: window.location.host,
  };
};
