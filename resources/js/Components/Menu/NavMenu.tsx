"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/Context/CartContext";
import { useWishlist } from "@/Context/WishlistContext";
import { Link, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Search,
  User,
  Heart,
  Shield,
  Bell,
  AlertTriangle,
  MessageSquare,
  Loader2,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import CartSidebar from "@/Components/Cart/CartSidebar";
import WishlistSidebar from "@/Components/Wishlist/WishlistSidebar";

// SIDEBAR COMPONENTS
import WomenSidebar from "@/Components/Menu/WomenSidebar/WomenSidebar";
import MenSidebar from "@/Components/Menu/MenSidebar/MenSidebar";
import KidsSidebar from "@/Components/Menu/KidsSidebar/KidsSidebar";
import SaleSidebar from "@/Components/Menu/SaleSidebar/SaleSidebar";

type SearchResultProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string;
};

export default function NavMenu() {
  const page = usePage<{ auth?: { user?: { id?: number; is_admin?: boolean } } }>();
  const isAuthenticated = Boolean(page.props.auth?.user?.id);
  const isAdmin = Boolean(page.props.auth?.user?.is_admin);
  const { openCart } = useCart();
  const { toggleWishlist } = useWishlist();

  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [logoGlow, setLogoGlow] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationActionLoading, setNotificationActionLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [pendingChatNotifications, setPendingChatNotifications] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultProduct[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: number; type: "warning" | "message"; title: string; content: string; created_at: string | null }>
  >([]);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchControlRef = useRef<HTMLDivElement | null>(null);
  const searchMiddleRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [desktopOverlayTop, setDesktopOverlayTop] = useState(0);

  const categories = ["Women", "Men", "Kids", "Sale"];
  const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  const sidebarVariants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setActiveSidebar(null);
    setMobileCategoryOpen(null);
  };

  const toggleMobileCategory = (cat: string) => {
    setMobileCategoryOpen((prev) => (prev === cat ? null : cat));
  };

  const renderSidebar = (closeSidebar: () => void) => {
    switch (activeSidebar?.toLowerCase()) {
      case "women":
        return <WomenSidebar closeSidebar={closeSidebar} />;
      case "men":
        return <MenSidebar closeSidebar={closeSidebar} />;
      case "kids":
        return <KidsSidebar closeSidebar={closeSidebar} />;
      case "sale":
        return <SaleSidebar />;
      default:
        return null;
    }
  };

  const renderMobileSidebar = (category: string) => {
    switch (category.toLowerCase()) {
      case "women":
        return <WomenSidebar closeSidebar={closeMobileMenu} variant="accordion" showHeading={false} />;
      case "men":
        return <MenSidebar closeSidebar={closeMobileMenu} variant="accordion" showHeading={false} />;
      case "kids":
        return <KidsSidebar closeSidebar={closeMobileMenu} variant="accordion" showHeading={false} />;
      case "sale":
        return <SaleSidebar variant="mobile" />;
      default:
        return null;
    }
  };

  const mapSearchProducts = (payload: unknown, q: string): SearchResultProduct[] => {
    const categories = Array.isArray(payload) ? payload : [];
    const normalized = q.toLowerCase();
    const seen = new Set<string>();
    const items: SearchResultProduct[] = [];

    categories.forEach((categoryItem) => {
      const category = (categoryItem as { name?: unknown })?.name;
      const categoryName = typeof category === "string" ? category : "Product";
      const products = (categoryItem as { products?: unknown })?.products;
      if (!Array.isArray(products)) return;

      products.forEach((productItem) => {
        const slugRaw = (productItem as { slug?: unknown })?.slug;
        const slug = typeof slugRaw === "string" ? slugRaw : "";
        if (!slug || seen.has(slug)) return;

        const nameRaw = (productItem as { name?: unknown })?.name;
        const name = typeof nameRaw === "string" ? nameRaw : "Product";

        const matchesQuery =
          name.toLowerCase().includes(normalized) ||
          slug.toLowerCase().includes(normalized) ||
          categoryName.toLowerCase().includes(normalized);

        if (!matchesQuery) return;

        const priceRaw = Number((productItem as { price?: unknown })?.price ?? 0);
        const imageRaw = (productItem as { image?: unknown })?.image;

        items.push({
          id: Number((productItem as { id?: unknown })?.id ?? 0),
          name,
          slug,
          price: Number.isFinite(priceRaw) ? priceRaw : 0,
          image: typeof imageRaw === "string" ? imageRaw : null,
          category: categoryName,
        });
        seen.add(slug);
      });
    });

    return items.slice(0, 10);
  };

  const renderNotificationContent = (content: string) => {
    const text = String(content || "");
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (/^https?:\/\//.test(part)) {
        return (
          <a
            key={`notif-link-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#7B6530] underline underline-offset-2"
          >
            {part}
          </a>
        );
      }

      return <React.Fragment key={`notif-text-${index}`}>{part}</React.Fragment>;
    });
  };

  const searchCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    searchResults.forEach((item) => {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [searchResults]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationsError(null);
      return;
    }

    let ignore = false;

    const run = async (silent = false) => {
      try {
        if (!silent) {
          setNotificationsLoading(true);
          setNotificationsError(null);
        }

        const response = await fetch("/notifications/admin-notices", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed (${response.status})`);
        }

        const payload = await response.json();
        if (!ignore) {
          setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
        }
      } catch {
        if (!ignore && !silent) {
          setNotificationsError("Unable to load notifications.");
        }
      } finally {
        if (!ignore && !silent) {
          setNotificationsLoading(false);
        }
      }
    };

    void run(!notificationsOpen);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void run(true);
      }
    };

    const intervalId = window.setInterval(() => {
      void run(true);
    }, 30000);

    window.addEventListener("focus", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, notificationsOpen]);

  useEffect(() => {
    if (!isAdmin) {
      setPendingChatNotifications(0);
      return;
    }

    let cancelled = false;
    const fetchPendingChats = async () => {
      try {
        const response = await fetch("/admin/support/data", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const payload = await response.json();
        if (!cancelled) {
          const count = Number(payload?.summary?.live_chat_notifications ?? 0);
          setPendingChatNotifications(Number.isFinite(count) ? count : 0);
        }
      } catch {
        if (!cancelled) {
          setPendingChatNotifications(0);
        }
      }
    };

    fetchPendingChats();
    const intervalId = window.setInterval(fetchPendingChats, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!searchOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    const closeOnOutsideClick = (event: Event) => {
      const target = event.target as Node;
      const inPanel = Boolean(searchPanelRef.current?.contains(target));
      const inControl = Boolean(searchControlRef.current?.contains(target));
      const inMiddle = Boolean(searchMiddleRef.current?.contains(target));
      if (!inPanel && !inControl && !inMiddle) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick, { passive: true });
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const response = await fetch(`/search-categories?q=${encodeURIComponent(q)}`, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed (${response.status})`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setSearchResults(mapSearchProducts(payload, q));
        }
      } catch {
        if (!cancelled) {
          setSearchError("Unable to search products right now.");
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => {
      const desktopInput = searchInputRef.current;
      const mobileInput = mobileSearchInputRef.current;
      const target =
        (desktopInput && desktopInput.offsetParent !== null
          ? desktopInput
          : mobileInput) ?? desktopInput ?? mobileInput;
      target?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && !activeSidebar) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen, activeSidebar]);

  useEffect(() => {
    const syncDesktopOverlayTop = () => {
      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
      // Slight overlap removes the tiny seam between nav and desktop sidebar.
      setDesktopOverlayTop(Math.max(0, navBottom - 1));
    };

    syncDesktopOverlayTop();
    window.addEventListener("scroll", syncDesktopOverlayTop, { passive: true });
    window.addEventListener("resize", syncDesktopOverlayTop);

    let resizeObserver: ResizeObserver | null = null;
    if (navRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(syncDesktopOverlayTop);
      resizeObserver.observe(navRef.current);
    }

    return () => {
      window.removeEventListener("scroll", syncDesktopOverlayTop);
      window.removeEventListener("resize", syncDesktopOverlayTop);
      resizeObserver?.disconnect();
    };
  }, []);

  const unreadCount = notifications.length;

  const deleteNotification = async (notificationId: number) => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    setNotificationActionLoading(true);
    setNotificationsError(null);
    try {
      const response = await fetch(`/notifications/admin-notices/${notificationId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed (${response.status})`);
      }
    } catch {
      setNotifications(previous);
      setNotificationsError("Unable to delete notification.");
    } finally {
      setNotificationActionLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    const previous = notifications;
    setNotifications([]);
    setNotificationActionLoading(true);
    setNotificationsError(null);
    try {
      const response = await fetch("/notifications/admin-notices", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed (${response.status})`);
      }
    } catch {
      setNotifications(previous);
      setNotificationsError("Unable to clear notifications.");
    } finally {
      setNotificationActionLoading(false);
    }
  };

  return (
    <>
      <div
        className="relative"
        onMouseLeave={() => setActiveSidebar(null)} // CLOSE ONLY when leaving entire area
      >
      <motion.nav
        ref={navRef}
        className="
          sticky top-0 z-50 w-full border-b border-gray-200 bg-white px-2 py-2 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900
          sm:px-4 sm:py-3 lg:py-4 lg:pl-3 lg:pr-10
        "
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex min-h-[52px] flex-nowrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(true);
              setSearchOpen(false);
              setNotificationsOpen(false);
              setActiveSidebar(null);
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8D8B3] bg-[#FFF9EC] text-[#7D5E1A] transition hover:border-[#D4AF37] hover:text-[#D4AF37] sm:h-10 sm:w-10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-nowrap items-center gap-1">
            <Link
              href="/"
              onClick={() => {
                setLogoGlow(true);
                setTimeout(() => setLogoGlow(false), 600);
              }}
              className="flex items-center"
            >
              <div
                className={`
                  relative h-[40px] w-[112px] shrink-0 transition-all duration-300 sm:h-[46px] sm:w-[170px] md:w-[190px] lg:h-[50px] lg:w-[220px]
                  ${logoGlow ? "logo-neon-glow" : ""}
                `}
              >
                <img
                  src="/images/BLText.png"
                  alt="Bear Lane"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain select-none"
                />
              </div>
            </Link>

            <div
              className="
                hidden items-center gap-12 text-[17px] uppercase tracking-wide text-black transition-opacity duration-200 dark:text-gray-200 lg:flex
              "
              style={{
                opacity: searchOpen ? 0 : 1,
                visibility: searchOpen ? "hidden" : "visible",
                pointerEvents: searchOpen ? "none" : "auto",
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat}
                  onMouseEnter={() => setActiveSidebar(cat)}
                  className="
                    relative cursor-pointer px-4 py-2 transition-all duration-300 hover:text-[#D4AF37]
                    after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-[#D4AF37] after:transition-all after:duration-300
                    hover:after:w-full
                  "
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>

          <div
            ref={searchMiddleRef}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          >
            <motion.div
              initial={false}
              animate={{ width: searchOpen ? 500 : 0, opacity: searchOpen ? 1 : 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="relative pointer-events-auto">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search products..."
                  className="w-[500px] rounded-full border border-[#E2CF9B] bg-[#FFFDF7] py-2.5 pl-10 pr-4 text-sm text-[#2A2317] outline-none transition placeholder:text-[#9E8650] focus:border-[#C9A24D] focus:ring-2 focus:ring-[#EBD8AE]"
                />
              </div>
            </motion.div>
          </div>

          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-0.5 sm:gap-2 lg:gap-6">
            <div ref={searchControlRef} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => {
                    const next = !prev;
                    if (!next) {
                      setSearchQuery("");
                      setSearchResults([]);
                    } else {
                      setNotificationsOpen(false);
                      setActiveSidebar(null);
                      setMobileMenuOpen(false);
                    }
                    return next;
                  });
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[#F6ECD5] sm:h-10 sm:w-10"
                aria-label="Search products"
              >
                <Search className="h-5 w-5 cursor-pointer transition hover:text-[#D4AF37]" />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleWishlist}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[#F6ECD5] sm:inline-flex"
              aria-label="Open wishlist"
            >
              <Heart className="h-5 w-5 cursor-pointer transition hover:text-[#D4AF37]" />
            </button>
            <Link href="/profile" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[#F6ECD5] sm:h-10 sm:w-10">
              <User className="h-5 w-5 cursor-pointer transition hover:text-[#D4AF37]" />
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[#F6ECD5] sm:h-10 sm:w-10"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5 cursor-pointer transition hover:text-[#D4AF37]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={openCart}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[#F6ECD5] sm:h-10 sm:w-10"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="relative hidden h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/35 text-[#7B6530] transition hover:border-[#D4AF37] hover:bg-[#FFF8E6] hover:text-[#D4AF37] sm:inline-flex"
                aria-label="Open admin dashboard"
                title="Admin Dashboard"
              >
                <Shield className="h-4 w-4" />
                {pendingChatNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                ) : null}
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      <div className="border-b border-[#EFE3C8] bg-white px-3 pb-3 lg:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
          <input
            ref={mobileSearchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              setSearchOpen(true);
              setActiveSidebar(null);
              setMobileMenuOpen(false);
            }}
            placeholder="Search products..."
            className="w-full rounded-full border border-[#E2CF9B] bg-[#FFFDF7] py-2.5 pl-10 pr-4 text-sm text-[#2A2317] outline-none transition placeholder:text-[#9E8650] focus:border-[#C9A24D] focus:ring-2 focus:ring-[#EBD8AE]"
          />
        </div>
      </div>

      {searchOpen && (
        <button
          type="button"
          onClick={() => setSearchOpen(false)}
          aria-label="Close search overlay"
          className="fixed inset-0 z-30 bg-transparent lg:hidden"
        />
      )}

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            ref={searchPanelRef}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full z-40 border-b border-[#E8D8B3] bg-white"
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A6D2B]">
                Search Products
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {searchCategoryCounts.length > 0 ? (
                  searchCategoryCounts.map(([category, count]) => (
                    <span
                      key={category}
                      className="inline-flex items-center rounded-full border border-[#E3D3AD] bg-white px-3 py-1 text-xs font-semibold text-[#7C6031]"
                    >
                      {category} ({count})
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#8A6D2B]">
                    Start typing to see category counts and product suggestions.
                  </span>
                )}
              </div>
            </div>

            <div className="mx-auto grid max-h-[430px] max-w-7xl gap-4 overflow-y-auto bg-white px-4 pb-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
              {searchQuery.trim().length < 2 && (
                <div className="border border-dashed border-[#E5D5AE] bg-[#FFFBF3] p-4 text-sm text-[#7A6540] lg:col-span-2">
                  Type at least 2 characters to search products.
                </div>
              )}

              {searchQuery.trim().length >= 2 && searchLoading && (
                <div className="flex items-center gap-2 border border-[#F1E7D0] bg-[#FFFCF6] px-3 py-4 text-sm text-[#6E5A36] lg:col-span-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching products...
                </div>
              )}

              {searchQuery.trim().length >= 2 && !searchLoading && searchError && (
                <div className="border border-[#F6CFBF] bg-[#FFF6F3] p-4 text-sm text-[#9C4525] lg:col-span-2">
                  {searchError}
                </div>
              )}

              {searchQuery.trim().length >= 2 &&
                !searchLoading &&
                !searchError &&
                searchResults.length === 0 && (
                  <div className="border border-[#F1E7D0] bg-[#FFFCF6] p-4 text-sm text-[#7A6540] lg:col-span-2">
                    No matching products found.
                  </div>
                )}

              {searchResults.length > 0 && (
                <>
                  <div className="border border-[#EADFC6] bg-[#FFFCF6] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6D2B]">
                      Categories
                    </p>
                    <div className="mt-3 space-y-2">
                      {searchCategoryCounts.map(([category, count]) => (
                        <div
                          key={category}
                          className="flex items-center justify-between border border-[#EFE2C4] bg-white px-3 py-2"
                        >
                          <span className="text-sm font-medium text-[#3C301E]">{category}</span>
                          <span className="text-xs font-semibold text-[#8A6D2B]">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {searchResults.map((item) => (
                      <Link
                        key={`${item.slug}-${item.id}`}
                        href={`/product/${encodeURIComponent(item.slug)}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="group flex items-center gap-3 border border-transparent px-2 py-2 transition hover:border-[#E7D5AB] hover:bg-[#FFF9EC]"
                      >
                        <div className="h-16 w-16 overflow-hidden border border-[#EADFC8] bg-[#F7F3EA]">
                          <img
                            src={item.image || "/images/no-image.png"}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1F1A13]">{item.name}</p>
                          <p className="text-xs uppercase tracking-wide text-[#8E7642]">{item.category}</p>
                          <p className="mt-1 text-sm font-bold text-[#7D5E1A]">£{item.price.toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notificationsOpen && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-2 top-[68px] z-40 w-[360px] max-w-[92vw] rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-2xl sm:right-6 sm:top-[74px]"
          >
            <div className="mb-2 flex items-center justify-between px-1 py-1">
              <h3 className="text-sm font-semibold text-[#111827]">Notifications</h3>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    disabled={notificationActionLoading}
                    onClick={clearAllNotifications}
                    className="text-xs font-medium text-[#7B6530] transition hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs font-medium text-[#6b7280] transition hover:text-[#111827]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {notificationsLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-[#f3f4f6] bg-[#fafafa] px-3 py-4 text-sm text-[#4b5563]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              )}

              {!notificationsLoading && notificationsError && (
                <div className="rounded-xl border border-[#fee2e2] bg-[#fff5f5] px-3 py-4 text-sm text-[#b91c1c]">
                  {notificationsError}
                </div>
              )}

              {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                <div className="rounded-xl border border-[#f3f4f6] bg-[#fafafa] px-3 py-5 text-sm text-[#6b7280]">
                  No notifications yet.
                </div>
              )}

              {!notificationsLoading &&
                !notificationsError &&
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-3 ${
                      item.type === "warning"
                        ? "border-[#fecaca] bg-[#fff5f5]"
                        : "border-[#e5e7eb] bg-[#fafafa]"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {item.type === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-[#b91c1c]" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-[#7B6530]" />
                      )}
                      <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-[#374151]">{renderNotificationContent(item.content)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {item.created_at ? (
                        <p className="text-xs text-[#6b7280]">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        disabled={notificationActionLoading}
                        onClick={() => deleteNotification(item.id)}
                        className="text-xs font-medium text-[#6b7280] transition hover:text-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.52 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              onPointerDown={closeMobileMenu}
              className="fixed inset-0 z-50 bg-black lg:hidden"
              aria-label="Close mobile menu backdrop"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-[60] w-[88%] max-w-[360px] overflow-y-auto border-r border-[#E8D8B3] bg-white p-4 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between">
                <div className="h-[42px] w-[150px]">
                  <img
                    src="/images/BLText.png"
                    alt="Bear Lane"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8D8B3] bg-[#FFF9EC] text-[#7D5E1A]"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  href="/profile"
                  onClick={closeMobileMenu}
                  className="rounded-xl border border-[#E7D7B3] bg-[#FFFCF4] px-3 py-2 text-center text-xs font-semibold text-[#5F4820]"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    toggleWishlist();
                    closeMobileMenu();
                  }}
                  className="rounded-xl border border-[#E7D7B3] bg-[#FFFCF4] px-3 py-2 text-center text-xs font-semibold text-[#5F4820]"
                >
                  Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openCart();
                    closeMobileMenu();
                  }}
                  className="rounded-xl border border-[#E7D7B3] bg-[#FFFCF4] px-3 py-2 text-center text-xs font-semibold text-[#5F4820]"
                >
                  Cart
                </button>
              </div>

              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={closeMobileMenu}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#E0C98A] bg-[#FFF6DF] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#7D5E1A]"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin dashboard
                </Link>
              )}

              <div className="mt-6 rounded-2xl border border-[#EADFC6] bg-[#FFFDF8] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A6D2B]">
                  Shop Categories
                </p>
                <div className="mt-3 space-y-2">
                  {categories.map((cat) => {
                    const isOpen = mobileCategoryOpen === cat;
                    return (
                      <div
                        key={`mobile-category-${cat}`}
                        className={`rounded-2xl border ${
                          isOpen ? "border-[#E2C98F] bg-white" : "border-[#EFE2C4] bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMobileCategory(cat)}
                          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-base font-semibold text-[#2B2417] transition hover:bg-[#FFF6DF]"
                        >
                          <span>{cat}</span>
                          <ChevronRight
                            className={`h-5 w-5 text-[#8A6D2B] transition-transform ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        {isOpen ? <div className="px-3 pb-4 pt-1">{renderMobileSidebar(cat)}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSidebar && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSidebar(null)}
              className="fixed left-0 z-20 hidden w-full cursor-pointer bg-black lg:block"
              style={{ top: desktopOverlayTop, height: `calc(100vh - ${desktopOverlayTop}px)` }}
            />

            {/* SIDEBAR PANEL */}
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="
                fixed left-0 z-30 hidden w-[35%] overflow-y-auto bg-white p-7 shadow-2xl dark:bg-gray-900 lg:block
              "
              style={{ top: desktopOverlayTop, height: `calc(100vh - ${desktopOverlayTop}px)` }}
            >
              {renderSidebar(() => setActiveSidebar(null))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
      <CartSidebar />
      <WishlistSidebar />
    </>
  );
}
