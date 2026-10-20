import React from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { PREVIEW_MESSAGE, PREVIEW_QUERY_PARAM, PREVIEW_READY_MESSAGE, type SiteDesign } from "@/Theme/siteDesign";
import { GhostButton } from "./Panel";

type Props = { design: SiteDesign };

const PREVIEW_SRC = `/?${PREVIEW_QUERY_PARAM}=1`;

export default function LivePreview({ design }: Props) {
  const frame = React.useRef<HTMLIFrameElement | null>(null);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const latest = React.useRef(design);
  latest.current = design;

  const post = React.useCallback((payload: SiteDesign) => {
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, design: payload }, window.location.origin);
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if ((event.data as { type?: string })?.type !== PREVIEW_READY_MESSAGE) return;
      setReady(true);
      post(latest.current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  React.useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => post(design), 60);
    return () => window.clearTimeout(timer);
  }, [design, ready, post]);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#E4D2AA] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-semibold text-[#2D2515]">Live preview</p>
          <p className="hidden text-xs text-[#8A7B5A] sm:block">Updates as you edit. Click around to preview other pages.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-[#DCC99D] p-0.5">
            <DeviceButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop"><Monitor className="h-3.5 w-3.5" /></DeviceButton>
            <DeviceButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile"><Smartphone className="h-3.5 w-3.5" /></DeviceButton>
          </div>
          <GhostButton onClick={() => { setReady(false); setReloadKey((key) => key + 1); }} title="Reload preview">
            <RefreshCw className="h-3.5 w-3.5" />
          </GhostButton>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCC99D] bg-white px-3 py-1.5 text-xs font-semibold text-[#7D6228] transition hover:border-[#C29A4F] hover:bg-[#FFF8E7]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open site
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-1 justify-center overflow-hidden rounded-xl border border-[#E4D2AA] bg-[#F4ECDD] p-2">
        <iframe
          key={reloadKey}
          ref={frame}
          src={PREVIEW_SRC}
          title="Storefront preview"
          className={`h-[70vh] min-h-[560px] rounded-lg border border-[#DCC99D] bg-white shadow-lg transition-all duration-300 ${device === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
        />
      </div>
    </section>
  );
}

function DeviceButton({ active, label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...props}
      className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition ${active ? "bg-[#C6A75E] text-white" : "text-[#7D6228] hover:bg-[#FFF8E7]"}`}
    >
      {children}
    </button>
  );
}
