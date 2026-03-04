"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { PricePreviewSnapshot } from "@/Pages/Design/Canvas/Canvas";
import { normalizeDesignType, type DesignType } from "@/Utils/designType";

type PricePreviewByView = Partial<Record<"front" | "back" | "leftSleeve" | "rightSleeve", PricePreviewSnapshot>>;

export type CartItem = {
  slug: string;
  title: string;
  price: number;
  quantity: number;
  colour: string;
  size: string;
  designType: DesignType;
  image?: string;
  availableSizes: string[]; // sizes user can choose
  previewSnapshot?: PricePreviewSnapshot;
  previewByView?: PricePreviewByView;
};

export type AddToCartPayload = {
  slug: string;
  title: string;
  price: number | string;
  colour: string;
  size: string;
  designType?: DesignType | string | null;
  image?: string;
  availableSizes?: string[];
  quantity?: number;
  previewSnapshot?: PricePreviewSnapshot;
  previewByView?: PricePreviewByView;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: AddToCartPayload) => void;
  updateQuantity: (slug: string, colour: string, size: string, quantity: number, designType?: DesignType | string | null) => void;
  removeFromCart: (slug: string, colour: string, size: string, designType?: DesignType | string | null) => void;
  updateSize: (slug: string, colour: string, oldSize: string, newSize: string, designType?: DesignType | string | null) => void;
  clearCart: () => void;
  totalPrice: number;
  showCart: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = "bearlane_cart_v1";

const normalizePrice = (p: number | string) => {
  if (typeof p === "number") return p;
  if (typeof p === "string") return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
  return 0;
};

const toIdentityKey = (
  slug: string,
  colour: string,
  size: string,
  designType: DesignType | string | null | undefined
) => `${slug}__${colour}__${size}__${normalizeDesignType(designType)}`;

const sanitizeCart = (value: unknown): CartItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .filter((entry) => {
      return (
        typeof entry.slug === "string"
        && typeof entry.title === "string"
        && typeof entry.colour === "string"
        && typeof entry.size === "string"
      );
    })
    .map((entry) => {
      const nextQuantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
      const nextAvailableSizes = Array.isArray(entry.availableSizes)
        ? entry.availableSizes.filter((size): size is string => typeof size === "string")
        : [];

      return {
        ...(entry as CartItem),
        price: normalizePrice(entry.price as number | string),
        quantity: nextQuantity,
        designType: normalizeDesignType(entry.designType),
        availableSizes: nextAvailableSizes.length ? nextAvailableSizes : [String(entry.size)],
      };
    });
};

const safeJSONStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === "function" || typeof currentValue === "symbol") {
      return undefined;
    }
    if (currentValue && typeof currentValue === "object") {
      const objectValue = currentValue as object;
      if (seen.has(objectValue)) {
        return undefined;
      }
      seen.add(objectValue);
    }
    return currentValue;
  });
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      return sanitizeCart(JSON.parse(raw));
    } catch {
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, safeJSONStringify(cart));
    } catch {
      // Keep runtime cart state even if persistence fails (e.g. storage limits).
    }
  }, [cart]);

  const addToCart = (item: AddToCartPayload) => {
    const price = normalizePrice(item.price);
    const availableSizes = item.availableSizes || [item.size];
    const quantityToAdd = Math.max(1, Math.floor(item.quantity ?? 1));
    const designType = normalizeDesignType(item.designType);
    const itemKey = toIdentityKey(item.slug, item.colour, item.size, designType);

    setCart((prev) => {
      const existing = prev.find(
        (i) => toIdentityKey(i.slug, i.colour, i.size, i.designType) === itemKey
      );
      if (existing) {
        return prev.map((i) =>
          toIdentityKey(i.slug, i.colour, i.size, i.designType) === itemKey
            ? { ...i, quantity: i.quantity + quantityToAdd }
            : i
        );
      }
      return [...prev, { ...item, designType, price, quantity: quantityToAdd, availableSizes }];
    });
    openCart();
  };

  const updateQuantity = (
    slug: string,
    colour: string,
    size: string,
    quantity: number,
    designType?: DesignType | string | null
  ) => {
    const targetKey = toIdentityKey(slug, colour, size, designType);
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => toIdentityKey(i.slug, i.colour, i.size, i.designType) !== targetKey)
        : prev.map((i) =>
            toIdentityKey(i.slug, i.colour, i.size, i.designType) === targetKey ? { ...i, quantity } : i
          )
    );
  };

  const removeFromCart = (slug: string, colour: string, size: string, designType?: DesignType | string | null) => {
    const targetKey = toIdentityKey(slug, colour, size, designType);
    setCart((prev) =>
      prev.filter((i) => toIdentityKey(i.slug, i.colour, i.size, i.designType) !== targetKey)
    );
  };

  const updateSize = (
    slug: string,
    colour: string,
    oldSize: string,
    newSize: string,
    designType?: DesignType | string | null
  ) => {
    const normalizedDesignType = normalizeDesignType(designType);
    const oldKey = toIdentityKey(slug, colour, oldSize, normalizedDesignType);
    const newKey = toIdentityKey(slug, colour, newSize, normalizedDesignType);

    setCart((prev) => {
      const exists = prev.find(
        (i) => toIdentityKey(i.slug, i.colour, i.size, i.designType) === newKey
      );
      if (exists) {
        // merge quantities if new size already exists
        return prev
          .map((i) =>
            toIdentityKey(i.slug, i.colour, i.size, i.designType) === oldKey
              ? { ...i, quantity: 0 } // will remove later
              : i
          )
          .filter((i) => i.quantity > 0)
          .map((i) =>
            toIdentityKey(i.slug, i.colour, i.size, i.designType) === newKey
              ? { ...i, quantity: i.quantity + prev.find((x) => toIdentityKey(x.slug, x.colour, x.size, x.designType) === oldKey)?.quantity! }
              : i
          );
      } else {
        return prev.map((i) =>
          toIdentityKey(i.slug, i.colour, i.size, i.designType) === oldKey
            ? { ...i, size: newSize }
            : i
        );
      }
    });
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const openCart = () => setShowCart(true);
  const closeCart = () => setShowCart(false);
  const toggleCart = () => setShowCart((prev) => !prev);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        updateSize,
        clearCart,
        totalPrice,
        showCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
