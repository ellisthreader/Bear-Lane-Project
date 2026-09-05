import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@inertiajs/react";
import { CircleHelp, ChevronUp, Headphones, MessageCircleQuestion } from "lucide-react";

type QuickLink = {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
};

const quickLinks: QuickLink[] = [
  {
    href: "/help",
    title: "Help Centre",
    subtitle: "Guides and support topics",
    icon: <Headphones className="h-4 w-4" />,
  },
  {
    href: "/help/livechat",
    title: "Live Chat",
    subtitle: "Talk to our support team",
    icon: <MessageCircleQuestion className="h-4 w-4" />,
  },
  {
    href: "/faq",
    title: "FAQs",
    subtitle: "Quick answers",
    icon: <CircleHelp className="h-4 w-4" />,
  },
];

export default function FloatingHelpLauncher() {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return window.location.pathname;
  });
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);

    syncPath();
    window.addEventListener("popstate", syncPath);
    document.addEventListener("inertia:navigate", syncPath as EventListener);

    return () => {
      window.removeEventListener("popstate", syncPath);
      document.removeEventListener("inertia:navigate", syncPath as EventListener);
    };
  }, []);

  const shouldHide = useMemo(
    () =>
      path.startsWith("/admin")
      || path.startsWith("/checkout")
      || path.startsWith("/design")
      || path.startsWith("/help")
      || path.startsWith("/support")
      || path.startsWith("/faq"),
    [path]
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (shouldHide) {
    return null;
  }

  return (
    <div ref={shellRef} className="pointer-events-none fixed bottom-4 right-4 z-[190] sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto relative">
        <div
          className={`absolute bottom-full right-0 mb-3 w-[min(84vw,330px)] origin-bottom-right overflow-hidden rounded-2xl border border-[#E6D3A5] bg-white/95 backdrop-blur-md transition-all duration-300 ${
            open
              ? "translate-y-0 scale-100 opacity-100 shadow-[0_24px_70px_rgba(62,44,9,0.22)]"
              : "pointer-events-none translate-y-2 scale-95 opacity-0"
          }`}
          aria-hidden={!open}
        >
          <div className="bg-gradient-to-r from-[#FFF4D7] via-[#FFF8EA] to-[#FFF4D7] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8A6D2B]">Support</p>
            <p className="mt-1 text-sm font-semibold text-[#2B2112]">How can we help?</p>
          </div>

          <div className="space-y-2 p-3">
            {quickLinks.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-xl border border-[#EBDDBE] bg-white px-3 py-2.5 transition hover:border-[#D4B066] hover:bg-[#FFFAEF]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6D3A5] bg-[#FFF7E4] text-[#8A6D2B]">
                  {entry.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#2D2415]">{entry.title}</span>
                  <span className="block text-xs text-[#76684A]">{entry.subtitle}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? "Close support menu" : "Open support menu"}
          className={`group relative inline-flex items-center justify-center rounded-full border border-[#D5B46F] bg-gradient-to-br from-[#E2C074] via-[#D8B15A] to-[#B88D38] text-white shadow-[0_14px_30px_rgba(98,70,21,0.38)] transition ${
            open ? "h-12 w-12 sm:h-14 sm:w-14" : "h-12 w-12 sm:h-14 sm:w-14"
          }`}
        >
          <span className="absolute inset-0 rounded-full bg-white/0 transition group-hover:bg-white/10" />
          {open ? <ChevronUp className="relative h-5 w-5 sm:h-6 sm:w-6" /> : <CircleHelp className="relative h-5 w-5 sm:h-6 sm:w-6" />}
        </button>
      </div>
    </div>
  );
}
