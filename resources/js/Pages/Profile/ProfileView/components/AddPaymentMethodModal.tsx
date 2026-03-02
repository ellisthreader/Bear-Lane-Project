import React from "react";
import Modal from "@/Components/Modal";
import { CardCvcElement, CardExpiryElement, CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { FaCcAmex, FaCcDinersClub, FaCcDiscover, FaCcJcb, FaCcMastercard, FaCcVisa } from "react-icons/fa";
import { showCheckoutError, showCheckoutSuccess } from "../../../CheckoutPage/checkoutToasts";

type AddPaymentMethodModalProps = {
  show: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  existingPaymentMethodCount: number;
};

type StripeField = "cardNumber" | "expiry" | "cvc";

const cardElementOptions = {
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

export default function AddPaymentMethodModal({
  show,
  onClose,
  onSaved,
  existingPaymentMethodCount,
}: AddPaymentMethodModalProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = React.useState("");
  const [cardholderName, setCardholderName] = React.useState("");
  const [loadingIntent, setLoadingIntent] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [completion, setCompletion] = React.useState<Record<StripeField, boolean>>({
    cardNumber: false,
    expiry: false,
    cvc: false,
  });

  React.useEffect(() => {
    if (!show) return;

    setFieldErrors({});
    setFormError(null);
    setCompletion({ cardNumber: false, expiry: false, cvc: false });
    setLoadingIntent(true);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    fetch("/profile/payment-methods/setup-intent", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.client_secret) {
          const message = payload?.message || "Unable to start secure card setup right now.";
          setFormError(message);
          showCheckoutError(message);
          return;
        }
        setClientSecret(payload.client_secret);
      })
      .catch(() => {
        const message = "Unable to start secure card setup right now.";
        setFormError(message);
        showCheckoutError(message);
      })
      .finally(() => setLoadingIntent(false));
  }, [show]);

  const closeModal = () => {
    setCardholderName("");
    setClientSecret("");
    setFieldErrors({});
    setFormError(null);
    setCompletion({ cardNumber: false, expiry: false, cvc: false });
    onClose();
  };

  const getFieldClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 focus-within:outline-none focus-within:ring-2 ${
      fieldErrors[field]
        ? "checkout-field-error checkout-field-shake border-red-400 ring-red-200 focus-within:ring-red-200"
        : "border-[#E1D4B5] focus-within:ring-[#C6A75E]"
    }`;

  const onStripeChange = (field: StripeField, event: { complete: boolean; error?: { message?: string } }) => {
    setCompletion((prev) => ({ ...prev, [field]: event.complete }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: event.error?.message || "",
    }));
  };

  const submitCard = async () => {
    const nextErrors: Record<string, string> = {};
    if (!cardholderName.trim()) {
      nextErrors.cardholderName = "Please enter the name on card.";
    }
    if (!completion.cardNumber) {
      nextErrors.cardNumber = nextErrors.cardNumber || "Please enter a valid card number.";
    }
    if (!completion.expiry) {
      nextErrors.expiry = "Please enter a valid expiry date.";
    }
    if (!completion.cvc) {
      nextErrors.cvc = "Please enter a valid security code.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showCheckoutError("Please fix the highlighted fields.");
      return;
    }

    if (!stripe || !elements || !clientSecret) {
      setFormError("Secure card form is still loading. Please try again.");
      showCheckoutError("Secure card form is still loading. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setFormError("Card input was not ready. Please try again.");
      showCheckoutError("Card input was not ready. Please try again.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const setupResult = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
        },
      },
    });

    if (setupResult.error || !setupResult.setupIntent?.payment_method) {
      const message = setupResult.error?.message || "Unable to verify card details.";
      setFieldErrors((prev) => ({ ...prev, cardNumber: message }));
      setFormError(message);
      showCheckoutError(message);
      setSaving(false);
      return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    const storeRes = await fetch("/profile/payment-methods", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        payment_method_id: setupResult.setupIntent.payment_method,
        cardholder_name: cardholderName.trim(),
        make_default: existingPaymentMethodCount === 0,
      }),
    });

    if (!storeRes.ok) {
      const payload = await storeRes.json().catch(() => ({}));
      const message = payload?.message || "Unable to save card right now.";
      setFormError(message);
      showCheckoutError(message);
      setSaving(false);
      return;
    }

    await onSaved();
    showCheckoutSuccess("Card saved.");
    setSaving(false);
    closeModal();
  };

  return (
    <Modal show={show} onClose={closeModal} maxWidth="lg">
      <div className="border-b border-[#EEE1C5] px-6 py-4">
        <h3 className="text-xl font-semibold text-[#2A2418]">Add Credit / Debit Card</h3>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Name On Card</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className={getFieldClass("cardholderName")}
            placeholder="Name as shown on card"
          />
          {fieldErrors.cardholderName && <p className="mt-1 text-sm text-red-600">{fieldErrors.cardholderName}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Card Number</label>
          <div className={getFieldClass("cardNumber")}>
            <CardNumberElement options={cardElementOptions} onChange={(event) => onStripeChange("cardNumber", event)} />
          </div>
          {fieldErrors.cardNumber && <p className="mt-1 text-sm text-red-600">{fieldErrors.cardNumber}</p>}
          <div className="mt-2 flex items-center gap-3 text-2xl">
            <FaCcVisa className="text-[#1A1F71]" />
            <FaCcMastercard className="text-[#EB001B]" />
            <FaCcAmex className="text-[#2E77BC]" />
            <FaCcDiscover className="text-[#FF6000]" />
            <FaCcJcb className="text-[#006FBC]" />
            <FaCcDinersClub className="text-[#0079BE]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Expiry Date</label>
            <div className={getFieldClass("expiry")}>
              <CardExpiryElement options={cardElementOptions} onChange={(event) => onStripeChange("expiry", event)} />
            </div>
            {fieldErrors.expiry && <p className="mt-1 text-sm text-red-600">{fieldErrors.expiry}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Security Code</label>
            <div className={`${getFieldClass("cvc")} relative`}>
              <div className="pr-12">
                <CardCvcElement
                  options={{
                    ...cardElementOptions,
                    placeholder: "3 digits",
                  }}
                  onChange={(event) => onStripeChange("cvc", event)}
                />
              </div>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#E1D4B5] bg-[#FFF9EA] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B5A34]">
                CVV
              </div>
            </div>
            {fieldErrors.cvc && <p className="mt-1 text-sm text-red-600">{fieldErrors.cvc}</p>}
            <p className="mt-1 text-xs text-[#8B7B57]">Use the 3-digit code on the back of your card.</p>
          </div>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-[#D7BE84] px-4 py-2 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitCard}
            disabled={saving || loadingIntent}
            className="rounded-lg bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C] disabled:opacity-70"
          >
            {loadingIntent ? "Loading..." : saving ? "Saving..." : "Save Card"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
