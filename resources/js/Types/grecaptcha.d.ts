export {};

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    action?: string;
    cData?: string;
    size?: "normal" | "compact" | "flexible" | "invisible";
    theme?: "auto" | "light" | "dark";
    execution?: "render" | "execute";
    callback?: (token: string) => void;
    "error-callback"?: () => void;
    "expired-callback"?: () => void;
  }

  interface Turnstile {
    ready: (cb: () => void) => void;
    render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string | number;
    execute: (widgetId: string | number) => void;
    reset: (widgetId?: string | number) => void;
    remove: (widgetId: string | number) => void;
  }

  interface Window {
    turnstile?: Turnstile;
  }
}
