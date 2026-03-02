"use client";

import React, { useEffect } from "react";
import { Link, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "@/Context/CartContext";
import { useWishlist } from "@/Context/WishlistContext";

export default function WishlistSidebar() {
  const { addToCart, openCart } = useCart();
  const { wishlist, showWishlist, toggleWishlist, closeWishlist, removeFromWishlist } = useWishlist();

  useEffect(() => {
    document.body.style.overflow = showWishlist ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showWishlist]);

  const handleMoveToCart = (item: (typeof wishlist)[number]) => {
    addToCart({
      slug: item.slug || item.id,
      title: item.name,
      price: item.price || 0,
      colour: "Default",
      size: "Default",
      image: item.image || undefined,
      availableSizes: ["Default"],
      quantity: 1,
    });
    closeWishlist();
    openCart();
  };

  return (
    <AnimatePresence>
      {showWishlist && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={toggleWishlist}
            className="fixed inset-0 bg-black z-50"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0.85, scale: 0.985 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: "100%", opacity: 0.9, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.9 }}
            className="fixed top-0 right-0 h-full w-[30rem] shadow-2xl z-50 bg-[#FAFAF7] text-gray-900 flex flex-col border-l border-[#C6A75E]/25"
          >
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06, duration: 0.28 }}
              className="flex justify-between items-center px-5 py-4 border-b border-[#C6A75E]/25 bg-gradient-to-r from-[#F8F3E6] via-[#FCFAF2] to-white"
            >
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-[#8A6D2B]" />
                <h2 className="text-lg font-semibold tracking-tight">Your Wishlist</h2>
              </div>
              <button onClick={toggleWishlist} className="rounded-full p-1.5 hover:bg-gray-200/70 transition">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </motion.div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {wishlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DCC89D] bg-white p-6 text-center">
                  <p className="text-sm text-[#7D6B44]">Your wishlist is empty.</p>
                  <button
                    type="button"
                    onClick={() => {
                      toggleWishlist();
                      router.get("/");
                    }}
                    className="mt-3 rounded-lg border border-[#D7BE84] bg-[#FFF9EA] px-3 py-1.5 text-sm font-medium text-[#7B6530]"
                  >
                    Continue shopping
                  </button>
                </div>
              ) : (
                wishlist.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No image</div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#9B8862]">{item.brand || "Product"}</p>
                      <p className="mt-1 text-sm font-semibold text-[#2A2314] line-clamp-2">{item.name}</p>
                      {typeof item.price === "number" && <p className="mt-1 text-sm font-medium text-[#8A6D2B]">£{item.price.toFixed(2)}</p>}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#C6A75E] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#B3934C]"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Add to cart
                        </button>
                        {item.slug && (
                          <Link
                            href={`/product/${encodeURIComponent(item.slug)}`}
                            className="inline-flex items-center rounded-md border border-[#D7BE84] px-2.5 py-1.5 text-xs font-medium text-[#7B6530] hover:bg-[#FFF9EA]"
                            onClick={toggleWishlist}
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#C6A75E]/20 bg-white">
              <button
                onClick={toggleWishlist}
                className="w-full py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
