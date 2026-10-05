import React, { useState, useEffect } from "react";
import { QuoteItem } from "./GetQuoteInstantly";
import { catalogItemId, type QuoteCatalog, type QuoteCatalogItem } from "./quoteCatalog";

type Props = {
  catalog: QuoteCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
  productId: string;
  setProductId: (v: string) => void;
  selectedItem: QuoteCatalogItem | null;
  quantity: number;
  setQuantity: (v: number) => void;
  sizeCategory: string;
  setSizeCategory: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  onNext: () => void;
  onGetQuote: () => void;
  onRemoveItem: (index: number) => void;
  sizeOptions: Record<string, string[]>;
  items: QuoteItem[];
};

export default function ProductStep({
  catalog,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  productId,
  setProductId,
  selectedItem,
  quantity,
  setQuantity,
  sizeCategory,
  setSizeCategory,
  size,
  setSize,
  onNext,
  onGetQuote,
  onRemoveItem,
  sizeOptions,
  items,
}: Props) {
  const [showProductForm, setShowProductForm] = useState(items.length === 0);
  const gold = "#C9A24D";

  const groups = catalog?.groups ?? [];
  const catalogEmpty = !catalogLoading && !catalogError && groups.length === 0;

  /* RESET WHEN FORM OPENS */
  useEffect(() => {
    if (showProductForm) {
      setProductId("");
      setQuantity(0);
      setSizeCategory("");
      setSize("");
    }
  }, [showProductForm]);

  /* VALIDATION */
  const isValid =
    Boolean(selectedItem) &&
    quantity > 0 &&
    sizeCategory.trim() !== "" &&
    size.trim() !== "";

  const selectClass =
    "w-full rounded-xl border border-gray-200 px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24D] disabled:bg-gray-100";

  /* ================= PRODUCT FORM ================= */
  if (showProductForm) {
    return (
      <div className="bg-white px-3 sm:px-4 md:px-0 pt-0 pb-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="w-fit">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Select Product
            </h2>
            <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {/* PRODUCT (live categories from the admin dashboard) */}
          <div>
            {catalogLoading ? (
              <div
                className="h-[58px] w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                aria-busy="true"
                aria-label="Loading product categories"
              />
            ) : catalogError ? (
              <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <span>{catalogError}</span>
                <button
                  type="button"
                  onClick={onRetryCatalog}
                  className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            ) : catalogEmpty ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No product categories are set up yet. Please check back soon or speak to a print specialist.
              </div>
            ) : (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={selectClass}
                aria-label="Select product"
              >
                <option value="" disabled>
                  Select Product
                </option>

                {groups.length === 1
                  ? groups[0].items.map((item) => (
                      <option key={catalogItemId(item)} value={catalogItemId(item)}>
                        {item.label}
                      </option>
                    ))
                  : groups.map((group) => (
                      <optgroup key={group.key} label={group.label.toUpperCase()}>
                        {group.items.map((item) => (
                          <option key={catalogItemId(item)} value={catalogItemId(item)}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
              </select>
            )}

            {selectedItem ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                <span>{selectedItem.path}</span>
                {selectedItem.base_price !== null ? (
                  <span className="font-semibold" style={{ color: gold }}>
                    From £{selectedItem.base_price.toFixed(2)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {/* QUANTITY */}
          <input
            type="number"
            min={1}
            value={quantity === 0 ? "" : quantity}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0) setQuantity(val);
            }}
            placeholder="Quantity"
            className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
          />

          {/* SIZE CATEGORY */}
          <select
            value={sizeCategory}
            onChange={(e) => {
              setSizeCategory(e.target.value);
              setSize("");
            }}
            className={selectClass}
          >
            <option value="" disabled>
              Gender & Age Group
            </option>

            {Object.keys(sizeOptions).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* SIZE */}
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            disabled={!sizeCategory}
            className={selectClass}
          >
            <option value="" disabled>
              Size Group
            </option>

            {sizeCategory &&
              sizeOptions[sizeCategory].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>

        <button
          onClick={() => {
            if (!isValid || catalogEmpty) return;
            setShowProductForm(false);
            onNext();
          }}
          disabled={catalogEmpty}
          className="w-full py-3.5 sm:py-5 rounded-2xl text-sm sm:text-base text-white font-semibold tracking-wide transition-all duration-300"
          style={{
            backgroundColor: gold,
            opacity: isValid && !catalogEmpty ? 1 : 0.6,
            cursor: isValid && !catalogEmpty ? "pointer" : "not-allowed",
          }}
        >
          Add Product
        </button>
      </div>
    );
  }

  /* ================= QUOTE VIEW ================= */
  return (
    <div className="bg-white px-3 sm:px-4 md:px-0 pt-4 pb-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="w-fit">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Your Quote
          </h2>
          <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
        </div>
      </div>

      <div className="space-y-6 mb-14">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-gray-100 pb-6"
          >
            <div>
              <p className="text-base sm:text-lg font-semibold text-gray-900">
                {item.productGroup ? `${item.productGroup} → ` : ""}
                {item.productType}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {item.quantity} × {item.designType}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {item.sizeCategory} — {item.size}
              </p>
            </div>

            <button
              onClick={() => onRemoveItem(i)}
              className="text-sm font-semibold hover:opacity-70 transition-opacity"
              style={{ color: gold }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 sm:gap-5">
        <button
          onClick={() => setShowProductForm(true)}
          className="flex-1 py-3.5 sm:py-5 rounded-2xl border-2 text-sm sm:text-base font-semibold tracking-wide transition-all duration-300 hover:bg-[#C9A24D] hover:text-white"
          style={{ borderColor: gold, color: gold }}
        >
          Add Another Item
        </button>

        <button
          onClick={onGetQuote}
          className="flex-1 py-3.5 sm:py-5 rounded-2xl text-sm sm:text-base text-white font-semibold tracking-wide transition-all duration-300"
          style={{ backgroundColor: gold }}
        >
          Get Quote Price
        </button>
      </div>
    </div>
  );
}
