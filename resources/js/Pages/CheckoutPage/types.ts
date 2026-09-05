export type CheckoutFieldKey =
  | "email"
  | "firstName"
  | "lastName"
  | "phone"
  | "country"
  | "addressLine1"
  | "city"
  | "postcode"
  | "addressLookup";

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldKey, string>>;

export type PaymentType = "KLARNA" | "CARD" | "PAYPAL" | "APPLE_PAY" | "GOOGLE_PAY";

export type BillingAddress = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
};

export type SavedAddress = {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  county?: string | null;
  postcode: string;
  is_default: boolean;
};

export type SavedPaymentMethod = {
  id: number;
  stripe_payment_method_id: string;
  provider_type?: "card" | "paypal" | "klarna" | string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  cardholder_name?: string | null;
  is_default: boolean;
};

export type CheckoutRecoveryState = {
  email: string;
  address: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
  };
  shippingMethod: string;
  shippingCost: number;
  discountCode: string;
  appliedDiscount: { code: string; type: "percent" | "fixed" | "shipping"; value: number } | null;
  giftPackagingEnabled: boolean;
  giftMessage: string;
  paymentType: PaymentType | null;
  selectedSavedPaymentMethodId: number | null;
  cardholderName: string;
  termsAccepted: boolean;
  useDeliveryAddressAsBilling: boolean;
  billingAddress: BillingAddress;
};

export type StepOffsets = Record<1 | 2 | 3, number>;
