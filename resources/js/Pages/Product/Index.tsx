import React from "react";
import { Link } from "@inertiajs/react";

interface Product {
  id: number;
  brand: string;
  name: string;
  slug: string | { slug?: string; value?: string }; // handles object slugs safely
  price: number | string;
  original_price?: number | string | null;
  images: Record<string, string[]> | string[];
}

interface Props {
  type: string;
  products: Product[];
}

export default function ProductsIndex({ type, products }: Props) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-4xl">{type}</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
        {products.map((product) => {
          // ------------------------------
          // 🔹 SAFELY HANDLE SLUG
          // ------------------------------
          const slug =
            typeof product.slug === "string"
              ? product.slug
              : product.slug?.slug || product.slug?.value || String(product.slug);

          const href = `/product/${encodeURIComponent(slug)}`;

          // ------------------------------
          // 🔹 GET FIRST IMAGE
          // ------------------------------
          let firstImage = "";

          if (Array.isArray(product.images)) {
            firstImage = product.images[0];
          } else {
            const firstColour = Object.keys(product.images)[0];
            firstImage = product.images[firstColour]?.[0];
          }

          if (!firstImage) {
            firstImage = "https://via.placeholder.com/400x500?text=No+Image";
          }

          // ------------------------------
          // 🔹 PRICES
          // ------------------------------
          const price = Number(product.price ?? 0);
          const originalPrice =
            product.original_price !== null && product.original_price !== undefined
              ? Number(product.original_price)
              : null;

          return (
            <Link
              href={href}
              key={product.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden"
            >
              {/* IMAGE */}
              <img loading="lazy" decoding="async"
                src={firstImage}
                alt={product.name}
                className="h-44 w-full object-cover sm:h-56 lg:h-64"
              />

              {/* CONTENT */}
              <div className="p-4">
                <p className="font-bold text-gray-800">{product.brand}</p>
                <p className="text-gray-700">{product.name}</p>

                <p className="mt-2 font-semibold">
                  £{price.toFixed(2)}
                  {originalPrice !== null && (
                    <span className="text-gray-400 line-through ml-2">
                      £{originalPrice.toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
