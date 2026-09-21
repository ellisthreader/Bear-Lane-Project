import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProductStep from "./ProductStep";
import PrintStep from "./PrintStep";
import ContactStep from "./ContactStep";
import SpeakToPrintSpecialist from "./SpeakToPrintSpecialist";
import {
  estimateLinePrice,
  fetchQuoteCatalog,
  findCatalogItem,
  type QuoteCatalog,
  type QuoteCatalogItem,
} from "./quoteCatalog";

/* ================= TYPES ================= */
export type QuoteItem = {
  productType: string;
  productGroup: string;
  productKey: string;
  quantity: number;
  designType: string;
  sizeCategory: string;
  size: string;
  unitPrice: number;
  price: number;
};

/* ================= CONSTANTS ================= */
export const sizeOptions: Record<string, string[]> = {
  Women: ["XS", "S", "M", "L", "XL", "XXL"],
  Men: ["XS", "S", "M", "L", "XL", "XXL"],
  Junior: ["13-15 YRS", "12-13 YRS", "10-12 YRS", "8-10 YRS", "7-8 YRS"],
  Children: ["6-7 YRS", "5-6 YRS", "4-5 YRS", "3-4 YRS", "2-3 YRS"],
  Infants: ["Baby & Newborn", "3-6M", "6-9M", "9-12M", "12-18M"],
};

/* ================= PRICE LOGIC ================= */
export const calculatePrice = (
  item: QuoteCatalogItem | null,
  quantity: number,
  designType: string,
  size: string
) => estimateLinePrice({ basePrice: item?.base_price ?? null, quantity, designType, size });

/* ================= MAIN ================= */
type GetQuoteInstantlyProps = {
  embedded?: boolean;
};

export default function GetQuoteInstantly({ embedded = false }: GetQuoteInstantlyProps) {
  const [activeTab, setActiveTab] = useState<"instant" | "specialist">("instant");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected product is the composite catalogue id ("group::key"), never a hard-coded name.
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [designType, setDesignType] = useState("Logo");
  const [sizeCategory, setSizeCategory] = useState("Women");
  const [size, setSize] = useState("XS");

  const [items, setItems] = useState<QuoteItem[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [catalog, setCatalog] = useState<QuoteCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const total = useMemo(() => Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100, [items]);
  const selectedItem = useMemo(() => findCatalogItem(catalog, productId), [catalog, productId]);

  const loadCatalog = useCallback(async (silent = false) => {
    if (!silent) {
      setCatalogLoading(true);
      setCatalogError(null);
    }
    try {
      const next = await fetchQuoteCatalog();
      setCatalog(next);
      setCatalogError(null);
    } catch (error) {
      if (!silent) {
        setCatalogError(error instanceof Error ? error.message : "Unable to load product categories.");
      }
    } finally {
      if (!silent) setCatalogLoading(false);
    }
  }, []);

  // Load once, then refresh whenever the tab regains focus so admin changes appear without a reload.
  useEffect(() => {
    void loadCatalog(false);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadCatalog(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [loadCatalog]);

  // If the admin removed the category currently selected, clear it so it cannot be quoted.
  useEffect(() => {
    if (catalog && productId && !findCatalogItem(catalog, productId)) {
      setProductId("");
    }
  }, [catalog, productId]);

  const initialInvoiceReference = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("invoice_ref") || "";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("quote_tab");
    if (tab === "specialist" || tab === "artist") {
      setActiveTab("specialist");
      const target = document.getElementById("get-quote-instantly");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  const addItem = () => {
    if (!selectedItem) return;

    const price = calculatePrice(selectedItem, quantity, designType, size);
    const unitPrice = calculatePrice(selectedItem, 1, designType, size);

    setItems((prev) => [
      ...prev,
      {
        productType: selectedItem.label,
        productGroup: selectedItem.group,
        productKey: selectedItem.key,
        quantity,
        designType,
        sizeCategory,
        size,
        unitPrice,
        price,
      },
    ]);

    setStep(1);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      id="get-quote-instantly"
      className={`bg-white px-3 sm:px-6 ${embedded ? "py-4 sm:py-6" : "min-h-screen py-10 sm:py-16"}`}
    >
      <div className="max-w-5xl mx-auto">

        {/* ===== Main Card ===== */}
        <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10">

          {/* ===== Tabs ===== */}
          <div className="flex justify-center mb-6 sm:mb-10 md:mb-12">
            <div className="grid w-full max-w-2xl grid-cols-2 gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">

              <button
                onClick={() => setActiveTab("instant")}
                className={`rounded-xl px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-300 sm:px-6 sm:py-3 sm:text-sm ${
                  activeTab === "instant"
                    ? "bg-[#C6A75E] text-white shadow-md"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Get Quote Instantly
              </button>

              <button
                onClick={() => setActiveTab("specialist")}
                className={`rounded-xl px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-300 sm:px-6 sm:py-3 sm:text-sm ${
                  activeTab === "specialist"
                    ? "bg-[#C6A75E] text-white shadow-md"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Speak to a Print Specialist
              </button>

            </div>
          </div>

          {/* ===== Tab Content ===== */}
          {activeTab === "instant" && (
            <>
              {step === 1 && (
                <ProductStep
                  catalog={catalog}
                  catalogLoading={catalogLoading}
                  catalogError={catalogError}
                  onRetryCatalog={() => void loadCatalog(false)}
                  productId={productId}
                  setProductId={setProductId}
                  selectedItem={selectedItem}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  sizeCategory={sizeCategory}
                  setSizeCategory={setSizeCategory}
                  size={size}
                  setSize={setSize}
                  sizeOptions={sizeOptions}
                  items={items}
                  onNext={() => setStep(2)}
                  onGetQuote={() => setStep(3)}
                  onRemoveItem={removeItem}
                />
              )}

              {step === 2 && (
                <PrintStep
                  designType={designType}
                  setDesignType={setDesignType}
                  onBack={() => setStep(1)}
                  onAdd={addItem}
                />
              )}

              {step === 3 && (
                <ContactStep
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  items={items}
                  total={total}
                />
              )}
            </>
          )}

          {activeTab === "specialist" && <SpeakToPrintSpecialist initialInvoiceReference={initialInvoiceReference} />}
        </div>
      </div>
    </div>
  );
}
