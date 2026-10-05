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
      if (existing.dataset.recaptchaLoaded === "true" || resolveTurnstileApi()) {
        resolve();
        return;
      }

      let settled = false;
      const finish = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      existing.addEventListener("load", () => finish(resolve), { once: true });
      existing.addEventListener(
        "error",
        () => finish(() => reject(new Error("Failed to load CAPTCHA script."))),
        { once: true }
      );

      // The tag is server-rendered in app.blade.php, so its load event may have
      // fired long before we got here and neither listener would ever run. Poll
      // for the API as well so this can never wait forever.
      void waitForTurnstileApi().then((ready) => {
        finish(() => (ready ? resolve() : reject(new Error("Failed to load CAPTCHA script."))));
      });
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
  })();

  try {
    await scriptLoadPromise;
  } catch (error) {
    scriptLoadPromise = null;
    throw error;
  }
};

export const isRecaptchaConfigured = (): boolean => RECAPTCHA_SITE_KEY.length > 0;

// The widget itself must appear within this window. This covers turnstile.ready()
// plus render(); if it lapses, the script is genuinely broken rather than the user
// being slow, so failing fast here is correct.
const WIDGET_RENDER_BUDGET_MS = 15000;

// Once the widget is on screen Cloudflare may serve an interactive challenge that a
// human has to complete. That is a human-speed operation, so it gets a human-speed
// budget instead of the render budget.
const INTERACTION_BUDGET_MS = 120000;

const executeTurnstile = async (action: string): Promise<string> => {
  const turnstile = resolveTurnstileApi();
  if (!turnstile) {
    throw new Error("CAPTCHA failed to initialise. Turnstile API unavailable.");
  }

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(38, 28, 8, 0.45)";

  const panel = document.createElement("div");
  panel.style.background = "linear-gradient(180deg, #fffefb 0%, #fff8ea 100%)";
  panel.style.borderRadius = "16px";
  panel.style.padding = "16px";
  panel.style.boxShadow = "0 18px 40px rgba(68, 50, 18, 0.22)";
  panel.style.maxWidth = "360px";
  panel.style.width = "min(360px, calc(100vw - 24px))";
  panel.style.border = "1px solid #e6d4ab";

  const heading = document.createElement("div");
  heading.textContent = "Cloudflare Security Check";
  heading.style.fontSize = "12px";
  heading.style.fontWeight = "700";
  heading.style.letterSpacing = "0.06em";
  heading.style.textTransform = "uppercase";
  heading.style.color = "#6f5319";
  heading.style.marginBottom = "8px";

  const container = document.createElement("div");

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.style.marginTop = "10px";
  cancel.style.width = "100%";
  cancel.style.border = "1px solid #e6d4ab";
  cancel.style.borderRadius = "10px";
  cancel.style.background = "transparent";
  cancel.style.padding = "6px";
  cancel.style.fontSize = "12px";
  cancel.style.color = "#6f5319";
  cancel.style.cursor = "pointer";

  panel.appendChild(heading);
  panel.appendChild(container);
  panel.appendChild(cancel);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let widgetId: string | number | null = null;
  const cleanup = () => {
    if (widgetId !== null) {
      try {
        turnstile.remove(widgetId);
      } catch {
        // no-op
      }
    }
    overlay.remove();
  };

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    // Every exit path funnels through here, so the widget and overlay can never be
    // left behind and a late callback can never settle the promise twice.
    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimer();
      cleanup();
      fn();
    };

    const arm = (ms: number, message: string) => {
      clearTimer();
      timer = window.setTimeout(() => settle(() => reject(new Error(message))), ms);
    };

    // A challenge that goes stale while the user is still working on it is
    // recoverable: reset the widget and keep waiting rather than failing the submit.
    const resetAndKeepWaiting = () => {
      if (settled || widgetId === null) {
        return;
      }
      try {
        turnstile.reset(widgetId);
      } catch {
        // no-op
      }
    };

    cancel.addEventListener("click", () =>
      settle(() => reject(new Error("CAPTCHA cancelled.")))
    );

    arm(
      WIDGET_RENDER_BUDGET_MS,
      "CAPTCHA failed to display. Please refresh the page and try again."
    );

    turnstile.ready(() => {
      if (settled) {
        return;
      }

      try {
        widgetId = turnstile.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          action,
          size: "normal",
          appearance: "always",
          execution: "render",
          retry: "auto",
          "retry-interval": 2000,
          "refresh-expired": "auto",
          callback: (token: string) =>
            settle(() => {
              if (!token) {
                reject(new Error("CAPTCHA token was empty."));
                return;
              }
              resolve(token);
            }),
          "error-callback": () =>
            settle(() => {
              reject(new Error("CAPTCHA verification failed."));
            }),
          "expired-callback": resetAndKeepWaiting,
          "timeout-callback": resetAndKeepWaiting,
        });

        // The widget is up. Hand the remaining time to the human, unless a
        // callback already resolved us during render().
        if (!settled) {
          arm(INTERACTION_BUDGET_MS, "CAPTCHA verification timed out.");
        }
      } catch (error) {
        settle(() => {
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
