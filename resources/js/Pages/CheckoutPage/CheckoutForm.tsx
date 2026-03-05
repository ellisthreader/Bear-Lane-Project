import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { useCart } from "@/Context/CartContext";
import { CardCvcElement, CardNumberElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { router, usePage } from "@inertiajs/react";
import { useCheckout } from "@/Context/CheckoutContext";
import { isValidPhoneNumber } from "react-phone-number-input";

import ContactInfo from "./CheckOutComponents/ContactInfo";
import DeliveryInfo from "./CheckOutComponents/DeliveryInfo";
import ShippingMethod from "./CheckOutComponents/ShippingMethod";
import OrderSummary from "./CheckOutComponents/OrderSummary";
import PaymentSection from "./CheckOutComponents/PaymentSection";
import { CheckoutPaymentProvider } from "./context/CheckoutPaymentContext";
import type {
  BillingAddress,
  CheckoutFieldErrors,
  CheckoutFieldKey,
  CheckoutRecoveryState,
  PaymentType,
  SavedAddress,
  SavedPaymentMethod,
  StepOffsets,
} from "./types";

import { computeTotalsInCents } from "@/Utils/totals";
import { showCheckoutError, showCheckoutSuccess } from "./checkoutToasts";

type CheckoutFormProps = {
  initialEmail?: string;
};

const GIFT_PACKAGING_PRICE = 10;
const PENDING_REDIRECT_ORDER_KEY = "checkout_pending_redirect_order";
const CHECKOUT_GUEST_EMAIL_KEY = "checkout_guest_email";
const CHECKOUT_REDIRECT_RECOVERY_KEY = "checkout_redirect_recovery_state";

const CheckoutForm = ({ initialEmail = "" }: CheckoutFormProps) => {
  const page = usePage<{ auth?: { user?: Record<string, unknown> } }>();
  const authUser = page.props.auth?.user;
  const isAuthenticated = Boolean(authUser);
  const checkoutDebug = true;
  const stripe = useStripe();
  const elements = useElements();
  const { cart } = useCart();
  const {
    email,
    setEmail,
    address,
    setAddress,
    country: checkoutCountry,
    setCountry,
    shippingMethod,
    setShippingMethod,
    shippingCost = 0,
    setShippingCost,
    discountCode,
    setDiscountCode,
    appliedDiscount,
    setAppliedDiscount,
    loading,
    setLoading,
    setError,
  } = useCheckout();

  const [giftPackagingEnabled, setGiftPackagingEnabled] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [activeSection, setActiveSection] = useState<1 | 2 | 3>(1);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [useDeliveryAddressAsBilling, setUseDeliveryAddressAsBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
  });
  const [invalidFields, setInvalidFields] = useState<Set<CheckoutFieldKey>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<number | null>(null);
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState<number | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [savedCardCvcComplete, setSavedCardCvcComplete] = useState(false);
  const [redirectProcessingNotice, setRedirectProcessingNotice] = useState<string | null>(null);
  const [verticalStepLinePath, setVerticalStepLinePath] = useState<string>("");
  const [stepOffsets, setStepOffsets] = useState<StepOffsets>({ 1: 0, 2: 0, 3: 0 });
  const isFinalizingRedirectPaymentRef = useRef(false);
  const connectorCanvasRef = useRef<HTMLDivElement | null>(null);
  const stepRailRef = useRef<HTMLDivElement | null>(null);
  const sectionHeaderRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const sectionCardRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);

  const setSectionHeaderRef = (step: 1 | 2 | 3) => (node: HTMLDivElement | null) => {
    sectionHeaderRefs.current[step - 1] = node;
  };

  const setSectionCardRef = (step: 1 | 2 | 3) => (node: HTMLDivElement | null) => {
    sectionCardRefs.current[step - 1] = node;
  };

  const clearFieldState = (field: CheckoutFieldKey) => {
    setInvalidFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });

    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearFieldStateMany = (fields: CheckoutFieldKey[]) => {
    setInvalidFields((prev) => {
      const next = new Set(prev);
      let changed = false;
      fields.forEach((field) => {
        if (next.delete(field)) changed = true;
      });
      return changed ? next : prev;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      fields.forEach((field) => {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const handleFieldValueChange = (field: CheckoutFieldKey, value: string) => {
    if (!value.trim()) return;

    if (field === "phone") {
      if (!isValidPhoneNumber(value)) return;
      clearFieldState("phone");
      return;
    }

    if (field === "addressLookup") {
      clearFieldStateMany(["addressLookup", "addressLine1", "city", "postcode"]);
      return;
    }

    clearFieldState(field);
  };

  const giftPackagingCost = giftPackagingEnabled ? GIFT_PACKAGING_PRICE : 0;
  const timedReservationId = useMemo(() => {
    if (!shippingMethod.startsWith("TIMED:")) return null;
    const parsed = Number(shippingMethod.replace("TIMED:", ""));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [shippingMethod]);

  const deliveryType = useMemo(() => {
    if (shippingMethod.startsWith("TIMED:")) return "TIMED";
    if (shippingMethod === "NEXT_DAY") return "NEXT_DAY";
    if (shippingMethod === "STANDARD") return "STANDARD";
    return null;
  }, [shippingMethod]);

  const shippingRateLabel = useMemo(() => {
    if (!shippingMethod) return null;
    if (deliveryType === "TIMED") return "Timed Delivery";
    if (deliveryType === "NEXT_DAY") return "Next Day Delivery";
    return "Standard Delivery";
  }, [deliveryType, shippingMethod]);

  useEffect(() => {
    if (!email && initialEmail) {
      setEmail(initialEmail);
    }
  }, [email, initialEmail, setEmail]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        if (checkoutDebug) {
          console.group("[Checkout][Step1] Saved details fetch");
          console.log("isAuthenticated:", isAuthenticated);
          console.log("auth user:", authUser);
          console.log("initialEmail:", initialEmail);
        }
        const res = await fetch("/checkout/saved-details", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        if (checkoutDebug) {
          console.log("saved-details status:", res.status, res.statusText);
        }
        if (!res.ok) return;
        const payload = await res.json();
        if (checkoutDebug) {
          console.log("saved-details payload:", payload);
        }
        if (cancelled) return;

        const nextAddresses = Array.isArray(payload.addresses) ? (payload.addresses as SavedAddress[]) : [];
        const nextPaymentMethods = Array.isArray(payload.payment_methods)
          ? (payload.payment_methods as SavedPaymentMethod[])
          : [];

        setSavedAddresses(nextAddresses);
        setSavedPaymentMethods(nextPaymentMethods);
        if (checkoutDebug) {
          console.log("mapped addresses:", nextAddresses);
          console.log("mapped payment methods:", nextPaymentMethods);
        }

        const defaultAddress = nextAddresses.find((entry) => entry.is_default) || nextAddresses[0];
        if (defaultAddress) {
          // Always select a saved address for signed-in users when one exists.
          setSelectedSavedAddressId(defaultAddress.id);
          setShowNewAddressForm(false);
          setAddress((prev) => ({
            ...prev,
            firstName: defaultAddress.first_name || "",
            lastName: defaultAddress.last_name || "",
            phone: defaultAddress.phone || "",
            country: defaultAddress.country || prev.country || "United Kingdom",
            addressLine1: defaultAddress.address_line1 || "",
            addressLine2: defaultAddress.address_line2 || "",
            city: defaultAddress.city || "",
            county: defaultAddress.county || "",
            postcode: defaultAddress.postcode || "",
          }));
          setCountry(defaultAddress.country || "United Kingdom");
          if (checkoutDebug) {
            console.log("selected default saved address:", defaultAddress);
          }
        }

        const defaultCardMethod =
          nextPaymentMethods.find((entry) => (entry.provider_type || "card") === "card" && entry.is_default)
          || nextPaymentMethods.find((entry) => (entry.provider_type || "card") === "card")
          || null;
        if (defaultCardMethod) {
          setSelectedSavedPaymentMethodId(defaultCardMethod.id);
          if (checkoutDebug) {
            console.log("selected default card payment method:", defaultCardMethod);
          }
        } else {
          setSelectedSavedPaymentMethodId(null);
        }
      } catch {
        // Ignore; checkout still works without saved details.
      } finally {
        if (checkoutDebug) {
          console.groupEnd();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, checkoutDebug, initialEmail, isAuthenticated, setAddress, setCountry]);

  const {
    firstName,
    lastName,
    phone: addrPhone,
    country,
    addressLine1,
    addressLine2,
    city,
    postcode,
    county,
  } = address || {};

  const getCsrfToken = () => {
    const fromMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    if (fromMeta) return fromMeta;

    const xsrfCookie = document.cookie
      .split("; ")
      .find((part) => part.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];

    return xsrfCookie ? decodeURIComponent(xsrfCookie) : "";
  };
  const deliveryAddressSummary = useMemo(
    () =>
      [`${firstName || ""} ${lastName || ""}`.trim(), addressLine1, addressLine2, city, county, postcode, country]
        .filter((part) => Boolean(part && String(part).trim()))
        .join(", ") || "Delivery address not set yet.",
    [firstName, lastName, addressLine1, addressLine2, city, county, postcode, country]
  );

  const deliverySummaryLine = useMemo(() => {
    const fullName = [firstName, lastName].filter((part) => Boolean(part && String(part).trim())).join(" ");
    const parts = [fullName, addressLine1].filter((part) => Boolean(part && String(part).trim()));
    return parts.length > 0 ? parts.join(", ") : "No delivery details submitted yet.";
  }, [firstName, lastName, addressLine1]);

  const deliveryOptionsSummaryLine = useMemo(() => {
    return shippingRateLabel || "No delivery option selected yet.";
  }, [shippingRateLabel]);
  const showGiftPackagingPanel = Boolean(shippingMethod);
  const hasSavedAddresses = isAuthenticated && savedAddresses.length > 0;
  const showSavedAddressSummary = hasSavedAddresses && !showNewAddressForm && selectedSavedAddressId !== null;

  const selectedSavedPaymentMethod = useMemo(
    () =>
      selectedSavedPaymentMethodId
        ? savedPaymentMethods.find((method) => method.id === selectedSavedPaymentMethodId) || null
        : null,
    [savedPaymentMethods, selectedSavedPaymentMethodId]
  );

  useEffect(() => {
    if (!selectedSavedPaymentMethod) return;
    const provider = (selectedSavedPaymentMethod.provider_type || "card").toLowerCase();

    if (paymentType === "CARD" && provider !== "card") {
      setSelectedSavedPaymentMethodId(null);
      return;
    }
    if (paymentType === "PAYPAL" && provider !== "paypal") {
      setSelectedSavedPaymentMethodId(null);
      return;
    }
    if (paymentType === "KLARNA" && provider !== "klarna") {
      setSelectedSavedPaymentMethodId(null);
    }
  }, [paymentType, selectedSavedPaymentMethod]);

  useEffect(() => {
    if (paymentType !== "CARD") {
      setSavedCardCvcComplete(false);
      return;
    }

    const selectedMethod = selectedSavedPaymentMethodId
      ? savedPaymentMethods.find((method) => method.id === selectedSavedPaymentMethodId)
      : null;

    if (!selectedMethod || (selectedMethod.provider_type || "card") !== "card") {
      setSavedCardCvcComplete(false);
    }
  }, [paymentType, savedPaymentMethods, selectedSavedPaymentMethodId]);

  useEffect(() => {
    if (paymentType !== "CARD") return;
    if (selectedSavedPaymentMethodId === null) return;

    const matchingMethods = savedPaymentMethods.filter((method) => (method.provider_type || "card") === "card");
    if (!matchingMethods.length) return;

    const selectedMethod = selectedSavedPaymentMethodId
      ? savedPaymentMethods.find((method) => method.id === selectedSavedPaymentMethodId)
      : null;

    if (selectedMethod && (selectedMethod.provider_type || "card") === "card") return;

    const preferred = matchingMethods.find((method) => method.is_default) || matchingMethods[0];
    setSelectedSavedPaymentMethodId(preferred.id);
  }, [paymentType, savedPaymentMethods, selectedSavedPaymentMethodId]);

  const applySavedAddress = (addressCard: SavedAddress) => {
    if (checkoutDebug) {
      console.log("[Checkout][Step1] applySavedAddress:", addressCard);
    }
    setSelectedSavedAddressId(addressCard.id);
    setShowNewAddressForm(false);
    setAddress((prev) => ({
      ...prev,
      firstName: addressCard.first_name || "",
      lastName: addressCard.last_name || "",
      phone: addressCard.phone || "",
      country: addressCard.country || "United Kingdom",
      addressLine1: addressCard.address_line1 || "",
      addressLine2: addressCard.address_line2 || "",
      city: addressCard.city || "",
      county: addressCard.county || "",
      postcode: addressCard.postcode || "",
    }));
    setCountry(addressCard.country || "United Kingdom");
    clearFieldStateMany(["firstName", "lastName", "phone", "country", "addressLine1", "city", "postcode"]);
  };

  const startNewAddressEntry = () => {
    if (checkoutDebug) {
      console.log("[Checkout][Step1] startNewAddressEntry");
    }
    setSelectedSavedAddressId(null);
    setShowNewAddressForm(true);
    setAddress((prev) => ({
      ...prev,
      firstName: "",
      lastName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      county: "",
      postcode: "",
      country: prev.country || checkoutCountry || "United Kingdom",
    }));
    setCountry(checkoutCountry || "United Kingdom");
  };

  useEffect(() => {
    if (!checkoutDebug) return;
    console.log("[Checkout][Step1] view-state", {
      hasSavedAddresses,
      showNewAddressForm,
      selectedSavedAddressId,
      showSavedAddressSummary,
      deliveryAddressSummary,
    });
  }, [checkoutDebug, hasSavedAddresses, showNewAddressForm, selectedSavedAddressId, showSavedAddressSummary, deliveryAddressSummary]);

  useEffect(() => {
    if (!checkoutDebug) return;
    console.log("[Checkout][Step3] payment-state", {
      paymentType,
      selectedSavedPaymentMethodId,
      selectedSavedPaymentMethod,
      savedCardCvcComplete,
      savedPaymentMethods,
    });
  }, [checkoutDebug, paymentType, selectedSavedPaymentMethodId, selectedSavedPaymentMethod, savedCardCvcComplete, savedPaymentMethods]);

  useEffect(() => {
    if (!useDeliveryAddressAsBilling) return;

    setBillingAddress({
      firstName: firstName || "",
      lastName: lastName || "",
      line1: addressLine1 || "",
      line2: addressLine2 || "",
      city: city || "",
      county: county || "",
      postcode: postcode || "",
      country: country || "",
    });
  }, [useDeliveryAddressAsBilling, firstName, lastName, addressLine1, addressLine2, city, county, postcode, country]);

  const totals = useMemo(() => {
    return computeTotalsInCents({
      items: cart.map((item) => ({
        unit_price: item.price,
        quantity: item.quantity,
      })),
      shippingCost,
      appliedDiscount,
      extraFeeCost: giftPackagingCost,
    });
  }, [cart, shippingCost, appliedDiscount, giftPackagingCost]);

  const saveRedirectRecoveryState = () => {
    const state: CheckoutRecoveryState = {
      email,
      address: {
        firstName: address?.firstName || "",
        lastName: address?.lastName || "",
        phone: address?.phone || "",
        country: address?.country || checkoutCountry || "",
        addressLine1: address?.addressLine1 || "",
        addressLine2: address?.addressLine2 || "",
        city: address?.city || "",
        county: address?.county || "",
        postcode: address?.postcode || "",
      },
      shippingMethod,
      shippingCost,
      discountCode,
      appliedDiscount: appliedDiscount
        ? { code: appliedDiscount.code, type: appliedDiscount.type, value: appliedDiscount.value }
        : null,
      giftPackagingEnabled,
      giftMessage,
      paymentType,
      selectedSavedPaymentMethodId,
      cardholderName,
      termsAccepted,
      useDeliveryAddressAsBilling,
      billingAddress,
    };
    localStorage.setItem(CHECKOUT_REDIRECT_RECOVERY_KEY, JSON.stringify(state));
  };

  const validateDelivery = () => {
    const missingLabels: string[] = [];
    const missingFields = new Set<CheckoutFieldKey>();
    const nextFieldErrors: CheckoutFieldErrors = {};

    const addMissingField = (field: CheckoutFieldKey, label: string, message: string) => {
      missingLabels.push(label);
      missingFields.add(field);
      nextFieldErrors[field] = message;
    };

    if (!email) {
      addMissingField("email", "email", "Please enter your email address.");
    }
    if (!firstName) {
      addMissingField("firstName", "first name", "Please enter your first name.");
    }
    if (!lastName) {
      addMissingField("lastName", "last name", "Please enter your last name.");
    }
    const hasPhoneValue = Boolean(addrPhone?.trim());
    const hasValidPhoneValue = hasPhoneValue && isValidPhoneNumber(addrPhone);
    if (!hasValidPhoneValue) {
      addMissingField(
        "phone",
        "phone number",
        hasPhoneValue ? "Please enter a valid phone number." : "Please enter your phone number."
      );
    }
    if (!country) {
      addMissingField("country", "country/region", "Please select your country or region.");
    }
    if (!addressLine1) {
      addMissingField("addressLine1", "address line 1", "Please enter address line 1.");
    }
    if (!city) {
      addMissingField("city", "town/city", "Please enter your town or city.");
    }
    if (!postcode) {
      addMissingField("postcode", "postcode", "Please enter your postcode.");
    }

    if (missingFields.size > 0) {
      setInvalidFields(missingFields);
      setFieldErrors(nextFieldErrors);
      showCheckoutError("Please fill in the missing fields.");
      return false;
    }

    setInvalidFields(new Set());
    setFieldErrors({});
    return true;
  };

  const mapCountryCode = (value?: string) => {
    if (!value) return "GB";
    return value === "United Kingdom" ? "GB" : value;
  };

  const buildOrderPayload = () => ({
    email,
    items: cart.map((i) => ({
      slug: i.slug,
      title: i.title,
      size: i.size,
      colour: i.colour,
      price: i.price,
      unit_price: i.price,
      quantity: i.quantity,
      line_total: Number((i.price * i.quantity).toFixed(2)),
      image: i.image,
      design_type: i.designType,
      preview_snapshot: i.previewSnapshot,
      preview_by_view: i.previewByView,
    })),
    totals,
    appliedDiscount,
    delivery: {
      firstName,
      lastName,
      phone: addrPhone || undefined,
      country,
      county,
      line1: addressLine1,
      line2: addressLine2,
      city,
      postcode,
    },
    options: {
      gift_packaging: giftPackagingEnabled,
      gift_packaging_cost: giftPackagingCost,
      gift_message: giftMessage.trim() || null,
      reservation_id: timedReservationId,
      delivery_type: deliveryType,
      delivery_price: shippingCost,
      shipping_rate: shippingRateLabel,
      payment_type: paymentType,
      cardholder_name: cardholderName.trim() || null,
      selected_saved_payment_method_id: selectedSavedPaymentMethodId,
    },
    discount_code: appliedDiscount?.code || null,
  });

  const storeOrderPayload = async (payload: Record<string, unknown>) => {
    const csrfToken = getCsrfToken();
    const orderRes = await fetch(`/checkout/store-order`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    return orderRes.json();
  };

  const getCardElementWithRetry = async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const element = elements?.getElement(CardNumberElement);
      if (element) return element;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    return null;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentFromUrl = params.get("payment");
    const validTypes: PaymentType[] = ["KLARNA", "CARD", "PAYPAL", "APPLE_PAY", "GOOGLE_PAY"];
    if (paymentFromUrl && validTypes.includes(paymentFromUrl as PaymentType)) {
      setPaymentType(paymentFromUrl as PaymentType);
      setActiveSection(3);
      params.delete("payment");
      const next = params.toString();
      const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isRedirectReturn = Boolean(params.get("payment_intent_client_secret")) || params.has("redirect_status");
    if (!isRedirectReturn) return;

    const hasPendingRedirect = Boolean(localStorage.getItem(PENDING_REDIRECT_ORDER_KEY));
    if (!hasPendingRedirect) return;
    setRedirectProcessingNotice("Finalizing your payment and saving your order...");

    const rawRecovery = localStorage.getItem(CHECKOUT_REDIRECT_RECOVERY_KEY);
    if (!rawRecovery) {
      setActiveSection(3);
      return;
    }

    try {
      const parsed = JSON.parse(rawRecovery) as CheckoutRecoveryState;
      if (parsed.email) setEmail(parsed.email);
      if (parsed.address) {
        setAddress((prev) => ({ ...prev, ...parsed.address }));
        if (parsed.address.country) setCountry(parsed.address.country);
      }
      if (parsed.shippingMethod) setShippingMethod(parsed.shippingMethod);
      if (Number.isFinite(parsed.shippingCost)) setShippingCost(parsed.shippingCost);
      if (parsed.discountCode) setDiscountCode(parsed.discountCode);
      if (parsed.appliedDiscount) setAppliedDiscount(parsed.appliedDiscount);

      setGiftPackagingEnabled(Boolean(parsed.giftPackagingEnabled));
      setGiftMessage(parsed.giftMessage || "");
      setPaymentType(parsed.paymentType || null);
      if (typeof parsed.selectedSavedPaymentMethodId === "number") {
        setSelectedSavedPaymentMethodId(parsed.selectedSavedPaymentMethodId);
      }
      setCardholderName(parsed.cardholderName || "");
      setTermsAccepted(Boolean(parsed.termsAccepted));
      setUseDeliveryAddressAsBilling(
        typeof parsed.useDeliveryAddressAsBilling === "boolean" ? parsed.useDeliveryAddressAsBilling : true
      );
      if (parsed.billingAddress) setBillingAddress(parsed.billingAddress);
    } catch {
      // Ignore corrupt state and keep default UI state.
    } finally {
      setActiveSection(3);
    }
  }, [
    setAddress,
    setAppliedDiscount,
    setCountry,
    setDiscountCode,
    setEmail,
    setShippingCost,
    setShippingMethod,
  ]);

  useEffect(() => {
    if (!stripe || isFinalizingRedirectPaymentRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const returnedClientSecret = params.get("payment_intent_client_secret");
    if (!returnedClientSecret) return;

    const rawPending = localStorage.getItem(PENDING_REDIRECT_ORDER_KEY);
    if (!rawPending) return;

    let pending: { clientSecret: string; orderPayload: Record<string, unknown> } | null = null;
    try {
      pending = JSON.parse(rawPending);
    } catch {
      pending = null;
    }

    if (!pending || !pending.orderPayload) return;

    isFinalizingRedirectPaymentRef.current = true;
    setRedirectProcessingNotice("Finalizing your payment and saving your order...");

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const retrieved = await stripe.retrievePaymentIntent(returnedClientSecret);
        if (retrieved.error || !retrieved.paymentIntent) {
          throw new Error(retrieved.error?.message || "Unable to verify payment.");
        }

        if (retrieved.paymentIntent.status !== "succeeded") {
          throw new Error("Payment was not completed. Please try again.");
        }

        const orderData = await storeOrderPayload({
          ...pending.orderPayload,
          payment_intent_id: retrieved.paymentIntent.id,
        });

        if (!orderData.success) {
          throw new Error(orderData.error || "Failed to save order.");
        }

        localStorage.removeItem(PENDING_REDIRECT_ORDER_KEY);
        localStorage.removeItem(CHECKOUT_REDIRECT_RECOVERY_KEY);
        sessionStorage.removeItem(CHECKOUT_GUEST_EMAIL_KEY);
        showCheckoutSuccess("Payment successful! Order saved.");
        router.visit(`/order-confirmed/${orderData.order_number}`);
      } catch (err: any) {
        showCheckoutError(err.message || "Payment failed. Try again.");
        setError(err.message || "Payment failed. Try again.");
        setRedirectProcessingNotice(null);
        setActiveSection(3);
      } finally {
        setLoading(false);
        setRedirectProcessingNotice(null);
        isFinalizingRedirectPaymentRef.current = false;
      }
    })();
  }, [setError, setLoading, stripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!stripe) {
      showCheckoutError("Stripe not ready yet.");
      return;
    }

    if (cart.length === 0) {
      showCheckoutError("Your cart is empty.");
      return;
    }

    if (!validateDelivery()) return;
    if (!shippingMethod) {
      showCheckoutError("Please select a delivery option.");
      return;
    }
    if (deliveryType === "TIMED" && !timedReservationId) {
      showCheckoutError("Please reserve a timed delivery slot before paying.");
      return;
    }
    if (!termsAccepted) {
      showCheckoutError("Please accept the terms and conditions.");
      return;
    }
    if (!paymentType) {
      showCheckoutError("Please choose a payment type.");
      return;
    }
    if (paymentType === "CARD" && selectedSavedPaymentMethodId && !savedCardCvcComplete) {
      showCheckoutError("Please enter your CVC to confirm your saved card.");
      return;
    }
    if (paymentType === "CARD" && !selectedSavedPaymentMethodId && !cardholderName.trim()) {
      showCheckoutError("Please enter the cardholder name.");
      return;
    }

    if (!useDeliveryAddressAsBilling) {
      if (
        !billingAddress.firstName
        || !billingAddress.lastName
        || !billingAddress.line1
        || !billingAddress.city
        || !billingAddress.county
        || !billingAddress.postcode
        || !billingAddress.country
      ) {
        showCheckoutError("Please complete the billing address.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const paymentRes = await fetch(`/create-payment-intent`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          email,
          items: cart.map((i) => ({
            slug: i.slug,
            name: i.title,
            quantity: i.quantity,
            unit_price_cents: Math.round(i.price * 100),
            design_type: i.designType,
          })),
          discount_code: appliedDiscount?.code || null,
          shipping: {
            method: shippingMethod,
            cost: totals.shipping_cents,
            gift_packaging_cost: Math.round(giftPackagingCost * 100),
          },
          payment_type: paymentType,
          selected_saved_payment_method_id: selectedSavedPaymentMethodId,
        }),
      });

      if (!paymentRes.ok) {
        if (paymentRes.status === 419) {
          throw new Error("Your session expired. Please refresh the page and try again.");
        }
        const fallbackText = await paymentRes.text();
        try {
          const parsed = JSON.parse(fallbackText);
          throw new Error(parsed.error || parsed.message || `Payment intent request failed (${paymentRes.status}).`);
        } catch {
          throw new Error(`Payment intent request failed (${paymentRes.status}).`);
        }
      }

      const paymentData = await paymentRes.json();
      if (paymentData.requires_action && paymentData.client_secret) {
        if (paymentType === "KLARNA") {
          const action = await stripe.confirmKlarnaPayment(paymentData.client_secret, {
            return_url: `${window.location.origin}/checkout/complete`,
          });
          if (action.error) throw new Error(action.error.message || "Klarna authentication failed.");
          return;
        }
        if (paymentType === "PAYPAL") {
          const action = await stripe.confirmPayPalPayment(paymentData.client_secret, {
            return_url: `${window.location.origin}/checkout/complete`,
          });
          if (action.error) throw new Error(action.error.message || "PayPal authentication failed.");
          return;
        }
      }

      if (paymentData.status === "succeeded" && paymentData.payment_intent_id) {
        const orderData = await storeOrderPayload({
          ...buildOrderPayload(),
          payment_intent_id: paymentData.payment_intent_id,
        });

        if (!orderData.success) throw new Error(orderData.error || "Failed to save order.");
        localStorage.removeItem(CHECKOUT_REDIRECT_RECOVERY_KEY);
        showCheckoutSuccess("Payment successful! Order saved.");
        router.visit(`/order-confirmed/${orderData.order_number}`);
        return;
      }

      if (!paymentData.client_secret) throw new Error(paymentData.error || "Failed to create payment intent.");

      const orderPayload = buildOrderPayload();
      const billingCountry = mapCountryCode(useDeliveryAddressAsBilling ? country : billingAddress.country);
      const billingName =
        cardholderName.trim()
        || selectedSavedPaymentMethod?.cardholder_name
        || `${firstName || ""} ${lastName || ""}`.trim()
        || email;

      if (paymentType === "CARD") {
        let result;
        if (selectedSavedPaymentMethod?.stripe_payment_method_id) {
          const savedCardCvcElement = elements?.getElement(CardCvcElement);
          if (!savedCardCvcElement) {
            throw new Error("CVC field is not ready. Please try again.");
          }

          result = await stripe.confirmCardPayment(paymentData.client_secret, {
            payment_method: selectedSavedPaymentMethod.stripe_payment_method_id,
            payment_method_options: {
              card: {
                cvc: savedCardCvcElement,
              },
            } as any,
          });
        } else {
          if (!elements) {
            throw new Error("Card fields are still loading. Please wait a second and try again.");
          }

          const cardNumber = await getCardElementWithRetry();
          if (!cardNumber) {
            throw new Error("Card details did not load. Please refresh the page and try again.");
          }

          result = await stripe.confirmCardPayment(paymentData.client_secret, {
            payment_method: {
              card: cardNumber,
              billing_details: {
                email,
                phone: addrPhone || undefined,
                name: billingName,
                address: {
                  country: billingCountry,
                  line1: useDeliveryAddressAsBilling ? addressLine1 : billingAddress.line1,
                  line2: useDeliveryAddressAsBilling ? addressLine2 : billingAddress.line2,
                  city: useDeliveryAddressAsBilling ? city : billingAddress.city,
                  postal_code: useDeliveryAddressAsBilling ? postcode : billingAddress.postcode,
                },
              },
            },
          });
        }

        if (result.error) {
          throw new Error(result.error.message || "Invalid card details.");
        }

        if (result.paymentIntent?.status !== "succeeded") {
          throw new Error("Payment did not complete.");
        }

        const orderData = await storeOrderPayload({
          ...orderPayload,
          payment_intent_id: result.paymentIntent.id,
        });

        if (!orderData.success) throw new Error(orderData.error || "Failed to save order.");
        localStorage.removeItem(CHECKOUT_REDIRECT_RECOVERY_KEY);
        showCheckoutSuccess("Payment successful! Order saved.");
        router.visit(`/order-confirmed/${orderData.order_number}`);
        return;
      }

      if (paymentType === "APPLE_PAY" || paymentType === "GOOGLE_PAY") {
        const paymentRequest = stripe.paymentRequest({
          country: "GB",
          currency: "gbp",
          total: {
            label: "Order total",
            amount: totals.total_cents,
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const walletAvailable = await paymentRequest.canMakePayment();
        if (!walletAvailable) {
          throw new Error(`${paymentType === "APPLE_PAY" ? "Apple Pay" : "Google Pay"} is not available on this device/browser.`);
        }

        const paymentIntent = await new Promise<any>((resolve, reject) => {
          paymentRequest.on("paymentmethod", async (event: any) => {
            const firstConfirm = await stripe.confirmCardPayment(
              paymentData.client_secret,
              { payment_method: event.paymentMethod.id },
              { handleActions: false }
            );

            if (firstConfirm.error) {
              event.complete("fail");
              reject(new Error(firstConfirm.error.message || "Wallet payment failed."));
              return;
            }

            if (firstConfirm.paymentIntent?.status === "requires_action") {
              const next = await stripe.confirmCardPayment(paymentData.client_secret);
              if (next.error) {
                event.complete("fail");
                reject(new Error(next.error.message || "Wallet authentication failed."));
                return;
              }
              event.complete("success");
              resolve(next.paymentIntent);
              return;
            }

            event.complete("success");
            resolve(firstConfirm.paymentIntent);
          });

          paymentRequest.show();
        });

        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          throw new Error("Wallet payment did not complete.");
        }

        const orderData = await storeOrderPayload({
          ...orderPayload,
          payment_intent_id: paymentIntent.id,
        });

        if (!orderData.success) throw new Error(orderData.error || "Failed to save order.");
        localStorage.removeItem(CHECKOUT_REDIRECT_RECOVERY_KEY);
        showCheckoutSuccess("Payment successful! Order saved.");
        router.visit(`/order-confirmed/${orderData.order_number}`);
        return;
      }

      // Klarna + PayPal use redirect flow.
      localStorage.setItem(
        PENDING_REDIRECT_ORDER_KEY,
        JSON.stringify({
          clientSecret: paymentData.client_secret,
          orderPayload,
        })
      );
      saveRedirectRecoveryState();
      sessionStorage.setItem(CHECKOUT_GUEST_EMAIL_KEY, email);
      const returnUrl = `${window.location.origin}/checkout/complete`;

      if (paymentType === "KLARNA") {
        const klarnaResult = await stripe.confirmKlarnaPayment(paymentData.client_secret, {
          payment_method: {
            billing_details: {
              email,
              name: billingName,
              address: {
                country: billingCountry,
              },
            },
          },
          return_url: returnUrl,
        });

        if (klarnaResult.error) {
          throw new Error(klarnaResult.error.message || "Klarna payment failed.");
        }
        return;
      }

      const payPalResult = await stripe.confirmPayPalPayment(paymentData.client_secret, {
        payment_method: {
          billing_details: {
            email,
            name: billingName,
          },
        },
        return_url: returnUrl,
      });

      if (payPalResult.error) {
        throw new Error(payPalResult.error.message || "PayPal payment failed.");
      }
      return;
    } catch (err: any) {
      showCheckoutError(err.message || "Payment failed. Try again.");
      setError(err.message);
      setActiveSection(3);
    }

    setLoading(false);
  };

  const handleDeliveryContinue = () => {
    if (!validateDelivery()) return;
    setActiveSection(2);
  };

  const handleShippingContinue = () => {
    if (!shippingMethod) {
      showCheckoutError("Please select a delivery option.");
      return;
    }
    if (deliveryType === "TIMED" && !timedReservationId) {
      showCheckoutError("Please reserve a timed delivery slot before continuing.");
      return;
    }
    setActiveSection(3);
  };

  const sectionHeader = ({
    step,
    title,
    summary,
    hideStepNumber = false,
  }: {
    step: 1 | 2 | 3;
    title: string;
    summary?: string;
    hideStepNumber?: boolean;
  }) => {
    const isOpen = activeSection === step;
    const canEdit = step < activeSection;
    const heading = hideStepNumber ? title : `${step} - ${title}`;
    const displayText = !isOpen && summary ? summary : heading;
    const hasVisibleText = Boolean(displayText && displayText.trim());

    if (!hasVisibleText && !(canEdit && !isOpen)) {
      return null;
    }

    return (
      <div className="flex items-center justify-between">
        {hasVisibleText ? (
          <h2 className={isOpen ? "text-2xl font-semibold text-gray-900" : "text-base font-medium text-gray-800"}>
            {displayText}
          </h2>
        ) : (
          <span />
        )}
        {!isOpen && canEdit && (
          <button
            type="button"
            onClick={() => setActiveSection(step)}
            className="rounded-lg border border-[#C6A75E]/40 bg-white px-3 py-1.5 text-sm font-medium text-[#8A6D2B] transition hover:border-[#C6A75E]"
          >
            Edit
          </button>
        )}
      </div>
    );
  };

  const sectionBodyClass = (isOpen: boolean) =>
    `grid transition-all duration-500 ease-out ${
      isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
    }`;

  useLayoutEffect(() => {
    const canvas = connectorCanvasRef.current;
    const stepRail = stepRailRef.current;
    if (!canvas || !stepRail) return;
    const stepRowOffset = 12;

    const recalculateConnectors = () => {
      const rootRect = canvas.getBoundingClientRect();
      const railRect = stepRail.getBoundingClientRect();
      const nextStepOffsets: StepOffsets = { 1: 0, 2: 0, 3: 0 };
      const circleCenterX = railRect.left - rootRect.left + 16;
      const stepCenters: number[] = [];

      ([1, 2, 3] as const).forEach((step) => {
        const sectionNode = sectionCardRefs.current[step - 1];
        if (!sectionNode) return;
        const sectionRect = sectionNode.getBoundingClientRect();

        // Anchor each marker to the top edge of its matching section.
        const y2 = sectionRect.top - rootRect.top - stepRowOffset;
        stepCenters.push(y2);
        nextStepOffsets[step] = sectionRect.top - railRect.top - 16 - stepRowOffset;
      });

      setStepOffsets(nextStepOffsets);

      if (stepCenters.length > 1) {
        const minY = Math.min(...stepCenters);
        const maxY = Math.max(...stepCenters);
        setVerticalStepLinePath(`M ${circleCenterX} ${minY} L ${circleCenterX} ${maxY}`);
      } else {
        setVerticalStepLinePath("");
      }
    };

    recalculateConnectors();
    window.addEventListener("resize", recalculateConnectors);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(recalculateConnectors);
      resizeObserver.observe(canvas);
      resizeObserver.observe(stepRail);
      sectionHeaderRefs.current.forEach((node) => node && resizeObserver?.observe(node));
      sectionCardRefs.current.forEach((node) => node && resizeObserver?.observe(node));
    }

    return () => {
      window.removeEventListener("resize", recalculateConnectors);
      resizeObserver?.disconnect();
    };
  }, [activeSection, giftPackagingEnabled]);

  return (
    <form onSubmit={handleSubmit}>
      {redirectProcessingNotice && (
        <div className="mb-4 rounded-xl border border-[#C6A75E]/35 bg-[#FFFCF3] px-4 py-3 text-[#6B5A34]">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C6A75E]/60 border-t-[#C6A75E]" />
            {redirectProcessingNotice}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div ref={connectorCanvasRef} className="relative flex gap-2">
            <svg
              className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
              width="100%"
              height="100%"
              aria-hidden="true"
            >
              {verticalStepLinePath && (
                <path
                  d={verticalStepLinePath}
                  fill="none"
                  stroke="#C6A75E"
                  strokeOpacity={0.45}
                  strokeWidth={1.5}
                />
              )}
            </svg>
            <div className="hidden lg:block">
              <div ref={stepRailRef} className="relative w-10">
                {[
                  { step: 1 as const, label: "Delivery" },
                  { step: 2 as const, label: "Delivery options" },
                  { step: 3 as const, label: "Payment" },
                ].map((item) => {
                  const isActive = activeSection === item.step;
                  const isCompleted = activeSection > item.step;

                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => {
                        if (item.step < activeSection) setActiveSection(item.step);
                      }}
                      disabled={item.step > activeSection}
                      style={{ top: `${stepOffsets[item.step]}px` }}
                      className={`absolute left-0 z-10 flex items-center gap-3 text-left transition ${
                        item.step > activeSection ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                          isActive
                            ? "border-[#C6A75E] bg-[#C6A75E] text-white ring-2 ring-[#C6A75E]/25"
                            : isCompleted
                            ? "border-[#C6A75E] bg-[#F7E7BF] text-[#8A6D2B]"
                            : "border-gray-300 bg-white text-gray-500"
                        }`}
                      >
                        {item.step}
                      </span>
                      <span
                        className={`block whitespace-nowrap text-sm font-medium leading-none ${
                          isActive || isCompleted ? "text-[#8A6D2B]" : "text-gray-500"
                        }`}
                      >
                        {item.label.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 w-full space-y-6">
          <div ref={setSectionCardRef(1)} className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            <div ref={setSectionHeaderRef(1)}>
              {sectionHeader({
                step: 1,
                title: "",
                summary: deliverySummaryLine,
                hideStepNumber: true,
              })}
            </div>
            <div className={sectionBodyClass(activeSection === 1)}>
              <div className="space-y-6 overflow-hidden">
                {hasSavedAddresses && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Saved delivery addresses</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {savedAddresses.map((entry) => {
                        const isSelected = selectedSavedAddressId === entry.id;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => applySavedAddress(entry)}
                            className={`rounded-md border bg-white p-4 text-left transition min-h-[190px] ${
                              isSelected
                                ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/20"
                                : "border-[#C6A75E]/25 hover:border-[#C6A75E]/60"
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {entry.first_name} {entry.last_name}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">{entry.address_line1}</p>
                            {entry.address_line2 && <p className="text-sm text-gray-600">{entry.address_line2}</p>}
                            <p className="text-sm text-gray-600">{entry.city}</p>
                            {entry.county && <p className="text-sm text-gray-600">{entry.county}</p>}
                            <p className="text-sm text-gray-600">{entry.postcode}</p>
                            <p className="text-sm text-gray-600">{entry.country}</p>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={startNewAddressEntry}
                        className={`rounded-md border bg-white p-4 text-left transition min-h-[190px] ${
                          showNewAddressForm
                            ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/20"
                            : "border-[#C6A75E]/25 hover:border-[#C6A75E]/60"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">Add new address</p>
                        <p className="mt-1 text-sm text-gray-600">Use a different delivery address for this order.</p>
                      </button>
                    </div>
                  </div>
                )}

                {!showSavedAddressSummary && (
                  <>
                    <ContactInfo
                      invalidFields={invalidFields}
                      fieldErrors={fieldErrors}
                      onFieldValueChange={handleFieldValueChange}
                    />
                    <DeliveryInfo
                      invalidFields={invalidFields}
                      fieldErrors={fieldErrors}
                      onFieldValueChange={handleFieldValueChange}
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={handleDeliveryContinue}
                  className="w-full rounded-xl bg-[#C6A75E] py-3 font-semibold text-white transition hover:bg-[#B8994E]"
                >
                  Continue to delivery options
                </button>
              </div>
            </div>
          </div>

          <div ref={setSectionCardRef(2)} className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            <div ref={setSectionHeaderRef(2)}>
              {sectionHeader({
                step: 2,
                title: "",
                summary: deliveryOptionsSummaryLine,
                hideStepNumber: true,
              })}
            </div>
            <div className={sectionBodyClass(activeSection === 2)}>
              <div className="space-y-6 overflow-hidden">
                <ShippingMethod />

                <div
                  className={`grid transition-all duration-500 ease-out ${
                    showGiftPackagingPanel
                      ? "grid-rows-[1fr] opacity-100 mt-1"
                      : "grid-rows-[0fr] opacity-0 mt-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`space-y-4 p-0 transition-transform duration-500 ${
                        showGiftPackagingPanel ? "translate-y-0" : "-translate-y-2"
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                        <div className="p-0">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={giftPackagingEnabled}
                              onChange={(e) => setGiftPackagingEnabled(e.target.checked)}
                              className="mt-1 h-5 w-5 rounded border-gray-300 text-[#C6A75E] focus:ring-[#C6A75E]"
                            />
                            <div>
                              <p className="text-lg font-semibold text-gray-900">Add gift packaging for an extra £10</p>
                              <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                                <li>Optional gift message</li>
                                <li>Gift receipt included</li>
                                <li>All price tags removed from gift items</li>
                                <li>Gift wrapped in luxury packaging</li>
                              </ul>
                            </div>
                          </label>

                          {giftPackagingEnabled && (
                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                Gift message (optional)
                              </label>
                              <textarea
                                value={giftMessage}
                                onChange={(e) => setGiftMessage(e.target.value)}
                                rows={4}
                                maxLength={240}
                                placeholder="Write your gift message..."
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#C6A75E] focus:outline-none focus:ring-2 focus:ring-[#C6A75E]/25"
                              />
                            </div>
                          )}
                        </div>

                        <div className="self-start lg:w-full">
                          <img loading="lazy" decoding="async"
                            src="/images/Gift-Wrapping.jpeg"
                            alt="Gift wrapping example"
                            className="h-[320px] w-full rounded-2xl object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShippingContinue}
                  className="w-full rounded-xl bg-[#C6A75E] py-3 font-semibold text-white transition hover:bg-[#B8994E]"
                >
                  Continue to payment
                </button>
              </div>
            </div>
          </div>

          <div ref={setSectionCardRef(3)} className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            <div ref={setSectionHeaderRef(3)}>
              {sectionHeader({
                step: 3,
                title: "",
                summary: "Payment details",
                hideStepNumber: true,
              })}
            </div>
            <div className={sectionBodyClass(activeSection === 3)}>
              <div className="space-y-6 overflow-hidden">
                <CheckoutPaymentProvider
                  value={{
                    paymentType,
                    setPaymentType,
                    orderTotalCents: totals.total_cents,
                    savedPaymentMethods,
                    selectedSavedPaymentMethodId,
                    setSelectedSavedPaymentMethodId,
                    cardholderName,
                    setCardholderName,
                    savedCardCvcComplete,
                    setSavedCardCvcComplete,
                    useDeliveryAddressAsBilling,
                    setUseDeliveryAddressAsBilling,
                    deliveryAddressSummary,
                    billingAddress,
                    setBillingAddress,
                    termsAccepted,
                    setTermsAccepted,
                  }}
                >
                  <PaymentSection />
                </CheckoutPaymentProvider>
                <div className="flex justify-end">
                  {paymentType !== "KLARNA" && paymentType !== "APPLE_PAY" && paymentType !== "GOOGLE_PAY" && (
                    <button
                      type="submit"
                      disabled={
                        loading
                        || (paymentType === "CARD"
                          && (!stripe || !elements || (selectedSavedPaymentMethodId && !savedCardCvcComplete)))
                      }
                      className="w-full rounded-xl bg-[#C6A75E] py-3 font-semibold text-white transition hover:bg-[#B8994E] disabled:cursor-not-allowed disabled:opacity-60 md:w-1/2"
                    >
                      {loading && paymentType === "CARD" ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
                          Processing card payment...
                        </span>
                      ) : (
                        "Pay now"
                      )}
                    </button>
                  )}
                </div>
                {loading && paymentType === "CARD" && (
                  <p className="text-sm text-[#8A6D2B] md:text-right">
                    Securely connecting to your bank. Please do not refresh or close this page.
                  </p>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <OrderSummary giftPackagingEnabled={giftPackagingEnabled} giftPackagingCost={giftPackagingCost} />
        </div>
      </div>
      <div className="mt-5 border-t border-[#C6A75E]/30 pt-2 text-[13px] leading-[1.25] text-gray-600">
        <div className="pt-1 text-left">
          <p className="font-medium text-gray-700">Bear Lane</p>
          <p className="mt-0.5 text-gray-600">Chelmsford, Essex, United Kingdom</p>
          <p className="mt-1">© 2026 Bear Lane. All rights reserved.</p>
          <p className="mt-2">
            By placing an order, you confirm that you have the necessary rights, permissions, or licenses to use
            any logos, images, text, or artwork submitted to Bear Lane for embroidery. Bear Lane reserves the right
            to refuse any design that is unlawful, offensive, infringes intellectual property rights, or otherwise
            violates applicable regulations.
          </p>
          <p className="mt-1.5">
            All products are made to order. Due to the personalised nature of embroidered items, returns or exchanges
            may not be accepted unless the product is faulty or incorrect. While we take care to accurately reproduce
            submitted designs, slight variations in colour, size, and stitching may occur due to the embroidery process.
          </p>
          <p className="mt-1.5">
            Bear Lane is not responsible for customer-submitted design errors, including spelling, layout, or artwork
            quality issues. Please ensure all details are reviewed carefully before confirming your order.
          </p>
        </div>
      </div>
    </form>
  );
};

export default CheckoutForm;
