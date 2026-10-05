import React, { createContext, useContext } from "react";
import type { BillingAddress, PaymentType, SavedPaymentMethod } from "../types";

export type CheckoutPaymentContextValue = {
  paymentType: PaymentType | null;
  setPaymentType: (value: PaymentType | null) => void;
  orderTotalCents: number;
  savedPaymentMethods: SavedPaymentMethod[];
  selectedSavedPaymentMethodId: number | null;
  setSelectedSavedPaymentMethodId: (value: number | null) => void;
  cardholderName: string;
  setCardholderName: (value: string) => void;
  savedCardCvcComplete: boolean;
  setSavedCardCvcComplete: (value: boolean) => void;
  useDeliveryAddressAsBilling: boolean;
  setUseDeliveryAddressAsBilling: (value: boolean) => void;
  deliveryAddressSummary: string;
  billingAddress: BillingAddress;
  setBillingAddress: (value: BillingAddress) => void;
  termsAccepted: boolean;
  setTermsAccepted: (value: boolean) => void;
};

const CheckoutPaymentContext = createContext<CheckoutPaymentContextValue | undefined>(undefined);

export function CheckoutPaymentProvider({
  value,
  children,
}: {
  value: CheckoutPaymentContextValue;
  children: React.ReactNode;
}) {
  return <CheckoutPaymentContext.Provider value={value}>{children}</CheckoutPaymentContext.Provider>;
}

export function useCheckoutPayment(): CheckoutPaymentContextValue {
  const context = useContext(CheckoutPaymentContext);
  if (!context) {
    throw new Error("useCheckoutPayment must be used within CheckoutPaymentProvider");
  }
  return context;
}
