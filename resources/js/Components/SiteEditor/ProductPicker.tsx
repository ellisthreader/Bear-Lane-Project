import { router } from "@inertiajs/react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { openProductPicker, useProductPicker } from "./selection";

type ProductOption = {
  id: number;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  is_premade_design: boolean;
};

type FrontPage = {
  featured_product_ids: number[];
  premade_product_ids: number[];
};

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
const headers = { Accept: "application/json", "X-CSRF-TOKEN": csrf(), "X-Requested-With": "XMLHttpRequest" };

export default function ProductPicker() {
  const kind = useProductPicker();
  return kind ? createPortal(<Dialog kind={kind} onClose={() => openProductPicker(null)} />, document.body) : null;
}

function Dialog({ kind, onClose }: { kind: "featured" | "premade"; onClose: () => void }) {
  const isPremade = kind === "premade";
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/admin/homepage-editor/products", { headers: { ...headers, "X-CSRF-TOKEN": csrf() }, credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Could not load products."))))
      .then((data: { products: ProductOption[]; front_page: FrontPage }) => {
        if (cancelled) return;
        setProducts(data.products);
        setSelected((isPremade ? data.front_page.premade_product_ids : data.front_page.featured_product_ids).map(Number));
      })
      .catch((error: Error) => {
        toast.error(error.message);
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const byId = useMemo(() => new Map((products ?? []).map((product) => [product.id, product])), [products]);
  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (products ?? []).filter(
      (product) =>
        (!isPremade || product.is_premade_design) &&
        !selected.includes(product.id) &&
        (needle === "" || `${product.name} ${product.brand}`.toLowerCase().includes(needle)),
    );
  }, [products, selected, query, isPremade]);

  const move = (index: number, delta: -1 | 1) =>
    setSelected((ids) => {
      const target = index + delta;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const body = isPremade ? { premade_product_ids: selected } : { featured_product_ids: selected };
      const response = await fetch("/admin/other/homepage/products", {
        method: "PUT",
        credentials: "same-origin",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Could not save the products.");

      toast.success(isPremade ? "Pre-made designs updated." : "Featured products updated.");
      router.reload({ only: ["featuredProducts", "preMadeProducts"] });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the products.");
      setSaving(false);
    }
  };

  const row = "flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2";

  return (
    <div data-editor-ui className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-50 text-gray-900 shadow-2xl" role="dialog" aria-label={isPremade ? "Choose pre-made designs" : "Choose featured products"}>
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{isPremade ? "Choose pre-made designs" : "Choose featured products"}</h2>
            <p className="text-xs text-gray-500">Shown on the homepage in this order. This saves straight away.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {products === null ? (
            <p className="py-10 text-center text-sm text-gray-500">Loading products…</p>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">On the homepage ({selected.length})</h3>
                {selected.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">Nothing chosen yet. Add products from the list below.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.map((id, index) => {
                      const product = byId.get(id);
                      return (
                        <li key={id} className={row}>
                          <img src={product?.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product?.name ?? `Product #${id}`}</p>
                            <p className="text-xs text-gray-500">£{(product?.price ?? 0).toFixed(2)}</p>
                          </div>
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setSelected((ids) => ids.filter((item) => item !== id))} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{isPremade ? "Pre-made designs you can add" : "All products"}</h3>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or brand"
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {available.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">{isPremade && (products ?? []).every((product) => !product.is_premade_design) ? "No products are marked as pre-made designs yet." : "No more products match."}</p>
                ) : (
                  <ul className="space-y-2">
                    {available.slice(0, 60).map((product) => (
                      <li key={product.id} className={row}>
                        <img src={product.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {product.brand ? `${product.brand} · ` : ""}£{product.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected((ids) => (ids.length >= 30 ? ids : [...ids, product.id]))}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || products === null}
            className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save products"}
          </button>
        </footer>
      </div>
    </div>
  );
}
