import React from "react";
import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";
import { Autocomplete } from "@react-google-maps/api";
import { FaApple, FaCreditCard, FaPaypal } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { getCountryCode } from "@/Utils/countryCodes";
import { useCheckoutPayment } from "../context/CheckoutPaymentContext";
import type { BillingAddress, PaymentType } from "../types";
import { showCheckoutError } from "../checkoutToasts";
import useGoogleMapsScript from "@/Utils/useGoogleMapsScript";
type SavedBillingAddress = BillingAddress & { id: string };
type BillingModalField = "firstName" | "lastName" | "country" | "line1" | "city" | "postcode";
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];
const BILLING_COUNTRIES = [
  "Australia",
  "Austria",
  "Belgium",
  "Canada",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malaysia",
  "Malta",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Philippines",
  "Poland",
  "Portugal",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
];

export default function PaymentSection() {
  const {
    paymentType,
    setPaymentType,
    orderTotalCents,
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
  } = useCheckoutPayment();
  const DEFAULT_BILLING_KEY = "billing-default";
  const [isAddingNewBilling, setIsAddingNewBilling] = React.useState(false);
  const [draftBillingAddress, setDraftBillingAddress] = React.useState<BillingAddress>(billingAddress);
  const [savedBillingAddresses, setSavedBillingAddresses] = React.useState<SavedBillingAddress[]>([]);
  const [selectedBillingKey, setSelectedBillingKey] = React.useState<string>(DEFAULT_BILLING_KEY);
  const [billingAutocomplete, setBillingAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const [billingLookupValue, setBillingLookupValue] = React.useState("");
  const [billingManualEntry, setBillingManualEntry] = React.useState(false);
  const [modalInvalidFields, setModalInvalidFields] = React.useState<Set<BillingModalField>>(new Set());
  const [modalFieldErrors, setModalFieldErrors] = React.useState<Partial<Record<BillingModalField, string>>>({});
  const [walletInfoModalOpen, setWalletInfoModalOpen] = React.useState(false);
  const [pendingWalletSelection, setPendingWalletSelection] = React.useState<number | "new" | null>(null);
  const [walletSelectionMode, setWalletSelectionMode] = React.useState<"saved" | "new" | null>(null);
  const sectionRootRef = React.useRef<HTMLDivElement | null>(null);
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";
  const canUseGoogleAddressLookup = googleMapsApiKey.length > 0;

  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } = useGoogleMapsScript({
    enabled: canUseGoogleAddressLookup,
    apiKey: googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const isCompleteBillingAddress = React.useCallback((value: BillingAddress) => {
    return Boolean(
      value.firstName
        && value.lastName
        && value.line1
        && value.city
        && value.county
        && value.postcode
        && value.country
    );
  }, []);

  const billingLines = React.useCallback((value: BillingAddress) => {
    return [
      `${value.firstName} ${value.lastName}`.trim(),
      value.line1,
      value.line2,
      value.city,
      value.county,
      value.postcode,
      value.country,
    ].filter((line) => Boolean(line && String(line).trim()));
  }, []);

  React.useEffect(() => {
    setDraftBillingAddress(billingAddress);
  }, [billingAddress]);

  React.useEffect(() => {
    if (!billingAutocomplete) return;
    const isoCountry = getCountryCode(draftBillingAddress.country || billingAddress.country);
    if (isoCountry) {
      billingAutocomplete.setComponentRestrictions({ country: isoCountry });
    }
  }, [billingAutocomplete, draftBillingAddress.country, billingAddress.country]);

  React.useEffect(() => {
    if (useDeliveryAddressAsBilling) {
      setSelectedBillingKey(DEFAULT_BILLING_KEY);
    }
  }, [useDeliveryAddressAsBilling]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isAddingNewBilling) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }

    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, [isAddingNewBilling]);

  React.useEffect(() => {
    if (paymentType !== "PAYPAL" && paymentType !== "KLARNA") {
      setWalletSelectionMode(null);
    }
  }, [paymentType]);

  const cardStyle = {
    style: {
      base: {
        color: "#111827",
        iconColor: "#6b7280",
        fontSize: "16px",
        fontFamily: "system-ui, sans-serif",
        "::placeholder": { color: "#9ca3af" },
      },
      invalid: { color: "#dc2626" },
    },
  };
  const cardFieldClass =
    "w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus-within:border-[#C6A75E] focus-within:ring-2 focus-within:ring-[#C6A75E]/25";

  const paymentTypeButtonClass = (type: PaymentType, size: "default" | "short" = "default") =>
    `flex w-full items-center gap-3 rounded-md border px-4 text-left transition ${
      paymentType === type
        ? "border-[#C6A75E] bg-[#FCF7EB] text-[#8A6D2B] ring-2 ring-[#C6A75E]/25"
        : "border-gray-300 bg-white text-gray-700 hover:border-[#C6A75E]/60"
    } ${size === "short" ? "min-h-[52px] py-2" : "min-h-[88px] py-4"}`;

  const symbolWrapClass = "flex h-8 w-8 shrink-0 items-center justify-center";
  const deliveryLines = deliveryAddressSummary
    .split(",")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const billingCardClass = (isSelected: boolean) =>
    `w-full rounded-md border bg-white px-3 py-3 text-left transition overflow-auto ${
      isSelected
        ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/20"
        : "border-gray-300 hover:border-[#C6A75E]/60"
    }`;

  const gbpFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }),
    []
  );
  const selectedSavedPaymentMethod = React.useMemo(
    () =>
      selectedSavedPaymentMethodId
        ? savedPaymentMethods.find((method) => method.id === selectedSavedPaymentMethodId) || null
        : null,
    [savedPaymentMethods, selectedSavedPaymentMethodId]
  );
  const savedCardMethods = React.useMemo(
    () => savedPaymentMethods.filter((method) => (method.provider_type || "card") === "card"),
    [savedPaymentMethods]
  );
  const savedWalletMethods = React.useMemo(() => {
    if (paymentType === "PAYPAL") {
      return savedPaymentMethods.filter((method) => method.provider_type === "paypal");
    }
    if (paymentType === "KLARNA") {
      return savedPaymentMethods.filter((method) => method.provider_type === "klarna");
    }
    return [];
  }, [paymentType, savedPaymentMethods]);

  const klarnaInstallmentLabel = React.useMemo(() => {
    if (!Number.isFinite(orderTotalCents) || orderTotalCents <= 0) {
      return gbpFormatter.format(0);
    }
    const installmentCents = Math.max(0, Math.round(orderTotalCents / 3));
    return gbpFormatter.format(installmentCents / 100);
  }, [gbpFormatter, orderTotalCents]);

  const openAddBillingModal = () => {
    setDraftBillingAddress({
      firstName: "",
      lastName: "",
      line1: "",
      line2: "",
      city: "",
      county: "",
      postcode: "",
      country: "",
    });
    setBillingLookupValue("");
    setBillingManualEntry(false);
    setModalInvalidFields(new Set());
    setModalFieldErrors({});
    setIsAddingNewBilling(true);
  };

  const selectDefaultBilling = () => {
    setSelectedBillingKey(DEFAULT_BILLING_KEY);
    setUseDeliveryAddressAsBilling(true);
  };

  const selectSavedBilling = (entry: SavedBillingAddress) => {
    setSelectedBillingKey(entry.id);
    setBillingAddress({
      firstName: entry.firstName,
      lastName: entry.lastName,
      line1: entry.line1,
      line2: entry.line2,
      city: entry.city,
      county: entry.county,
      postcode: entry.postcode,
      country: entry.country,
    });
    setUseDeliveryAddressAsBilling(false);
  };

  const saveDraftBillingAddress = () => {
    const nextInvalidFields = new Set<BillingModalField>();
    const nextFieldErrors: Partial<Record<BillingModalField, string>> = {};

    const markFieldError = (field: BillingModalField, message: string) => {
      nextInvalidFields.add(field);
      nextFieldErrors[field] = message;
    };

    if (!draftBillingAddress.firstName.trim()) {
      markFieldError("firstName", "Please enter first name.");
    }
    if (!draftBillingAddress.lastName.trim()) {
      markFieldError("lastName", "Please enter last name.");
    }
    if (!draftBillingAddress.country.trim()) {
      markFieldError("country", "Please select country or region.");
    }
    if (!draftBillingAddress.line1.trim()) {
      markFieldError("line1", "Please enter address line 1.");
    }
    if (!draftBillingAddress.city.trim()) {
      markFieldError("city", "Please enter town/city.");
    }
    if (!draftBillingAddress.postcode.trim()) {
      markFieldError("postcode", "Please enter postcode.");
    }

    if (nextInvalidFields.size > 0) {
      setModalInvalidFields(nextInvalidFields);
      setModalFieldErrors(nextFieldErrors);
      showCheckoutError("Please fill in the missing fields.");
      return;
    }

    if (
      !draftBillingAddress.firstName
      || !draftBillingAddress.lastName
      || !draftBillingAddress.line1
      || !draftBillingAddress.city
      || !draftBillingAddress.county
      || !draftBillingAddress.postcode
      || !draftBillingAddress.country
    ) {
      return;
    }

    const normalizedDraft = [
      draftBillingAddress.firstName,
      draftBillingAddress.lastName,
      draftBillingAddress.line1,
      draftBillingAddress.line2,
      draftBillingAddress.city,
      draftBillingAddress.county,
      draftBillingAddress.postcode,
      draftBillingAddress.country,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");
    const normalizedDefaultBilling = deliveryLines
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    if (normalizedDraft === normalizedDefaultBilling) {
      setUseDeliveryAddressAsBilling(true);
      setSelectedBillingKey(DEFAULT_BILLING_KEY);
      setIsAddingNewBilling(false);
      return;
    }

    let selectedId: string | null = null;

    setSavedBillingAddresses((prev) => {
      const existing = prev.find((entry) => {
        const normalizedExisting = [
          entry.firstName,
          entry.lastName,
          entry.line1,
          entry.line2,
          entry.city,
          entry.county,
          entry.postcode,
          entry.country,
        ]
          .map((value) => String(value || "").trim().toLowerCase())
          .join("|");

        return normalizedExisting === normalizedDraft;
      });

      if (existing) {
        selectedId = existing.id;
        return prev;
      }

      const newEntry: SavedBillingAddress = {
        ...draftBillingAddress,
        id: `billing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      selectedId = newEntry.id;
      return [...prev, newEntry];
    });

    setBillingAddress(draftBillingAddress);
    setUseDeliveryAddressAsBilling(false);
    if (selectedId) {
      setSelectedBillingKey(selectedId);
    }
    setModalInvalidFields(new Set());
    setModalFieldErrors({});
    setIsAddingNewBilling(false);
  };

  const modalInputClass = (field: BillingModalField) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none ${
      modalInvalidFields.has(field)
        ? "animate-checkout-shake border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200"
        : "border-[#C6A75E]/35 focus:border-[#C6A75E]"
    }`;
  const modalErrorClass = "min-h-[20px] text-sm text-red-600";

  const updateDraftField = (field: keyof BillingAddress, value: string) => {
    setDraftBillingAddress((prev) => ({ ...prev, [field]: value }));

    if (field === "firstName" || field === "lastName" || field === "country" || field === "line1" || field === "city" || field === "postcode") {
      const modalField = field as BillingModalField;
      setModalInvalidFields((prev) => {
        if (!prev.has(modalField)) return prev;
        const next = new Set(prev);
        next.delete(modalField);
        return next;
      });
      setModalFieldErrors((prev) => {
        if (!prev[modalField]) return prev;
        const next = { ...prev };
        delete next[modalField];
        return next;
      });
    }
  };

  const handleBillingAddressPick = () => {
    if (!billingAutocomplete) return;

    const place = billingAutocomplete.getPlace();
    if (!place?.address_components) return;

    const components = place.address_components;
    const streetNumber = components.find((c) => c.types.includes("street_number"))?.long_name || "";
    const route = components.find((c) => c.types.includes("route"))?.long_name || "";
    const locality =
      components.find((c) => c.types.includes("locality"))?.long_name ||
      components.find((c) => c.types.includes("postal_town"))?.long_name ||
      "";
    const county =
      components.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ||
      components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name ||
      "";
    const postcode = components.find((c) => c.types.includes("postal_code"))?.long_name || "";
    const detectedCountry = components.find((c) => c.types.includes("country"))?.long_name || "";

    const line1 = `${streetNumber} ${route}`.trim() || draftBillingAddress.line1;

    setDraftBillingAddress((prev) => ({
      ...prev,
      line1,
      city: locality || prev.city,
      county: county || prev.county,
      postcode: postcode || prev.postcode,
      country: detectedCountry || prev.country,
    }));

    setBillingLookupValue(place.formatted_address || line1);
  };

  const handlePayPalPick = () => {
    setPaymentType("PAYPAL");
    setSelectedSavedPaymentMethodId(null);
    setSavedCardCvcComplete(false);
    setPendingWalletSelection(null);
    setWalletSelectionMode(null);
    setWalletInfoModalOpen(false);
  };

  const handleWalletDirectPick = (type: "APPLE_PAY" | "GOOGLE_PAY") => {
    setWalletInfoModalOpen(false);
    setPaymentType(type);
  };

  const continueWalletPayment = () => {
    if (pendingWalletSelection === "new") {
      setSelectedSavedPaymentMethodId(null);
      setWalletSelectionMode("new");
    } else if (typeof pendingWalletSelection === "number") {
      setSelectedSavedPaymentMethodId(pendingWalletSelection);
      setWalletSelectionMode("saved");
    }
    setSavedCardCvcComplete(false);
    setWalletInfoModalOpen(false);
    setPendingWalletSelection(null);
    const parentForm = sectionRootRef.current?.closest("form");
    if (parentForm) {
      parentForm.requestSubmit();
    }
  };

  return (
    <div ref={sectionRootRef} className="p-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Choose a payment type</h2>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-start-1">
          <div
            className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              paymentType === "KLARNA"
                ? "max-h-0 -translate-y-2 opacity-0"
                : "max-h-[88px] translate-y-0 opacity-100"
            }`}
          >
            <button
              type="button"
              className={paymentTypeButtonClass("KLARNA", "short")}
              onClick={() => setPaymentType("KLARNA")}
            >
              <span className="flex items-center gap-2">
                <span className="block text-sm font-semibold">Pay with</span>
                <span className="rounded-md bg-[#FFB3C7] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                  Klarna
                </span>
              </span>
            </button>
          </div>

          <div
            className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              paymentType === "KLARNA" ? "mt-0 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl border border-[#C6A75E]/30 bg-[#FFFCF3] p-4">
                <div className="mb-3">
                  <span className="inline-block rounded-md bg-[#FFB3C7] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                    Klarna
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  3 payments of {klarnaInstallmentLabel} at 0% interest with Klarna
                </p>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-[#FFB3C7] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff9fbb]"
                >
                  Pay with Klarna
                </button>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  You will be redirected to Klarna, where you can complete your purchase securely. For orders paid with Klarna, returns must be made by post.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:block" />

        <button type="button" className={paymentTypeButtonClass("CARD")} onClick={() => setPaymentType("CARD")}>
          <span className={`${symbolWrapClass} text-black`}>
            <FaCreditCard size={19} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Credit or debit card</span>
          </span>
        </button>
        <button type="button" className={paymentTypeButtonClass("PAYPAL")} onClick={handlePayPalPick}>
          <span className={`${symbolWrapClass} text-[#003087]`}>
            <FaPaypal size={21} />
          </span>
          <span className="block text-sm font-semibold">PayPal</span>
        </button>
        <button type="button" className={paymentTypeButtonClass("APPLE_PAY")} onClick={() => handleWalletDirectPick("APPLE_PAY")}>
          <span className={`${symbolWrapClass} text-black`}>
            <FaApple size={21} />
          </span>
          <span className="block text-sm font-semibold">Apple Pay</span>
        </button>
        <button type="button" className={paymentTypeButtonClass("GOOGLE_PAY")} onClick={() => handleWalletDirectPick("GOOGLE_PAY")}>
          <span className={symbolWrapClass}>
            <FcGoogle size={18} />
          </span>
          <span className="block text-sm font-semibold">Google Pay</span>
        </button>
      </div>

      {walletInfoModalOpen && paymentType === "PAYPAL" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#C6A75E]/35 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className="border-b border-[#C6A75E]/25 bg-gradient-to-r from-[#FFFCF3] to-white px-6 py-4">
              <h3 className="text-2xl font-semibold text-gray-900">Making payments with PayPal</h3>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-relaxed text-gray-700">
                PayPal refunds differ depending on how you return your item(s) to Bear Lane.
              </p>
              <a
                href="/help/returns#return-policy"
                className="inline-block text-sm font-semibold text-[#8A6D2B] underline underline-offset-4"
              >
                PayPal returns policy
              </a>
              <p className="text-sm leading-relaxed text-gray-700">
                Orders paid for by PayPal and returned by post will be returned to the same PayPal account.
              </p>
              <p className="text-sm leading-relaxed text-gray-700">
                See our full returns policy{" "}
                <a href="/help/returns" className="font-semibold text-[#8A6D2B] underline underline-offset-4">
                  here
                </a>.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-[#C6A75E]/25 bg-[#FFFCF3] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setWalletInfoModalOpen(false);
                  setPendingWalletSelection(null);
                }}
                className="rounded-lg border border-[#C6A75E]/45 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#C6A75E]/80"
              >
                No, cancel
              </button>
              <button
                type="button"
                onClick={continueWalletPayment}
                className="rounded-lg bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E]"
              >
                Continue To PayPal
              </button>
            </div>
          </div>
        </div>
      )}

      {(paymentType === "PAYPAL" || paymentType === "KLARNA") && savedWalletMethods.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Saved {paymentType === "PAYPAL" ? "PayPal" : "Klarna"} methods
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {savedWalletMethods.map((method) => {
              const isSelected = selectedSavedPaymentMethodId === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    if (paymentType === "PAYPAL") {
                      setPendingWalletSelection(method.id);
                      setWalletInfoModalOpen(true);
                      return;
                    }
                    setSelectedSavedPaymentMethodId(method.id);
                    setWalletSelectionMode("saved");
                    setSavedCardCvcComplete(false);
                  }}
                  className={`rounded-xl border bg-white p-3 text-left transition ${
                    isSelected
                      ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/20"
                      : "border-[#C6A75E]/30 hover:border-[#C6A75E]/60"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {(method.provider_type || "").toUpperCase()} linked account
                  </p>
                  {method.is_default && <p className="mt-1 text-xs font-medium text-[#8A6D2B]">Default method</p>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (paymentType === "PAYPAL") {
                setPendingWalletSelection("new");
                setWalletInfoModalOpen(true);
                return;
              }
              setSelectedSavedPaymentMethodId(null);
              setWalletSelectionMode("new");
              setSavedCardCvcComplete(false);
            }}
            className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              walletSelectionMode === "new"
                ? "border-[#C6A75E] bg-[#FCF7EB] text-[#8A6D2B]"
                : "border-gray-300 bg-white text-gray-700 hover:border-[#C6A75E]/60"
            }`}
          >
            Use a new {paymentType === "PAYPAL" ? "PayPal" : "Klarna"} account
          </button>
        </div>
      )}

      {paymentType === "CARD" && (
      <>
      {savedCardMethods.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">Saved cards</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {savedCardMethods.map((method) => {
              const isSelected = selectedSavedPaymentMethodId === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedSavedPaymentMethodId(method.id)}
                  className={`rounded-xl border bg-white p-3 text-left transition ${
                    isSelected
                      ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/20"
                      : "border-[#C6A75E]/30 hover:border-[#C6A75E]/60"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {method.brand ? method.brand.toUpperCase() : "Card"} •••• {method.last4 || "----"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Expires {String(method.exp_month || "--").padStart(2, "0")}/{method.exp_year || "----"}
                  </p>
                  {method.is_default && <p className="mt-1 text-xs font-medium text-[#8A6D2B]">Default card</p>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSavedPaymentMethodId(null);
              setSavedCardCvcComplete(false);
              setCardholderName("");
            }}
            className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              selectedSavedPaymentMethodId === null
                ? "border-[#C6A75E] bg-[#FCF7EB] text-[#8A6D2B]"
                : "border-gray-300 bg-white text-gray-700 hover:border-[#C6A75E]/60"
            }`}
          >
            Use a new card
          </button>
        </div>
      )}

      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-gray-900">Billing address</p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button type="button" onClick={selectDefaultBilling} className={billingCardClass(selectedBillingKey === DEFAULT_BILLING_KEY)}>
            <p className="text-sm font-semibold text-gray-900">Billing address</p>
            <div className="mt-2 space-y-1">
              {deliveryLines.map((line) => (
                <p key={`billing-default-${line}`} className="text-sm leading-5 text-gray-600">
                  {line}
                </p>
              ))}
            </div>
          </button>

          {savedBillingAddresses.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => selectSavedBilling(entry)}
              className={billingCardClass(selectedBillingKey === entry.id)}
            >
              <p className="text-sm font-semibold text-gray-900">Billing address</p>
              <div className="mt-2 space-y-1">
                {billingLines(entry).map((line) => (
                  <p key={`${entry.id}-${line}`} className="text-sm leading-5 text-gray-600">
                    {line}
                  </p>
                ))}
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openAddBillingModal}
          className="mt-3 w-full rounded-lg border border-[#C6A75E]/35 bg-white px-4 py-3 text-left text-sm font-medium text-[#8A6D2B] transition hover:border-[#C6A75E] md:w-1/2"
        >
          Add new billing address
        </button>
      </div>

      {isAddingNewBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#C6A75E]/25 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add new billing address</h3>
              <button
                type="button"
                onClick={() => setIsAddingNewBilling(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-[#C6A75E]/60"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="First name"
                  value={draftBillingAddress.firstName}
                  onChange={(e) => updateDraftField("firstName", e.target.value)}
                  className={modalInputClass("firstName")}
                />
                <p className={modalErrorClass}>{modalFieldErrors.firstName || "\u00A0"}</p>
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Last name"
                  value={draftBillingAddress.lastName}
                  onChange={(e) => updateDraftField("lastName", e.target.value)}
                  className={modalInputClass("lastName")}
                />
                <p className={modalErrorClass}>{modalFieldErrors.lastName || "\u00A0"}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <select
                  value={draftBillingAddress.country}
                  onChange={(e) => updateDraftField("country", e.target.value)}
                  className={modalInputClass("country")}
                >
                  <option value="">Country or region</option>
                  {BILLING_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <p className={modalErrorClass}>{modalFieldErrors.country || "\u00A0"}</p>
              </div>

              {!billingManualEntry && canUseGoogleAddressLookup && isGoogleLoaded && !googleLoadError ? (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Add your postcode or address *</label>
                  <Autocomplete onLoad={setBillingAutocomplete} onPlaceChanged={handleBillingAddressPick}>
                    <input
                      type="text"
                      placeholder="Add your postcode or address"
                      value={billingLookupValue}
                      onChange={(e) => setBillingLookupValue(e.target.value)}
                      className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none"
                    />
                  </Autocomplete>
                  <button
                    type="button"
                    onClick={() => setBillingManualEntry(true)}
                    className="mt-2 text-sm text-[#8A6D2B] underline underline-offset-4"
                  >
                    Enter address manually
                  </button>
                </div>
              ) : null}
              {!billingManualEntry && canUseGoogleAddressLookup && googleLoadError ? (
                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Address lookup is temporarily unavailable. Please enter the billing address manually.
                </div>
              ) : null}

              {billingManualEntry && (
                <>
                  <div className="space-y-1 md:col-span-2">
                    <input
                      type="text"
                      placeholder="Address line 1*"
                      value={draftBillingAddress.line1}
                      onChange={(e) => updateDraftField("line1", e.target.value)}
                      className={modalInputClass("line1")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.line1 || "\u00A0"}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Address line 2"
                    value={draftBillingAddress.line2}
                    onChange={(e) => updateDraftField("line2", e.target.value)}
                    className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none md:col-span-2"
                  />
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Town City*"
                      value={draftBillingAddress.city}
                      onChange={(e) => updateDraftField("city", e.target.value)}
                      className={modalInputClass("city")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.city || "\u00A0"}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="County"
                    value={draftBillingAddress.county}
                    onChange={(e) => updateDraftField("county", e.target.value)}
                    className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none"
                  />
                  <div className="space-y-1 md:col-span-2">
                    <input
                      type="text"
                      placeholder="Postcode *"
                      value={draftBillingAddress.postcode}
                      onChange={(e) => updateDraftField("postcode", e.target.value)}
                      className={modalInputClass("postcode")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.postcode || "\u00A0"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBillingManualEntry(false)}
                    className="text-left text-sm text-[#8A6D2B] underline underline-offset-4 md:col-span-2"
                  >
                    Back to lookup address
                  </button>
                </>
              )}

              {!billingManualEntry && (
                <>
                  <div className="space-y-1 md:col-span-2">
                    <input
                      type="text"
                      placeholder="Address line 1*"
                      value={draftBillingAddress.line1}
                      onChange={(e) => updateDraftField("line1", e.target.value)}
                      className={modalInputClass("line1")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.line1 || "\u00A0"}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Address line 2"
                    value={draftBillingAddress.line2}
                    onChange={(e) => updateDraftField("line2", e.target.value)}
                    className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none md:col-span-2"
                  />
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Town City*"
                      value={draftBillingAddress.city}
                      onChange={(e) => updateDraftField("city", e.target.value)}
                      className={modalInputClass("city")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.city || "\u00A0"}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="County"
                    value={draftBillingAddress.county}
                    onChange={(e) => updateDraftField("county", e.target.value)}
                    className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none"
                  />
                  <div className="space-y-1 md:col-span-2">
                    <input
                      type="text"
                      placeholder="Postcode *"
                      value={draftBillingAddress.postcode}
                      onChange={(e) => updateDraftField("postcode", e.target.value)}
                      className={modalInputClass("postcode")}
                    />
                    <p className={modalErrorClass}>{modalFieldErrors.postcode || "\u00A0"}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNewBilling(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#C6A75E]/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraftBillingAddress}
                className="rounded-lg bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B8994E]"
              >
                Save billing address
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSavedPaymentMethod ? (
        <div className="mb-6 rounded-xl border border-[#C6A75E]/30 bg-[#FFFCF3] p-4">
          <p className="text-sm font-semibold text-gray-900">
            {(selectedSavedPaymentMethod.provider_type || "card") === "card"
              ? `Using saved card: ${selectedSavedPaymentMethod.brand?.toUpperCase() || "Card"} •••• ${selectedSavedPaymentMethod.last4 || "----"}`
              : `Using linked ${(selectedSavedPaymentMethod.provider_type || "").toUpperCase()} account`}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            You can switch to a new payment method anytime.
          </p>
          {(selectedSavedPaymentMethod.provider_type || "card") === "card" && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Confirm CVC</p>
              <div className={cardFieldClass}>
                <CardCvcElement
                  options={cardStyle}
                  onChange={(event) => setSavedCardCvcComplete(Boolean(event.complete))}
                />
              </div>
              {!savedCardCvcComplete && (
                <p className="text-xs text-[#8A6D2B]">Enter your 3-digit CVC to continue.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Cardholder Name"
            className="w-full rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:outline-none"
          />

          <div className={cardFieldClass}>
            <CardNumberElement options={cardStyle} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className={cardFieldClass}>
              <CardExpiryElement options={cardStyle} />
            </div>
            <div className={cardFieldClass}>
              <CardCvcElement options={cardStyle} />
            </div>
          </div>
        </div>
      )}

      </>
      )}
      <label className="mb-6 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>I have read the terms and conditions.</span>
      </label>

      {(paymentType === "APPLE_PAY" || paymentType === "GOOGLE_PAY") && (
        <div className="mb-6">
          <button
            type="submit"
            disabled={!termsAccepted}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#C6A75E]/40 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-[#C6A75E] hover:bg-[#FFFCF3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Continue with</span>
            {paymentType === "APPLE_PAY" ? <FaApple size={16} /> : <FcGoogle size={16} />}
            <span>Pay</span>
          </button>
          <p className="mt-2 text-xs text-gray-600">
            {termsAccepted
              ? "You will continue in a secure payment sheet."
              : "Please accept the terms and conditions to continue."}
          </p>
        </div>
      )}
    </div>
  );
}
