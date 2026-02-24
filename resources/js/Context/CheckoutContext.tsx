// resources/js/Context/CheckoutContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCart } from "@/Context/CartContext";
import axios from "axios";

interface Address {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
}

interface ShippingService {
  object_id: string;
  provider: string;
  servicelevel?: { name: string };
  amount: string;
  estimated_days?: number;
}

interface DiscountData {
  code: string;
  type: "percent" | "fixed";
  value: number; // in £
}

interface CheckoutContextType {
  // User + Address
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
  country: string;
  setCountry: (val: string) => void;

  // Shipping
  availableServices: ShippingService[];
  setAvailableServices: React.Dispatch<React.SetStateAction<ShippingService[]>>;
  shippingMethod: string;
  setShippingMethod: (val: string) => void;
  shippingCost: number;
  setShippingCost: (val: number) => void;

  // Discounts
  discountCode: string;
  setDiscountCode: (val: string) => void;
  appliedDiscount: DiscountData | null;
  validateDiscount: (code: string) => Promise<void>;
  discountError: string | null;

  // General + specific errors
  loading: boolean;
  setLoading: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
  cardError: string | null;
  setCardError: (val: string | null) => void;
  shippingError: string | null;
  setShippingError: (val: string | null) => void;
  addressError: string | null;
  setAddressError: (val: string | null) => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const { cart } = useCart();

  // User info
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    phone: "",
    country: "United Kingdom",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
  });
  const [country, setCountry] = useState("United Kingdom");

  // Shipping
  const [availableServices, setAvailableServices] = useState<ShippingService[]>([]);
  const [shippingMethod, setShippingMethod] = useState("");
  const [shippingCost, setShippingCost] = useState(0);

  // Discounts
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountData | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // General + specific errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // --- Persist / restore shipping only ---
    useEffect(() => {
      const storedShipping = localStorage.getItem("checkoutShipping");
      if (storedShipping) setShippingCost(Number(storedShipping));
    }, []);

    useEffect(() => {
      localStorage.setItem("checkoutShipping", String(shippingCost));
    }, [shippingCost]);


  // Compute subtotal
  const subtotal = cart?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;

  // Validate discount via backend
    const validateDiscount = async (code: string) => {
      if (!code.trim()) {
        setDiscountError("Please enter a discount code.");
        return { success: false, message: "Please enter a discount code." };
      }

      setLoading(true);
      setDiscountError(null);

      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/discount/validate`, {
          code,
          subtotal_cents: Math.round(subtotal * 100),
        });

        const data = res.data;

        if (!data.valid) {
          setAppliedDiscount(null);
          setDiscountError(data.message || "Invalid or expired discount code.");
          return { success: false, message: data.message || "Invalid or expired discount code." };
        }

        const discountValue = data.discount_cents / 100;
        const discountData = {
          code: data.code,
          type: "fixed" as const,
          value: discountValue,
        };

        setAppliedDiscount(discountData);
        setDiscountError(null);

        return { success: true, discount: discountData };
      } catch (err: any) {
        console.error("Discount validation error:", err);
        setAppliedDiscount(null);
        setDiscountError("Invalid or expired discount code");
        return { success: false, message: "Invalid or expired discount code" };
      } finally {
        setLoading(false);
      }
    };


  return (
    <CheckoutContext.Provider
      value={{
        email,
        setEmail,
        phone,
        setPhone,
        address,
        setAddress,
        country,
        setCountry,
        availableServices,
        setAvailableServices,
        shippingMethod,
        setShippingMethod,
        shippingCost,
        setShippingCost,
        discountCode,
        setDiscountCode,
        appliedDiscount,
        validateDiscount,
        discountError,
        loading,
        setLoading,
        error,
        setError,
        cardError,
        setCardError,
        shippingError,
        setShippingError,
        addressError,
        setAddressError,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = (): CheckoutContextType => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
};
