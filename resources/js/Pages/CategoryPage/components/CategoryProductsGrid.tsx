import { Link, router } from "@inertiajs/react";
import { Heart, Star } from "lucide-react";
import { toast } from "react-toastify";
import { useWishlist } from "@/Context/WishlistContext";
import { useCategoryFilters } from "../context/CategoryFiltersContext";
import { getNumericPrice, getProductImage, getProductRating, getProductReviewCount } from "../utils";
import { useState } from "react";

type Props = {
  productEditMode?: boolean;
  categoryId?: number | null;
  categorySlug?: string;
};

const getSecondaryImage = (
  image?: string | { url?: string; path?: string }
): string | null => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.url || image.path || null;
};

export default function CategoryProductsGrid({ productEditMode = false, categoryId = null, categorySlug = "" }: Props) {
  const { filteredProducts } = useCategoryFilters();
  const { toggleWishlistItem, isInWishlist, openWishlist } = useWishlist();
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

  const handleDeleteCard = async (productId: number) => {
    if (!categoryId) {
      toast.error("Category context is missing.");
      return;
    }

    if (!window.confirm("Delete this product card from this category page?")) {
      return;
    }

    setDeletingProductId(productId);
    try {
      const response = await fetch(`/admin/categories/${categoryId}/products/${productId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to remove product card.");
      }

      toast.success("Product card deleted from this page.");
      router.reload({ only: ["products"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove product card.");
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
      {productEditMode ? (
        <Link
          href={
            categoryId
              ? `/admin/products/create-layout?category_id=${categoryId}&category_slug=${encodeURIComponent(categorySlug)}`
              : "#"
          }
          className="group flex min-h-[390px] min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C8951E] bg-[#FFF8E8] p-4 text-center transition hover:bg-[#FFF3D6]"
        >
          <span className="text-3xl font-bold leading-none text-[#8A5F00]">+</span>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8A5F00]">Admin</p>
          <p className="mt-1 text-sm font-semibold text-[#2A241B]">Add Product Card</p>
          <p className="mt-1 text-xs text-[#6B5A34]">Open product layout creator</p>
        </Link>
      ) : null}

      {filteredProducts.map((product) => {
        const rating = getProductRating(product, 0);
        const reviewCount = getProductReviewCount(product);
        const image = getProductImage(product);
        const hoverImage = getSecondaryImage(product.images?.[1]) || image;
        const price = getNumericPrice(product.price);
        const originalPrice = getNumericPrice(product.original_price ?? null);
        const onSale = originalPrice > 0 && originalPrice > price;
        const wishlistId = String(product.id);
        const inWishlist = isInWishlist(wishlistId);

        return (
          <Link
            key={product.id}
            href={`/product/${encodeURIComponent(product.slug)}`}
            className="group relative min-w-0 overflow-hidden rounded-xl border border-transparent bg-white shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-[#D1D5DB] hover:shadow-lg"
          >
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleWishlistItem({
                  id: wishlistId,
                  name: product.name,
                  brand: product.brand ?? null,
                  price: product.price ?? null,
                  image,
                  slug: product.slug,
                });
                openWishlist();
              }}
              className="absolute right-2 top-2 z-10 rounded-full border border-[#D1D5DB] bg-white/95 p-1.5 text-[#6B7280] shadow-sm transition hover:bg-white"
              aria-label={
                inWishlist ? "Remove from wishlist and open wishlist" : "Add to wishlist and open wishlist"
              }
            >
              <Heart className={`h-4 w-4 ${inWishlist ? "fill-current text-[#EF4444]" : ""}`} />
            </button>

            {productEditMode ? (
              <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    router.get(`/product/${encodeURIComponent(product.slug)}?product_mode=1`);
                  }}
                  className="rounded-md border border-[#D7BE84] bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6A541F]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteCard(Number(product.id));
                  }}
                  disabled={deletingProductId === Number(product.id)}
                  className="rounded-md border border-[#E3B9B9] bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8C3232]"
                >
                  {deletingProductId === Number(product.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            ) : null}

            <div className="relative h-[280px] w-full overflow-hidden bg-[#E5E7EB] p-3">
              <img
                src={image}
                alt={product.name}
                className="h-full w-full object-contain transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
              />
              <img
                src={hoverImage}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain p-3 opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
            </div>

            <div className="space-y-2 p-3">
              <h3 className="line-clamp-2 text-xs font-bold text-[#2A241B]">{product.name}</h3>

              <div className="flex items-center gap-1 text-[#C8951E]">
                {Array.from({ length: 5 }).map((_, index) => {
                  const active = index + 1 <= Math.round(rating);
                  return (
                    <Star
                      key={`${product.id}-star-${index}`}
                      className={`h-3 w-3 ${active ? "fill-current" : "text-[#E1D6BE]"}`}
                    />
                  );
                })}
                <span className="ml-1 text-[11px] font-medium text-[#796949]">{rating.toFixed(1)}</span>
                <span className="text-[11px] text-[#9A8B6A]">({reviewCount.toLocaleString()})</span>
              </div>

              <div className="flex items-baseline gap-2">
                <p className={`text-sm font-semibold ${onSale ? "text-[#B42318]" : "text-[#1E1A14]"}`}>£{price.toFixed(2)}</p>
                {onSale ? <p className="text-xs text-[#9B8B6A] line-through">£{originalPrice.toFixed(2)}</p> : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
