import React, { createContext, useContext, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type { PrintType, QuoteSource } from "./types";
import { executeRecaptcha } from "@/Utils/recaptcha";

type QuoteStage = "form" | "quote";

type ProductQuoteContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  source: QuoteSource;
  quantity: number;
  setQuantity: (value: number) => void;
  printType: PrintType | "";
  setPrintType: (value: PrintType | "") => void;
  sides: string[];
  toggleSide: (side: string) => void;
  stage: QuoteStage;
  goToQuote: () => void;
  goBackToForm: () => void;
  quoteNumber: number | null;
  quoteTotal: number;
  guestEmail: string;
  setGuestEmail: (value: string) => void;
  sending: boolean;
  sendQuoteEmail: (closeOnSuccess?: boolean, silentSuccess?: boolean) => Promise<boolean>;
};

const SIDE_OPTIONS = ["Front", "Back", "Left Sleeve", "Right Sleeve"];

const PRINT_MULTIPLIERS: Record<PrintType, number> = {
  Logo: 1,
  "Personalised Text": 0.95,
  Image: 1.15,
  "Image & Text": 1.25,
  "Complex Pattern": 1.4,
  "Event / Team Branding": 1.3,
};

const ProductQuoteContext = createContext<ProductQuoteContextValue | undefined>(undefined);

const roundTo2 = (value: number) => Math.round(value * 100) / 100;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function ProductQuoteProvider({ source, children }: { source: QuoteSource; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [printType, setPrintType] = useState<PrintType | "">("Image & Text");
  const [sides, setSides] = useState<string[]>(["Front"]);
  const [stage, setStage] = useState<QuoteStage>("form");
  const [quoteNumber, setQuoteNumber] = useState<number | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sideMultiplier = 1 + Math.max(0, sides.length - 1) * 0.22;
  const printMultiplier = printType ? PRINT_MULTIPLIERS[printType] : 1;
  const quoteTotal = useMemo(
    () => roundTo2(Math.max(1, quantity) * Math.max(0, source.basePrice) * printMultiplier * sideMultiplier),
    [quantity, source.basePrice, printMultiplier, sideMultiplier]
  );

  const resetFlow = () => {
    setStage("form");
    setQuoteNumber(null);
    setSending(false);
  };

  const open = () => {
    resetFlow();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    resetFlow();
  };

  const toggleSide = (side: string) => {
    setSides((prev) => {
      if (prev.includes(side)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== side);
      }
      return [...prev, side];
    });
  };

  const goToQuote = () => {
    if (!printType) {
      toast.error("Please select a print style.", { position: "top-center", autoClose: 3000 });
      return;
    }

    if (sides.length === 0) {
      toast.error("Please select at least one side.", { position: "top-center", autoClose: 3000 });
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Please enter a valid quantity.", { position: "top-center", autoClose: 3000 });
      return;
    }

    setQuoteNumber(Math.floor(100000 + Math.random() * 900000));
    setStage("quote");
  };

  const goBackToForm = () => setStage("form");

  const sendQuoteEmail = async (closeOnSuccess = true, silentSuccess = false) => {
    if (!quoteNumber) {
      toast.error("Please load your quote first.", { position: "top-center", autoClose: 3000 });
      return false;
    }

    const email = source.isLoggedIn ? source.accountEmail.trim() : guestEmail.trim();
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.", { position: "top-center", autoClose: 3000 });
      return false;
    }

    setSending(true);

    const payload = {
      name: source.accountName || "Customer",
      email,
      quoteNumber,
      total: quoteTotal,
      items: [
        {
          quantity: Math.max(1, quantity),
          productType: `${source.productName} (${source.colour})`,
          designType: `${printType || "Print"} · ${sides.join(" + ")}`,
          sizeCategory: source.sizeCategory,
          size: source.size,
        },
      ],
    };

    try {
      const recaptchaToken = await executeRecaptcha("send_quote");
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...payload,
          recaptcha_token: recaptchaToken,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to email quote.");
      }

      if (!silentSuccess) {
        toast.success("Quote emailed successfully.", {
          position: "top-center",
          autoClose: 3000,
          toastId: "product-quote-email-success",
        });
      }
      if (closeOnSuccess) close();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to email quote.", {
        position: "top-center",
        autoClose: 3000,
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  const value = useMemo<ProductQuoteContextValue>(
    () => ({
      isOpen,
      open,
      close,
      source,
      quantity,
      setQuantity,
      printType,
      setPrintType,
      sides,
      toggleSide,
      stage,
      goToQuote,
      goBackToForm,
      quoteNumber,
      quoteTotal,
      guestEmail,
      setGuestEmail,
      sending,
      sendQuoteEmail,
    }),
    [
      isOpen,
      source,
      quantity,
      printType,
      sides,
      stage,
      quoteNumber,
      quoteTotal,
      guestEmail,
      sending,
    ]
  );

  return <ProductQuoteContext.Provider value={value}>{children}</ProductQuoteContext.Provider>;
}

export function useProductQuote() {
  const context = useContext(ProductQuoteContext);
  if (!context) {
    throw new Error("useProductQuote must be used within ProductQuoteProvider");
  }
  return context;
}

export { SIDE_OPTIONS };
