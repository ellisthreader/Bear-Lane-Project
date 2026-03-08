const envSiteKey =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ||
  "";
const envProvider =
  (import.meta.env.VITE_TURNSTILE_PROVIDER as string | undefined)?.trim().toLowerCase() ||
  (import.meta.env.VITE_RECAPTCHA_PROVIDER as string | undefined)?.trim().toLowerCase() ||
  "";

const readMetaValue = (name: string): string =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content?.trim() || "";

const RECAPTCHA_SITE_KEY =
  envSiteKey || readMetaValue("turnstile-site-key") || readMetaValue("recaptcha-site-key");
const providerFromMeta =
  (readMetaValue("turnstile-provider") || readMetaValue("recaptcha-provider")).toLowerCase();
const providerCandidate = envProvider || providerFromMeta;
const RECAPTCHA_PROVIDER = (providerCandidate === "turnstile" ? "turnstile" : "") as
  | "turnstile"
  | "";

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

const resolveTurnstileApi = (): Turnstile | null => {
  const turnstile = window.turnstile;
  if (!turnstile) {
    return null;
  }

  if (!turnstile.render || !turnstile.execute || !turnstile.ready) {
    return null;
  }

  return turnstile;
};

const waitForTurnstileApi = async (timeoutMs = 8000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (resolveTurnstileApi()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return Boolean(resolveTurnstileApi());
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
    script.onload = () => {
      script.dataset.recaptchaLoaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load CAPTCHA script."));
    document.head.appendChild(script);
  });

const loadRecaptchaScript = async (): Promise<void> => {
  if (!RECAPTCHA_SITE_KEY || RECAPTCHA_PROVIDER !== "turnstile") {
    return;
  }

  const hasExecutor = Boolean(resolveTurnstileApi());

  if (hasExecutor) {
    return;
  }

  if (scriptLoadPromise) {
    try {
      await scriptLoadPromise;
    } catch {
      scriptLoadPromise = null;
    }

    if (resolveTurnstileApi()) {
      return;
    }

    // Stale successful promise with no API available anymore: force a fresh load attempt.
    scriptLoadPromise = null;
  }

  scriptLoadPromise = (async () => {
    const scriptPath = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const failures: string[] = [];

    try {
      await loadScriptSrc(scriptPath);
    } catch (error) {
      failures.push(`${scriptPath}: ${error instanceof Error ? error.message : "Unknown script load error"}`);
    }

    if (await waitForTurnstileApi()) {
      return;
    }

    const turnstile = window.turnstile;
    const scriptNodes = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src*="turnstile"],script[src*="recaptcha"]')
    ).map((script) => ({
      src: script.src,
      loaded: script.dataset.recaptchaLoaded === "true",
    }));

    throw new Error(
      `CAPTCHA scripts loaded but API unavailable. provider=${RECAPTCHA_PROVIDER}, hasTurnstile=${Boolean(
        turnstile
      )}, hasReady=${Boolean(turnstile?.ready)}, hasRender=${Boolean(turnstile?.render)}, hasExecute=${Boolean(
        turnstile?.execute
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

const executeTurnstile = async (action: string): Promise<string> => {
  const turnstile = resolveTurnstileApi();
  if (!turnstile) {
    throw new Error("CAPTCHA failed to initialise. Turnstile API unavailable.");
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "1px";
  container.style.height = "1px";
  container.style.opacity = "0";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  let widgetId: string | number | null = null;
  const cleanup = () => {
    if (widgetId !== null) {
      try {
        turnstile.remove(widgetId);
      } catch {
        // no-op
      }
    }
    container.remove();
  };

  return new Promise<string>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("CAPTCHA verification timed out."));
    }, 12000);

    const done = (fn: () => void) => {
      window.clearTimeout(timeout);
      fn();
    };

    turnstile.ready(() => {
      try {
        widgetId = turnstile.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          action,
          size: "invisible",
          execution: "execute",
          callback: (token: string) =>
            done(() => {
              cleanup();
              if (!token) {
                reject(new Error("CAPTCHA token was empty."));
                return;
              }
              resolve(token);
            }),
          "error-callback": () =>
            done(() => {
              cleanup();
              reject(new Error("CAPTCHA verification failed."));
            }),
          "expired-callback": () =>
            done(() => {
              cleanup();
              reject(new Error("CAPTCHA expired. Please try again."));
            }),
        });

        turnstile.execute(widgetId);
      } catch (error) {
        done(() => {
          cleanup();
          reject(error instanceof Error ? error : new Error("CAPTCHA verification failed."));
        });
      }
    });
  });
};

export const executeRecaptcha = async (action: string): Promise<string> => {
  if (!isRecaptchaConfigured()) {
    return "";
  }

  if (RECAPTCHA_PROVIDER !== "turnstile") {
    throw new Error(
      `CAPTCHA provider misconfigured. Expected "turnstile", received "${RECAPTCHA_PROVIDER || "none"}".`
    );
  }

  await loadRecaptchaScript();

  let api = resolveTurnstileApi();
  if (!api) {
    await waitForTurnstileApi();
    api = resolveTurnstileApi();
  }

  if (!api) {
    // One recovery pass in case a stale loader state left us without an API.
    scriptLoadPromise = null;
    await loadRecaptchaScript();
    await waitForTurnstileApi();
    api = resolveTurnstileApi();
  }

  if (!api) {
    const turnstile = window.turnstile;
    const scriptNodes = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src*="turnstile"],script[src*="recaptcha"]')
    ).map((script) => ({
      src: script.src,
      loaded: script.dataset.recaptchaLoaded === "true",
    }));

    throw new Error(
      `CAPTCHA failed to initialise. provider=${RECAPTCHA_PROVIDER}, siteKeyPresent=${
        RECAPTCHA_SITE_KEY.length > 0
      }, hasTurnstile=${Boolean(turnstile)}, hasReady=${Boolean(turnstile?.ready)}, hasRender=${Boolean(
        turnstile?.render
      )}, hasExecute=${Boolean(turnstile?.execute)}, scripts=${JSON.stringify(
        scriptNodes
      )}, cspViolations=${JSON.stringify(recentCspViolations)}`
    );
  }

  return executeTurnstile(action);
};

export const getRecaptchaDiagnostics = () => {
  const turnstile = window.turnstile;
  const scriptNodes = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[src*="turnstile"],script[src*="recaptcha"]')
  ).map((script) => ({
    src: script.src,
    loaded: script.dataset.recaptchaLoaded === "true",
  }));

  return {
    provider: RECAPTCHA_PROVIDER,
    siteKeyPresent: RECAPTCHA_SITE_KEY.length > 0,
    hasTurnstile: Boolean(turnstile),
    hasReady: Boolean(turnstile?.ready),
    hasRender: Boolean(turnstile?.render),
    hasExecute: Boolean(turnstile?.execute),
    scripts: scriptNodes,
    cspViolations: recentCspViolations,
    online: navigator.onLine,
    host: window.location.host,
  };
};
