import React, { useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { Check, LayoutPanelTop, Plus, Save, Search, Sparkles, Star, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type FrontPageSettings = {
  featured_product_ids: number[];
  premade_product_ids: number[];
};

type ProductOption = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: number;
  image_url: string;
};

type Props = {
  frontPage: FrontPageSettings;
  products: ProductOption[];
};

export default function FrontPage({ frontPage, products }: Props) {
  const [featuredIds, setFeaturedIds] = useState<number[]>(frontPage.featured_product_ids || []);
  const [premadeIds, setPremadeIds] = useState<number[]>(frontPage.premade_product_ids || []);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<number, ProductOption>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const featuredProducts = useMemo(
    () => featuredIds.map((id) => productMap.get(id)).filter(Boolean) as ProductOption[],
    [featuredIds, productMap]
  );
  const premadeProducts = useMemo(
    () => premadeIds.map((id) => productMap.get(id)).filter(Boolean) as ProductOption[],
    [premadeIds, productMap]
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) => {
      const searchable = `${product.name} ${product.brand} ${product.slug}`.toLowerCase();
      return searchable.includes(normalized);
    });
  }, [products, query]);

  const addToFeatured = (productId: number) => {
    setMessage(null);
    setError(null);
    setFeaturedIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setPremadeIds((prev) => prev.filter((id) => id !== productId));
  };

  const addToPremade = (productId: number) => {
    setMessage(null);
    setError(null);
    setPremadeIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setFeaturedIds((prev) => prev.filter((id) => id !== productId));
  };

  const removeFromFeatured = (productId: number) => {
    setFeaturedIds((prev) => prev.filter((id) => id !== productId));
  };

  const removeFromPremade = (productId: number) => {
    setPremadeIds((prev) => prev.filter((id) => id !== productId));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
      const response = await fetch("/admin/other/front-page", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify({
          featured_product_ids: featuredIds,
          premade_product_ids: premadeIds,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message ||
            (typeof data?.errors === "object" ? Object.values(data.errors).flat().join(" ") : "") ||
            "Unable to save front page selections."
        );
      }

      const nextFeatured = Array.isArray(data?.front_page?.featured_product_ids)
        ? data.front_page.featured_product_ids.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
        : featuredIds;
      const nextPremade = Array.isArray(data?.front_page?.premade_product_ids)
        ? data.front_page.premade_product_ids.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
        : premadeIds;

      setFeaturedIds(nextFeatured);
      setPremadeIds(nextPremade);
      setMessage(data?.message || "Front page product selections updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save front page selections.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Front Page" />
      <AdminTopNav />

      <div className="min-h-screen bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-6 shadow-[0_18px_46px_rgba(91,70,27,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Other / Front Page</p>
                <h1 className="mt-1 text-3xl font-bold">Front Page Product Cards</h1>
                <p className="mt-2 text-sm text-[#6B5A34]">
                  Choose which products appear in <span className="font-semibold">Featured Products</span> and{" "}
                  <span className="font-semibold">Pre-Made Designs</span> on the homepage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/other"
                  className="inline-flex h-10 items-center rounded-xl border border-[#DCCEA9] bg-white px-3 text-sm font-semibold text-[#6B5A34]"
                >
                  Back to Other
                </Link>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#C6A75E] px-4 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
            {message ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#D1B46F] bg-[#FFF3D6] px-3 py-2 text-sm font-semibold text-[#6A541F]">
                <Check className="h-4 w-4" />
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-xl border border-[#F2C5BD] bg-[#FFF3F0] px-3 py-2 text-sm font-semibold text-[#A63D2F]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#E4D2AA] bg-white/95 p-4 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                  <Star className="h-4 w-4 text-[#8A6D2B]" />
                  Featured Products
                </h2>
                <span className="text-xs font-semibold text-[#8A6D2B]">{featuredProducts.length} selected</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {featuredProducts.length === 0 ? (
                  <p className="col-span-full rounded-xl border border-dashed border-[#E3D8BE] bg-[#FFFCF4] px-3 py-4 text-sm text-[#6B5A34]">
                    No products selected yet.
                  </p>
                ) : (
                  featuredProducts.map((product) => (
                    <div key={`featured-${product.id}`} className="rounded-xl border border-[#E8DEC8] bg-[#FFFDF8] p-2">
                      <img src={product.image_url} alt={product.name} className="h-28 w-full rounded-lg object-cover" />
                      <p className="mt-2 truncate text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-[#6B5A34]">£{Number(product.price).toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromFeatured(product.id)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#E3CF9D] bg-white px-2 py-1 text-xs font-semibold text-[#6B5A34]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4D2AA] bg-white/95 p-4 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-4 w-4 text-[#8A6D2B]" />
                  Pre-Made Designs
                </h2>
                <span className="text-xs font-semibold text-[#8A6D2B]">{premadeProducts.length} selected</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {premadeProducts.length === 0 ? (
                  <p className="col-span-full rounded-xl border border-dashed border-[#E3D8BE] bg-[#FFFCF4] px-3 py-4 text-sm text-[#6B5A34]">
                    No products selected yet.
                  </p>
                ) : (
                  premadeProducts.map((product) => (
                    <div key={`premade-${product.id}`} className="rounded-xl border border-[#E8DEC8] bg-[#FFFDF8] p-2">
                      <img src={product.image_url} alt={product.name} className="h-28 w-full rounded-lg object-cover" />
                      <p className="mt-2 truncate text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-[#6B5A34]">£{Number(product.price).toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromPremade(product.id)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#E3CF9D] bg-white px-2 py-1 text-xs font-semibold text-[#6B5A34]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#E4D2AA] bg-white/95 p-4 shadow-[0_10px_30px_rgba(91,70,27,0.08)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                <LayoutPanelTop className="h-5 w-5 text-[#8A6D2B]" />
                Product Card Library
              </h2>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-xl border border-[#E2CF9B] bg-[#FFFDF7] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C9A24D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const inFeatured = featuredIds.includes(product.id);
                const inPremade = premadeIds.includes(product.id);

                return (
                  <div key={product.id} className="rounded-xl border border-[#E8DEC8] bg-[#FFFDF8] p-2.5">
                    <img src={product.image_url} alt={product.name} className="h-36 w-full rounded-lg object-cover" />
                    <p className="mt-2 truncate text-sm font-semibold text-[#2D2515]">{product.name}</p>
                    <p className="text-xs text-[#6B5A34]">{product.brand || "Bear Lane"} • £{Number(product.price).toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addToFeatured(product.id)}
                        className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                          inFeatured ? "bg-[#D8BF87] text-white" : "border border-[#D7C494] bg-white text-[#6B5A34]"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Featured
                      </button>
                      <button
                        type="button"
                        onClick={() => addToPremade(product.id)}
                        className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${
                          inPremade ? "bg-[#C6A75E] text-white" : "border border-[#D7C494] bg-white text-[#6B5A34]"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Pre-Made
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
