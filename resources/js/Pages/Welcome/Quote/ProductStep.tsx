import React, { useState, useEffect } from "react";
import { QuoteItem } from "./GetQuoteInstantly";

type Props = {
  productType: string;
  setProductType: (v: string) => void;
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
  productType,
  setProductType,
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

  /* RESET WHEN FORM OPENS */
  useEffect(() => {
    if (showProductForm) {
      setProductType("");
      setQuantity(0);
      setSizeCategory("");
      setSize("");
    }
  }, [showProductForm]);

  /* VALIDATION */
  const isValid =
    productType.trim() !== "" &&
    quantity > 0 &&
    sizeCategory.trim() !== "" &&
    size.trim() !== "";

  /* ================= PRODUCT FORM ================= */
  if (showProductForm) {
    return (
      <div className="bg-white px-4 md:px-0 pt-0 pb-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="w-fit">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              Select Product
            </h2>
            <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {/* PRODUCT */}
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
          >
            <option value="" disabled>
              Select Product
            </option>

            <optgroup label="CLOTHING">
              <option value="T Shirts">T Shirts</option>
              <option value="Long sleeve shirts">Long sleeve shirts</option>
              <option value="Polo tops">Polo tops</option>
              <option value="Trousers">Trousers</option>
              <option value="Jeans">Jeans</option>
              <option value="Joggers">Joggers</option>
              <option value="Shorts">Shorts</option>
              <option value="Hoodies">Hoodies</option>
              <option value="Jackets">Jackets</option>
              <option value="Quarter Zips">Quarter Zips</option>
              <option value="Tracksuit">Tracksuit</option>
              <option value="Nightwear">Nightwear</option>
            </optgroup>

            <optgroup label="SPORTS">
              <option value="Sports uniform">Sports uniform</option>
              <option value="Sports top">Sports top</option>
              <option value="Sports bottoms">Sports bottoms</option>
              <option value="Sports shorts">Sports shorts</option>
            </optgroup>

            <optgroup label="ACCESSORIES">
              <option value="Socks">Socks</option>
              <option value="Boxers">Boxers</option>
              <option value="Gloves">Gloves</option>
              <option value="Hats">Hats</option>
              <option value="Scarves">Scarves</option>
            </optgroup>

            <optgroup label="OTHER">
              <option value="Baby bibs">Baby bibs</option>
              <option value="Bears">Bears</option>
              <option value="Baby sets">Baby sets</option>
            </optgroup>
          </select>

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
            className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
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
            className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24D] disabled:bg-gray-100"
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
            if (!isValid) return; // 🚫 Prevent click if invalid
            setShowProductForm(false);
            onNext();
          }}
          className="w-full py-5 rounded-2xl text-white font-semibold tracking-wide transition-all duration-300"
          style={{
            backgroundColor: gold,
            opacity: isValid ? 1 : 0.6, // optional slight visual cue (still gold)
            cursor: isValid ? "pointer" : "not-allowed",
          }}
        >
          Add Product
        </button>
      </div>
    );
  }

  /* ================= QUOTE VIEW ================= */
  return (
    <div className="bg-white px-4 md:px-0 pt-4 pb-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="w-fit">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
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
              <p className="text-lg font-semibold text-gray-900">
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

      <div className="flex flex-col md:flex-row gap-5">
        <button
          onClick={() => setShowProductForm(true)}
          className="flex-1 py-5 rounded-2xl border-2 font-semibold tracking-wide transition-all duration-300 hover:bg-[#C9A24D] hover:text-white"
          style={{ borderColor: gold, color: gold }}
        >
          Add Another Item
        </button>

        <button
          onClick={onGetQuote}
          className="flex-1 py-5 rounded-2xl text-white font-semibold tracking-wide transition-all duration-300"
          style={{ backgroundColor: gold }}
        >
          Get Quote Price
        </button>
      </div>
    </div>
  );
}
