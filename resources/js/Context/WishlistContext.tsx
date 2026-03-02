"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type WishlistItem = {
  id: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  image?: string | null;
  slug?: string | null;
};

type AddToWishlistPayload = {
  id?: string | number | null;
  name: string;
  brand?: string | null;
  price?: number | string | null;
  image?: string | null;
  slug?: string | null;
};

type WishlistContextType = {
  wishlist: WishlistItem[];
  addToWishlist: (item: AddToWishlistPayload) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlistItem: (item: AddToWishlistPayload) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  showWishlist: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
  toggleWishlist: () => void;
};

const STORAGE_KEY = "bearlane_wishlist_v1";

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const normalizePrice = (price?: number | string | null) => {
  if (typeof price === "number") return Number.isFinite(price) ? price : null;
  if (typeof price === "string") {
    const parsed = parseFloat(price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeId = (payload: AddToWishlistPayload) => {
  if (payload.id !== null && payload.id !== undefined && String(payload.id).trim() !== "") {
    return String(payload.id);
  }
  if (payload.slug && payload.slug.trim() !== "") return `slug:${payload.slug.trim()}`;
  return `name:${payload.name.trim().toLowerCase()}`;
};

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [useBackend, setUseBackend] = useState(false);

  const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  const loadFromLocalStorage = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [] as WishlistItem[];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [] as WishlistItem[];
      return parsed
        .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
        .map((item) => ({
          id: String(item.id),
          name: String(item.name),
          brand: item.brand ?? null,
          price: typeof item.price === "number" ? item.price : null,
          image: item.image ?? null,
          slug: item.slug ?? null,
        }));
    } catch {
      return [] as WishlistItem[];
    }
  };

  const fetchWishlist = async () => {
    const response = await fetch("/wishlist-items", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!response.ok) throw new Error("Wishlist backend unavailable");
    const payload = await response.json();
    const items = Array.isArray(payload.wishlist_items) ? payload.wishlist_items : [];
    setWishlist(
      items
        .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
        .map((item) => ({
          id: String(item.id),
          name: String(item.name),
          brand: item.brand ?? null,
          price: typeof item.price === "number" ? item.price : null,
          image: item.image ?? null,
          slug: item.slug ?? null,
        }))
    );
  };

  const persistToDatabase = async (item: WishlistItem) => {
    const csrfToken = getCsrfToken();
    await fetch("/wishlist-items", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        item_key: item.id,
        product_id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        product_slug: item.slug ?? null,
        name: item.name,
        brand: item.brand ?? null,
        price: item.price ?? null,
        image: item.image ?? null,
      }),
    });
  };

  const removeFromDatabase = async (itemKey: string) => {
    const csrfToken = getCsrfToken();
    await fetch("/wishlist-items", {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ item_key: itemKey }),
    });
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      try {
        await fetchWishlist();
        if (isMounted) setUseBackend(true);
      } catch {
        if (!isMounted) return;
        setUseBackend(false);
        setWishlist(loadFromLocalStorage());
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (useBackend) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // no-op
    }
  }, [wishlist, useBackend]);

  const addToWishlist = (item: AddToWishlistPayload) => {
    const id = normalizeId(item);
    const nextItem: WishlistItem = {
      id,
      name: item.name,
      brand: item.brand ?? null,
      price: normalizePrice(item.price),
      image: item.image ?? null,
      slug: item.slug ?? null,
    };
    setWishlist((prev) => (prev.some((entry) => entry.id === id) ? prev : [nextItem, ...prev]));

    if (useBackend) {
      persistToDatabase(nextItem).catch(() => fetchWishlist().catch(() => {}));
    }
  };

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    if (useBackend) {
      removeFromDatabase(id).catch(() => fetchWishlist().catch(() => {}));
    }
  };

  const toggleWishlistItem = (item: AddToWishlistPayload) => {
    const id = normalizeId(item);
    const nextItem: WishlistItem = {
      id,
      name: item.name,
      brand: item.brand ?? null,
      price: normalizePrice(item.price),
      image: item.image ?? null,
      slug: item.slug ?? null,
    };
    const exists = wishlist.some((entry) => entry.id === id);
    setWishlist((prev) => (exists ? prev.filter((entry) => entry.id !== id) : [nextItem, ...prev]));

    if (!useBackend) return;
    if (exists) {
      removeFromDatabase(id).catch(() => fetchWishlist().catch(() => {}));
      return;
    }
    persistToDatabase(nextItem).catch(() => fetchWishlist().catch(() => {}));
  };

  const isInWishlist = useMemo(() => {
    const ids = new Set(wishlist.map((item) => item.id));
    return (id: string) => ids.has(id);
  }, [wishlist]);

  const clearWishlist = () => setWishlist([]);
  const openWishlist = () => setShowWishlist(true);
  const closeWishlist = () => setShowWishlist(false);
  const toggleWishlist = () => setShowWishlist((prev) => !prev);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlistItem,
        isInWishlist,
        clearWishlist,
        showWishlist,
        openWishlist,
        closeWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
