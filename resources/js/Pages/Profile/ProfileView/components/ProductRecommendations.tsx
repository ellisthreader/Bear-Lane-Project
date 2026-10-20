import React from "react";
import { Heart } from "lucide-react";
import { useProfileViewContext } from "../ProfileViewContext";
import type { RecommendedProduct } from "../types";
import { useWishlist } from "@/Context/WishlistContext";
import ProductBadgeChips from "@/Components/Product/ProductBadgeChips";

function ProductCard({ product }: { product: RecommendedProduct }) {
  const { toggleWishlistItem, isInWishlist } = useWishlist();
  const wishlistId = String(product.id);
  const inWishlist = isInWishlist(wishlistId);
  const isPreMade = Boolean(product.is_premade_design);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8DAB8] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-44 w-full bg-[#FBF7EE]">
        {product.image ? (
          <img loading="lazy" decoding="async" src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#8B7E61]">No image</div>
        )}
        <ProductBadgeChips
          badges={product.auto_badges}
          isPreMade={isPreMade}
          className="absolute left-2 top-2"
        />
        <button
          type="button"
          onClick={() =>
            toggleWishlistItem({
              id: wishlistId,
              name: product.name,
              brand: product.brand,
              price: product.price,
              image: product.image,
            })
          }
          className="absolute right-2 top-2 rounded-full border border-[#E3D3AC] bg-white/95 p-2 text-[#8A6D2B] shadow-sm transition hover:bg-[#FFF8E8]"
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9B8862]">{product.brand || "Product"}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#322A18]">{product.name}</p>
        {typeof product.price === "number" && <p className="mt-2 text-sm font-medium text-[#8A6D2B]">£{product.price.toFixed(2)}</p>}
      </div>
    </div>
  );
}

export default function ProductRecommendations() {
  const { productPanelTab, setProductPanelTab, recommendedProducts, wishlistProducts } = useProfileViewContext();
  const isWishlistView = productPanelTab === "wishlist";
  const visibleProducts = productPanelTab === "recommended" ? recommendedProducts : wishlistProducts;

  return (
    <section className="rounded-3xl border border-[#E2D2A8] bg-white p-6 shadow-sm md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#251E11]">
          {isWishlistView ? "Wishlist" : "Products For You"}
        </h2>
        <div className="rounded-lg border border-[#E4D3A8] bg-[#FFFDF7] p-1">
          <button
            type="button"
            onClick={() => setProductPanelTab("recommended")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              productPanelTab === "recommended" ? "bg-[#C6A75E] text-white" : "text-[#7D6A3C]"
            }`}
          >
            Products For You
          </button>
          <button
            type="button"
            onClick={() => setProductPanelTab("wishlist")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              productPanelTab === "wishlist" ? "bg-[#C6A75E] text-white" : "text-[#7D6A3C]"
            }`}
          >
            Wishlist
          </button>
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E6D7B0] bg-[#FFFDF8] px-4 py-14 text-center text-sm text-[#8A7B5A]">
          {productPanelTab === "recommended" ? "No recommendations available yet." : "Your wishlist is empty."}
        </div>
      ) : (
        <div>
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:hidden">
            {visibleProducts.map((product) => (
              <div key={product.id} className="w-[78%] max-w-[240px] shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
