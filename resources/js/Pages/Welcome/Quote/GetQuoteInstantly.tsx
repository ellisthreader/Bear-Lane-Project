import React, { useState } from "react";
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
export default function GetQuoteInstantly() {
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
    <div className="min-h-screen bg-white py-16 px-6">
      <div className="max-w-5xl mx-auto">

        {/* ===== Main Card ===== */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.06)] p-10">

          {/* ===== Tabs ===== */}
          <div className="flex justify-center mb-12">
            <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200">

              <button
                onClick={() => setActiveTab("instant")}
                className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === "instant"
                    ? "bg-[#C6A75E] text-white shadow-md"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Get Quote Instantly
              </button>

              <button
                onClick={() => setActiveTab("artist")}
                className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
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

          {activeTab === "artist" && <SpeakToArtist />}
        </div>
      </div>
    </div>
  );
}
