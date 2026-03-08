import React, { useEffect, useMemo, useState } from "react";
import ProductStep from "./ProductStep";
import EmbroideryStep from "./EmbroideryStep";
import ContactStep from "./ContactStep";
import SpeakToArtist from "./SpeakToArtist";

/* ================= TYPES ================= */
export type QuoteItem = {
  productType: string;
  quantity: number;
  designType: string;
  sizeCategory: string;
  size: string;
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
  productType: string,
  quantity: number,
  designType: string,
  size: string
) => {
  let basePrice = 0;

  const clothingBase: Record<string, number> = {
    "T Shirts": 10,
    "Long sleeve shirts": 12,
    "Polo tops": 14,
    Trousers: 15,
    Jeans: 18,
    Joggers: 12,
    Shorts: 10,
    Hoodies: 20,
    Jackets: 30,
    "Quater Zips": 28,
    Nightwear: 15,
    Tracksuit: 40,
  };

  const sportsBase: Record<string, number> = {
    "Sports uniform": 25,
    "Sports top": 12,
    "Sports bottoms": 12,
    "Sports shorts": 10,
  };

  const accessoriesBase: Record<string, number> = {
    Socks: 5,
    Gloves: 8,
    Hats: 8,
    Scarves: 7,
    Boxers: 6,
  };

  const otherBase: Record<string, number> = {
    "Baby bibs": 5,
    Bears: 12,
    "Baby sets": 20,
  };

  basePrice =
    clothingBase[productType] ||
    sportsBase[productType] ||
    accessoriesBase[productType] ||
    otherBase[productType] ||
    10;

  if (designType === "Custom Design") basePrice *= 1.2;
  if (designType === "Complex Pattern") basePrice *= 1.5;
  if (designType === "Text") basePrice *= 0.8;
  if (designType === "Image") basePrice *= 1.3;

  if (size.includes("XS") || size.includes("2-3") || size.includes("BABY"))
    basePrice *= 1;
  else if (size.includes("S")) basePrice *= 1.05;
  else if (size.includes("M")) basePrice *= 1.1;
  else if (size.includes("L") || size.includes("XL")) basePrice *= 1.2;
  else if (size.includes("XXL") || size.includes("12-18M"))
    basePrice *= 1.3;

  return Math.round(basePrice * quantity);
};

/* ================= MAIN ================= */
type GetQuoteInstantlyProps = {
  embedded?: boolean;
};

export default function GetQuoteInstantly({ embedded = false }: GetQuoteInstantlyProps) {
  const [activeTab, setActiveTab] = useState<"instant" | "artist">("instant");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [productType, setProductType] = useState("T Shirts");
  const [quantity, setQuantity] = useState(1);
  const [designType, setDesignType] = useState("Logo");
  const [sizeCategory, setSizeCategory] = useState("Women");
  const [size, setSize] = useState("XS");

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [total, setTotal] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const initialInvoiceReference = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("invoice_ref") || "";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("quote_tab");
    if (tab === "artist") {
      setActiveTab("artist");
      const target = document.getElementById("get-quote-instantly");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  const addItem = () => {
    const price = calculatePrice(productType, quantity, designType, size);

    setItems((prev) => [
      ...prev,
      { productType, quantity, designType, sizeCategory, size, price },
    ]);

    setTotal((t) => t + price);

    setStep(1);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      setTotal((t) => t - removed.price);
      return updated;
    });
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
                onClick={() => setActiveTab("artist")}
                className={`rounded-xl px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-300 sm:px-6 sm:py-3 sm:text-sm ${
                  activeTab === "artist"
                    ? "bg-[#C6A75E] text-white shadow-md"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Speak to an Embroidery Artist
              </button>

            </div>
          </div>

          {/* ===== Tab Content ===== */}
          {activeTab === "instant" && (
            <>
              {step === 1 && (
                <ProductStep
                  productType={productType}
                  setProductType={setProductType}
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
                <EmbroideryStep
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

          {activeTab === "artist" && <SpeakToArtist initialInvoiceReference={initialInvoiceReference} />}
        </div>
      </div>
    </div>
  );
}
