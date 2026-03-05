export {};

declare global {
  interface GrecaptchaExecutor {
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  }

  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: GrecaptchaExecutor["execute"];
      enterprise?: GrecaptchaExecutor;
    };
  }
}
