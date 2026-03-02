"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCart } from "@/Context/CartContext";
import { useWishlist } from "@/Context/WishlistContext";
import { Link, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Search, User, Heart, Shield, Bell, AlertTriangle, MessageSquare, Loader2 } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultProduct[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: number; type: "warning" | "message"; title: string; content: string; created_at: string | null }>
  >([]);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const categories = ["Women", "Men", "Kids", "Sale"];
  const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  const sidebarVariants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  const renderSidebar = () => {
    switch (activeSidebar?.toLowerCase()) {
      case "women":
        return <WomenSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "men":
        return <MenSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "kids":
        return <KidsSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "sale":
        return <SaleSidebar closeSidebar={() => setActiveSidebar(null)} />;
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

  useEffect(() => {
    if (!notificationsOpen || !isAuthenticated) return;

    let ignore = false;
    const run = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError(null);
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
      } catch (error) {
        if (!ignore) {
          setNotificationsError("Unable to load notifications.");
          setNotifications([]);
        }
      } finally {
        if (!ignore) {
          setNotificationsLoading(false);
        }
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [notificationsOpen, isAuthenticated]);

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

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
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
      searchInputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

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
        className="
          relative z-30 w-full
          bg-white dark:bg-gray-900
          backdrop-blur-xl
          flex items-center
          pl-3 pr-10 py-4
          border-b border-gray-200 dark:border-gray-700
        "
      >
        {/* LEFT */}
        <div className="flex items-center gap-1">
          {/* LOGO */}
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
                relative h-[50px] w-[220px]
                transition-all duration-300
                ${logoGlow ? "logo-neon-glow" : ""}
              `}
            >
              <img
                src="/images/BLText.png"
                alt="Bear Lane"
                className="w-full h-full object-contain select-none"
              />
            </div>
          </Link>

          {/* NAV LINKS */}
          <div
            className="
              flex items-center gap-12
              text-[17px] uppercase tracking-wide
              text-black dark:text-gray-200
            "
          >
            {categories.map((cat) => (
              <div
                key={cat}
                onMouseEnter={() => setActiveSidebar(cat)} // OPEN on hover
                className="
                  cursor-pointer px-4 py-2
                  transition-all duration-300
                  hover:text-[#D4AF37]
                  relative
                  after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0
                  after:w-0 after:h-[2px]
                  after:bg-[#D4AF37]
                  after:transition-all after:duration-300
                  hover:after:w-full
                "
              >
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="ml-auto flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setNotificationsOpen(false);
              setActiveSidebar(null);
            }}
            className="inline-flex items-center justify-center"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          </button>
          <button
            type="button"
            onClick={toggleWishlist}
            className="inline-flex items-center justify-center"
            aria-label="Open wishlist"
          >
            <Heart className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          </button>
          <Link href="/profile">
            <User className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative inline-flex items-center justify-center"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#D4AF37] px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={openCart}
            className="cursor-pointer hover:text-[#D4AF37] transition"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/35 text-[#7B6530] transition hover:border-[#D4AF37] hover:bg-[#FFF8E6] hover:text-[#D4AF37]"
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
      </motion.nav>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            ref={searchPanelRef}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-6 top-[74px] z-50 w-[500px] max-w-[95vw] overflow-hidden rounded-2xl border border-[#E8D8B3] bg-white shadow-[0_28px_65px_rgba(105,79,20,0.18)]"
          >
            <div className="bg-gradient-to-r from-[#FFFAEE] to-[#FFF4D6] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A6D2B]">
                Search Products
              </p>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Try hoodie, jacket, polo..."
                  className="w-full rounded-xl border border-[#E2CF9B] bg-white py-2.5 pl-10 pr-4 text-sm text-[#2A2317] outline-none transition placeholder:text-[#9E8650] focus:border-[#C9A24D] focus:ring-2 focus:ring-[#EBD8AE]"
                />
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto bg-white p-3">
              {searchQuery.trim().length < 2 && (
                <div className="rounded-xl border border-dashed border-[#E5D5AE] bg-[#FFFBF3] p-4 text-sm text-[#7A6540]">
                  Type at least 2 characters to search products.
                </div>
              )}

              {searchQuery.trim().length >= 2 && searchLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-[#F1E7D0] bg-[#FFFCF6] px-3 py-4 text-sm text-[#6E5A36]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching products...
                </div>
              )}

              {searchQuery.trim().length >= 2 && !searchLoading && searchError && (
                <div className="rounded-xl border border-[#F6CFBF] bg-[#FFF6F3] p-4 text-sm text-[#9C4525]">
                  {searchError}
                </div>
              )}

              {searchQuery.trim().length >= 2 &&
                !searchLoading &&
                !searchError &&
                searchResults.length === 0 && (
                  <div className="rounded-xl border border-[#F1E7D0] bg-[#FFFCF6] p-4 text-sm text-[#7A6540]">
                    No matching products found.
                  </div>
                )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <Link
                      key={`${item.slug}-${item.id}`}
                      href={`/product/${encodeURIComponent(item.slug)}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-[#E7D5AB] hover:bg-[#FFF9EC]"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-lg border border-[#EADFC8] bg-[#F7F3EA]">
                        <img
                          src={item.image || "/images/no-image.png"}
                          alt={item.name}
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
            className="absolute right-6 top-[74px] z-40 w-[360px] max-w-[92vw] rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-2xl"
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
                    <p className="whitespace-pre-wrap text-sm text-[#374151]">{item.content}</p>
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
        {activeSidebar && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute top-full left-0 w-full h-screen bg-black z-20"
            />

            {/* SIDEBAR PANEL */}
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="
                absolute top-full left-0
                w-[35%] h-screen
                bg-white dark:bg-gray-900
                shadow-2xl z-30
                p-7 overflow-y-auto
              "
            >
              {renderSidebar()}
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
