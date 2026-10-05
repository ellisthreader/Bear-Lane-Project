const rawMode = ((import.meta.env.VITE_STRIPE_MODE as string | undefined) || "live").trim().toLowerCase();
const stripeMode = rawMode === "test" ? "test" : "live";

export function getStripePublishableKey(): string {
  const key = ((import.meta.env.VITE_STRIPE_KEY as string | undefined) || "").trim();
  if (!key) {
    return "";
  }

  const expectedPrefix = stripeMode === "live" ? "pk_live_" : "pk_test_";
  if (!key.startsWith(expectedPrefix)) {
    console.error(
      `[stripe] Invalid publishable key for VITE_STRIPE_MODE=${stripeMode}. Expected prefix: ${expectedPrefix}`
    );
    return "";
  }

  return key;
}

export function getStripeMode(): "live" | "test" {
  return stripeMode;
}
