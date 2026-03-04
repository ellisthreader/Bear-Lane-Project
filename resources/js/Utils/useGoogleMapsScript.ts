import { useEffect, useMemo, useState } from "react";

type UseGoogleMapsScriptOptions = {
  enabled: boolean;
  apiKey: string;
  libraries?: string[];
};

declare global {
  interface Window {
    google?: typeof google;
  }
}

const hasRequiredGoogleLibraries = (libraries: string[]): boolean => {
  const hasMaps = Boolean(window.google?.maps);
  if (!hasMaps) return false;

  const placesRequested = libraries.includes("places");
  const hasPlaces = Boolean(window.google?.maps?.places);
  return !placesRequested || hasPlaces;
};

export default function useGoogleMapsScript({
  enabled,
  apiKey,
  libraries = [],
}: UseGoogleMapsScriptOptions): { isLoaded: boolean; loadError: Error | null } {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const normalized = Array.from(new Set(libraries.map((lib) => lib.trim()).filter(Boolean))).sort();
    return hasRequiredGoogleLibraries(normalized);
  });
  const [loadError, setLoadError] = useState<Error | null>(null);

  const normalizedLibraries = useMemo(
    () => Array.from(new Set(libraries.map((lib) => lib.trim()).filter(Boolean))).sort(),
    [libraries],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (!enabled || apiKey.trim() === "") {
      return;
    }

    if (hasRequiredGoogleLibraries(normalizedLibraries)) {
      setIsLoaded(true);
      return;
    }

    const src = new URL("https://maps.googleapis.com/maps/api/js");
    src.searchParams.set("key", apiKey.trim());
    src.searchParams.set("loading", "async");
    if (normalizedLibraries.length > 0) {
      src.searchParams.set("libraries", normalizedLibraries.join(","));
    }

    const selector = `script[data-google-maps-src="${src.toString()}"]`;
    const existing = document.querySelector<HTMLScriptElement>(selector);

    const onLoad = () => {
      setIsLoaded(true);
      setLoadError(null);
    };

    const onError = () => {
      setLoadError(new Error("Failed to load Google Maps script."));
      setIsLoaded(false);
    };

    if (existing) {
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      if (hasRequiredGoogleLibraries(normalizedLibraries)) {
        setIsLoaded(true);
      }
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = src.toString();
    script.dataset.googleMapsSrc = src.toString();
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [apiKey, enabled, normalizedLibraries]);

  return { isLoaded, loadError };
}
