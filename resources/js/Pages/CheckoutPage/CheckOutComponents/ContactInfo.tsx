import React from "react";
import { useCheckout } from "@/Context/CheckoutContext";
import type { CheckoutFieldErrors, CheckoutFieldKey } from "../CheckoutForm";

type ContactInfoProps = {
  invalidFields?: Set<CheckoutFieldKey>;
  fieldErrors?: CheckoutFieldErrors;
  onFieldValueChange?: (field: CheckoutFieldKey, value: string) => void;
};

export default function ContactInfo({
  invalidFields = new Set<CheckoutFieldKey>(),
  fieldErrors = {},
  onFieldValueChange,
}: ContactInfoProps) {
  const { email, setEmail } = useCheckout();
  const emailInvalid = invalidFields.has("email");

  return (
    <div className="p-0">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Contact</h3>

      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="checkout-email">
        Email address
      </label>
      <input
        id="checkout-email"
        type="email"
        className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none ${
          emailInvalid
            ? "checkout-field-error checkout-field-shake border-red-400 ring-2 ring-red-200"
            : "border-gray-300 focus:border-[#C6A75E] focus:ring-2 focus:ring-[#C6A75E]/25"
        }`}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          const value = e.target.value;
          setEmail(value);
          onFieldValueChange?.("email", value);
        }}
        required
      />
      {fieldErrors.email && !email && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
    </div>
  );
}
