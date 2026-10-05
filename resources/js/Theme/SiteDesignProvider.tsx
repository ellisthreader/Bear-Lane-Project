import { useEffect } from "react";
import { router } from "@inertiajs/react";
import {
  DESIGN_CHANNEL,
  PREVIEW_MESSAGE,
  PREVIEW_QUERY_PARAM,
  PREVIEW_READY_MESSAGE,
  applySiteDesignToDocument,
  getEffectiveSiteDesign,
  isAdminPath,
  isPreviewingSiteDesign,
  setPreviewSiteDesign,
  setServerSiteDesign,
  subscribeSiteDesign,
  type SiteDesign,
} from "./siteDesign";

type Props = { initialDesign: SiteDesign | null | undefined };

const REFRESH_THROTTLE_MS = 15_000;

function applyCurrent() {
  const admin = isAdminPath(window.location.pathname);
  applySiteDesignToDocument(document, admin ? null : getEffectiveSiteDesign());
}

/**
 * Keeps the storefront theme in sync:
 *  - Inertia page props (initial load + every navigation)
 *  - other tabs in this browser (BroadcastChannel, fired when staff save)
 *  - the admin Website Design live preview (postMessage into the iframe)
 *  - a lightweight refetch when a tab becomes visible again
 * Admin pages are always rendered with the default palette.
 */
export default function SiteDesignProvider({ initialDesign }: Props) {
  useEffect(() => {
    setServerSiteDesign(initialDesign);
    applyCurrent();

    const unsubscribeStore = subscribeSiteDesign(applyCurrent);

    const offNavigate = router.on("navigate", (event) => {
      const props = event.detail.page.props as { storeSettings?: { design?: SiteDesign } };
      setServerSiteDesign(props.storeSettings?.design);
      applyCurrent();
    });

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(DESIGN_CHANNEL);
      channel.onmessage = (event: MessageEvent<{ design?: SiteDesign }>) => {
        if (event.data?.design) setServerSiteDesign(event.data.design);
      };
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; design?: SiteDesign | null } | null;
      if (data?.type !== PREVIEW_MESSAGE) return;
      setPreviewSiteDesign(data.design ?? null);
    };
    window.addEventListener("message", onMessage);

    const isPreviewFrame =
      window.parent !== window &&
      new URLSearchParams(window.location.search).get(PREVIEW_QUERY_PARAM) === "1";
    if (isPreviewFrame) {
      window.parent.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
    }

    let lastRefresh = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (isPreviewFrame || isPreviewingSiteDesign() || isAdminPath(window.location.pathname)) return;
      if (Date.now() - lastRefresh < REFRESH_THROTTLE_MS) return;
      lastRefresh = Date.now();
      fetch("/site-design", { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then((response) => (response.ok ? response.json() : null))
        .then((design: SiteDesign | null) => setServerSiteDesign(design))
        .catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubscribeStore();
      offNavigate();
      channel?.close();
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initialDesign]);

  return null;
}
