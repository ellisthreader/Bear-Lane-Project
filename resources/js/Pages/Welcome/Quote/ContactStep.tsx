import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { QuoteItem } from "./GetQuoteInstantly";

type Props = {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  items: QuoteItem[];
  total: number;
};

export default function ContactStep({
  name,
  setName,
  email,
  setEmail,
  items,
  total,
}: Props) {
  const [hasProceeded, setHasProceeded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [quoteNumber, setQuoteNumber] = useState<number | null>(null);

  const gold = "#C9A24D";

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isContactValid =
    name.trim().length > 1 && isValidEmail(email);

  const sendQuote = async () => {
    if (!isContactValid) return;

    setIsGenerating(true);

    const randomQuoteNumber = Math.floor(100000 + Math.random() * 900000);
    setQuoteNumber(randomQuoteNumber);

    try {
      // Map all items including price
      const itemsWithDetails = items.map((item) => ({
        productType: item.productType,
        quantity: item.quantity ?? 1,
        designType: item.designType,
        sizeCategory: item.sizeCategory,
        size: item.size,
        price: item.price,
      }));

      // POST to your Laravel API
      const response = await fetch("http://localhost/api/instant-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          quoteNumber: randomQuoteNumber.toString(),
          items: itemsWithDetails,
          total,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.errors
            ? JSON.stringify(data.errors)
            : "Failed to save quote."
        );
        setIsGenerating(false);
        return;
      }

      // Success animation
      setTimeout(() => setShowSuccess(true), 900);

      setTimeout(() => {
        setIsGenerating(false);
        setShowSuccess(false);
        setHasProceeded(true);
      }, 1700);
    } catch (err) {
      console.error(err);
      setError("Failed to send quote to the server.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white px-4 md:px-0 pt-4 pb-16 max-w-5xl mx-auto">
      <AnimatePresence mode="wait">

        {!hasProceeded && !isGenerating && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.45 }}
          >
            {/* ===== Contact Inputs ===== */}
            <div className="mb-10">
              <div className="w-fit">
                <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
                  Contact Information
                </h2>
                <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
              </div>
            </div>

            <div className="flex flex-col gap-6 mb-10">
              <input
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A24D] transition-all duration-200 hover:border-[#C9A24D]/40"
              />
              <input
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-5 py-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A24D] transition-all duration-200 hover:border-[#C9A24D]/40"
              />

              {email.length > 0 && !isValidEmail(email) && (
                <p className="text-sm text-red-400">
                  Please enter a valid email address
                </p>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <button
              disabled={!isContactValid}
              onClick={sendQuote}
              className="w-full py-5 rounded-2xl text-white font-semibold tracking-wide transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
              style={{
                backgroundColor: gold,
                opacity: isContactValid ? 1 : 0.6,
                cursor: isContactValid ? "pointer" : "not-allowed",
              }}
            >
              Get My Quote
            </button>
          </motion.div>
        )}

        {isGenerating && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-28"
          >
            {!showSuccess ? (
              <>
                <motion.div
                  className="w-16 h-16 border-[3px] border-[#C9A24D] border-t-transparent rounded-full mb-8"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Generating Your Quote...
                </h3>
                <p className="text-gray-500 text-sm">
                  Preparing something premium for you.
                </p>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="bg-[#C9A24D] text-white rounded-full p-5 mb-5 shadow-lg">
                  <Check size={30} />
                </div>
                <p className="text-xl font-semibold text-gray-900">Quote Ready</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {hasProceeded && (
          <motion.div
            key="quote"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-white rounded-3xl border border-[#EFE3C3] p-10 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A24D]/5 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10">
                {quoteNumber && (
                  <p className="text-sm text-gray-500 mb-2">
                    Quote #: <span className="font-semibold">{quoteNumber}</span>
                  </p>
                )}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="uppercase tracking-widest text-xs text-gray-500 mb-3">
                      Total Quote
                    </p>
                    <motion.p
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-5xl font-extrabold text-gray-900 leading-none"
                    >
                      £{total.toFixed(2)}
                    </motion.p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#C9A24D] text-[#C9A24D] text-sm font-medium">
                    Estimation
                  </div>
                </div>

                <div className="mt-8 border-t border-dashed border-[#EFE3C3] pt-5 space-y-2">
                  <p className="text-sm text-gray-500">
                    This quote is based on your selected items and specifications.
                  </p>
                  <p className="text-sm text-gray-500">
                    Final pricing may vary *
                  </p>
                </div>

                <div className="mt-10 space-y-4">
                  {items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="bg-[#FAF7ED] border border-[#EFE3C3] rounded-2xl p-5"
                    >
                      <p className="font-semibold text-gray-900 text-lg">
                        {item.quantity ?? 1} × {item.productType}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.designType}, {item.sizeCategory}: {item.size}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        £{item.price.toFixed(2)}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="mt-14 text-center"
                >
                  <div className="w-24 h-[2px] mx-auto mb-8 bg-[#C9A24D]" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    What Happens Next?
                  </h3>
                  <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
                    Your personalised quote has been prepared. A member of our team
                    will be in touch shortly to refine and confirm your order.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
