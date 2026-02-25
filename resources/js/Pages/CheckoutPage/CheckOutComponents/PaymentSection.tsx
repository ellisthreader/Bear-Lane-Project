import React from "react";
import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";
import { FaApple, FaCreditCard, FaGoogle, FaPaypal } from "react-icons/fa";
import { getCountryCode } from "@/Utils/countryCodes";
import { showCheckoutError } from "../checkoutToasts";

type PaymentType = "KLARNA" | "CARD" | "PAYPAL" | "APPLE_PAY" | "GOOGLE_PAY";

type BillingAddress = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
};
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

type PaymentSectionProps = {
  paymentType: PaymentType | null;
  onPaymentTypeChange: (value: PaymentType | null) => void;
  cardholderName: string;
  onCardholderNameChange: (value: string) => void;
  useDeliveryAddressAsBilling: boolean;
  onUseDeliveryAddressAsBillingChange: (value: boolean) => void;
  deliveryAddressSummary: string;
  billingAddress: BillingAddress;
  onBillingAddressChange: (value: BillingAddress) => void;
  termsAccepted: boolean;
  onTermsAcceptedChange: (value: boolean) => void;
};

export default function PaymentSection({
  paymentType,
  onPaymentTypeChange,
  cardholderName,
  onCardholderNameChange,
  useDeliveryAddressAsBilling,
  onUseDeliveryAddressAsBillingChange,
  deliveryAddressSummary,
  billingAddress,
  onBillingAddressChange,
  termsAccepted,
  onTermsAcceptedChange,
}: PaymentSectionProps) {
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

  const { isLoaded: isGoogleLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
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

  const paymentTypeButtonClass = (type: PaymentType, compact = false) =>
    `flex w-full items-center gap-3 rounded-md border px-4 text-left transition ${
      paymentType === type
        ? "border-[#C6A75E] bg-[#FCF7EB] text-[#8A6D2B] ring-2 ring-[#C6A75E]/25"
        : "border-gray-300 bg-white text-gray-700 hover:border-[#C6A75E]/60"
    } ${compact ? "min-h-[50px] py-1.5" : "min-h-[88px] py-4"}`;

  const symbolWrapClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E6BF] text-[#6F5724]";
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
    onUseDeliveryAddressAsBillingChange(true);
  };

  const selectSavedBilling = (entry: SavedBillingAddress) => {
    setSelectedBillingKey(entry.id);
    onBillingAddressChange({
      firstName: entry.firstName,
      lastName: entry.lastName,
      line1: entry.line1,
      line2: entry.line2,
      city: entry.city,
      county: entry.county,
      postcode: entry.postcode,
      country: entry.country,
    });
    onUseDeliveryAddressAsBillingChange(false);
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
      onUseDeliveryAddressAsBillingChange(true);
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

    onBillingAddressChange(draftBillingAddress);
    onUseDeliveryAddressAsBillingChange(false);
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
        ? "checkout-field-error checkout-field-shake border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200"
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

  return (
    <div className="p-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Choose a payment type</h2>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button type="button" className={paymentTypeButtonClass("KLARNA", true)} onClick={() => onPaymentTypeChange("KLARNA")}>
          <span className={symbolWrapClass}>
            <span className="text-base font-bold">K</span>
          </span>
          <span className="block text-sm font-semibold">Klarna</span>
        </button>
        <div className="hidden md:block" />

        <button type="button" className={paymentTypeButtonClass("CARD")} onClick={() => onPaymentTypeChange("CARD")}>
          <span className={symbolWrapClass}>
            <FaCreditCard size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Credit or debit card</span>
          </span>
        </button>
        <button type="button" className={paymentTypeButtonClass("PAYPAL")} onClick={() => onPaymentTypeChange("PAYPAL")}>
          <span className={symbolWrapClass}>
            <FaPaypal size={21} />
          </span>
          <span className="block text-sm font-semibold">PayPal</span>
        </button>
        <button type="button" className={paymentTypeButtonClass("APPLE_PAY")} onClick={() => onPaymentTypeChange("APPLE_PAY")}>
          <span className={symbolWrapClass}>
            <FaApple size={21} />
          </span>
          <span className="block text-sm font-semibold">Apple Pay</span>
        </button>
        <button type="button" className={paymentTypeButtonClass("GOOGLE_PAY")} onClick={() => onPaymentTypeChange("GOOGLE_PAY")}>
          <span className={symbolWrapClass}>
            <FaGoogle size={19} />
          </span>
          <span className="block text-sm font-semibold">Google Pay</span>
        </button>
      </div>

      {paymentType && paymentType !== "CARD" && (
        <div className="mb-6 rounded-xl border border-[#C6A75E]/25 bg-[#FFFCF3] px-4 py-3 text-sm text-[#6F5724]">
          {paymentType === "KLARNA" || paymentType === "PAYPAL"
            ? "You will be redirected to complete this payment and returned to checkout automatically."
            : "This wallet payment will open a secure sheet on supported devices and browsers."}
        </div>
      )}

      {paymentType === "CARD" && (
      <>
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

              {!billingManualEntry && isGoogleLoaded ? (
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

      <div className="mb-6 space-y-3">
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => onCardholderNameChange(e.target.value)}
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

      </>
      )}
      <label className="mb-6 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsAcceptedChange(e.target.checked)}
          className="mt-1"
        />
        <span>I have read the terms and conditions.</span>
      </label>
    </div>
  );
}
