"use client";

import { CartProvider } from "@/Context/CartContext";
import Design from "@/Pages/Design/Design";

export default function ClientWrapper() {
  return (
    <CartProvider>
      <Design />
    </CartProvider>
  );
}
