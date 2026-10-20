import React, { useEffect, useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { FaCcAmex, FaCcDinersClub, FaCcDiscover, FaCcJcb, FaCcMastercard, FaCcVisa } from "react-icons/fa";
import { FaPaypal } from "react-icons/fa6";
import NavMenu from "@/Components/Menu/NavMenu";
import AddPaymentMethodModal from "./ProfileView/components/AddPaymentMethodModal";
import { showCheckoutError, showCheckoutSuccess } from "../CheckoutPage/checkoutToasts";
import { getStripeMode, getStripePublishableKey } from "@/Utils/stripeMode";

type SavedPaymentMethod = {
  id: number;
  provider_type?: "card" | "paypal" | "klarna" | string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  cardholder_name?: string | null;
  is_default: boolean;
  is_active: boolean;
};

const stripeMode = getStripeMode();
const stripeKey = getStripePublishableKey();
const stripePromise = stripeKey
  ? loadStripe(stripeKey, {
      advancedFraudSignals: false,
    })
  : null;

const formatCardNumber = (last4?: string | null) => {
  const digits = (last4 || "0000").slice(-4);
  return `•••• •••• •••• ${digits}`;
};

const cardThemeByBrand = (brand?: string | null) => {
  switch ((brand || "").toLowerCase()) {
    case "visa":
      return "from-[#122A72] via-[#1A3A92] to-[#2A56C6]";
    case "mastercard":
      return "from-[#7A1111] via-[#B4132B] to-[#E5412C]";
    case "amex":
      return "from-[#0E4F88] via-[#2B78BD] to-[#4AA2E6]";
    case "discover":
      return "from-[#8A3A00] via-[#C85400] to-[#FF8A2A]";
    case "jcb":
      return "from-[#0D4F8C] via-[#1B7A8C] to-[#26A46F]";
    case "diners":
      return "from-[#0C4F75] via-[#167A98] to-[#2CA6C8]";
    default:
      return "from-[#4A3B17] via-[#6E5323] to-[#9D7840]";
  }
};

const brandIcon = (brand?: string | null) => {
  switch ((brand || "").toLowerCase()) {
    case "visa":
      return <FaCcVisa className="text-[#ffffff]" />;
    case "mastercard":
      return <FaCcMastercard className="text-[#ffffff]" />;
    case "amex":
      return <FaCcAmex className="text-[#ffffff]" />;
    case "discover":
      return <FaCcDiscover className="text-[#ffffff]" />;
    case "jcb":
      return <FaCcJcb className="text-[#ffffff]" />;
    case "diners":
      return <FaCcDinersClub className="text-[#ffffff]" />;
    default:
      return <FaCcVisa className="text-[#ffffff]" />;
  }
};

export default function PaymentMethodsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await fetch("/profile/saved-checkout", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        setPaymentMethods([]);
        return;
      }

      const payload = await response.json();
      setPaymentMethods(Array.isArray(payload.payment_methods) ? payload.payment_methods : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const setDefaultPaymentMethod = async (methodId: number) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    const res = await fetch(`/profile/payment-methods/${methodId}/default`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      showCheckoutError("Unable to update default payment method.");
      return;
    }

    showCheckoutSuccess("Default payment method updated.");
    await fetchPaymentMethods();
  };

  const deletePaymentMethod = async (methodId: number) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    const res = await fetch(`/profile/payment-methods/${methodId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      showCheckoutError("Unable to remove payment method.");
      return;
    }

    showCheckoutSuccess("Payment method removed.");
    await fetchPaymentMethods();
  };

  const handleWalletConnect = (wallet: "klarna" | "paypal") => {
    const payment = wallet === "paypal" ? "PAYPAL" : "KLARNA";
    router.get(`/profile/wallets/connect/${payment.toLowerCase()}`);
  };

  const hasConnectedPayPal = paymentMethods.some((method) => method.is_active && method.provider_type === "paypal");
  const hasConnectedKlarna = paymentMethods.some((method) => method.is_active && method.provider_type === "klarna");
  const cardPaymentMethods = useMemo(
    () => paymentMethods.filter((method) => (method.provider_type || "card") === "card"),
    [paymentMethods]
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-xl font-semibold text-gray-900">You are not logged in.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF8] via-[#FFFCF5] to-[#FDF6E7]">
      <NavMenu />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:px-10">
        <div className="mb-8">
          <div>
            <p className="text-sm text-[#8B7B57]">
              <Link href="/profile" className="font-semibold text-[#7B6530] hover:underline">Account</Link>
              <span className="px-1.5">&gt;</span>
              <span className="font-medium">Payment Info</span>
            </p>
            <h1 className="mt-1 text-4xl font-bold text-[#251E11]">Payment Info</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7B6D50]">Save, remove, and set your preferred credit/debit cards.</p>
          </div>
        </div>

        <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E7D8B4] bg-gradient-to-br from-[#FDF7EC] via-[#FFF9EE] to-[#F8E9C8] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2A2418]">Klarna</p>
                <p className="mt-1 text-sm text-[#6B5A34]">Pay now, pay in 3, or pay later when available.</p>
              </div>
              <span className="rounded-full border border-[#E2D3B2] bg-white px-2.5 py-1 text-xs font-medium text-[#8B7B57]">{hasConnectedKlarna ? "Connected" : "Not connected"}</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-[#FFB3C7] px-3 py-1 text-xs font-extrabold tracking-wide text-[#1A1A1A]">
                Klarna.
              </span>
              <button
                type="button"
                onClick={() => handleWalletConnect("klarna")}
                className="rounded-lg border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8]"
                hidden={hasConnectedKlarna}
              >
                Connect
              </button>
              {hasConnectedKlarna && (
                <span className="rounded-lg border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530]">
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7D8B4] bg-gradient-to-br from-[#EDF4FF] via-[#F3F7FF] to-[#E0EBFF] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2A2418]">PayPal</p>
                <p className="mt-1 text-sm text-[#6B5A34]">Fast checkout with your PayPal account and buyer protection.</p>
              </div>
              <span className="rounded-full border border-[#D3DEEE] bg-white px-2.5 py-1 text-xs font-medium text-[#60708B]">{hasConnectedPayPal ? "Connected" : "Not connected"}</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl text-[#00457C]"><FaPaypal /></span>
              <button
                type="button"
                onClick={() => handleWalletConnect("paypal")}
                className="rounded-lg border border-[#9DB5D7] bg-white px-4 py-2 text-sm font-semibold text-[#2E4F80] transition hover:bg-[#ECF3FF]"
                hidden={hasConnectedPayPal}
              >
                Connect
              </button>
              {hasConnectedPayPal && (
                <span className="rounded-lg border border-[#9DB5D7] bg-white px-4 py-2 text-sm font-semibold text-[#2E4F80]">
                  Connected
                </span>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-[#8B7B57]">Loading your payment methods...</p>
        ) : cardPaymentMethods.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E7D8B4] bg-[#FFFDF8] p-12 text-center">
            <p className="text-sm text-[#8B7B57]">You have no saved cards yet.</p>
            <button
              type="button"
              onClick={() => setShowAddCard(true)}
              className="mt-4 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
            >
              Add New
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAddCard(true)}
                className="rounded-xl border border-[#D7BE84] bg-white px-5 py-2.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF9EA]"
              >
                Add New
              </button>
            </div>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-3">
            {cardPaymentMethods.map((method) => (
              <div key={method.id} className="space-y-3">
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ${cardThemeByBrand(method.brand)}`}>
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/10" />

                  <div className="relative flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
                      {(method.brand || "Card").toUpperCase()}
                    </p>
                    <span className="text-3xl">{brandIcon(method.brand)}</span>
                  </div>

                  <div className="relative mt-4 flex items-center gap-3">
                    <div className="h-8 w-12 rounded-md bg-gradient-to-br from-[#E8D1A0] to-[#C5A46B] shadow-inner" />
                    <div className="h-5 w-5 rounded-full border border-white/40" />
                  </div>

                  <p className="relative mt-5 font-mono text-lg tracking-[0.2em]">
                    {formatCardNumber(method.last4)}
                  </p>

                  <div className="relative mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Cardholder</p>
                      <p className="mt-1 text-sm font-semibold">{method.cardholder_name || "Card Holder"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Expires</p>
                      <p className="mt-1 text-sm font-semibold">
                        {String(method.exp_month || "--").padStart(2, "0")}/{method.exp_year || "----"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {method.is_default ? (
                    <span className="rounded-full border border-[#D7BE84] bg-[#FFF8E8] px-2.5 py-1 text-xs font-medium text-[#8A6D2B]">Default</span>
                  ) : (
                    <span className="text-xs text-[#8B7B57]">Saved payment method</span>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {!method.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        className="rounded-md border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deletePaymentMethod(method.id)}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </main>

      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodModal
            show={showAddCard}
            onClose={() => setShowAddCard(false)}
            existingPaymentMethodCount={cardPaymentMethods.length}
            onSaved={fetchPaymentMethods}
          />
        </Elements>
      ) : (
        <div className="mx-auto mb-8 w-full max-w-7xl px-4 md:px-10">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Stripe is not configured for {stripeMode} mode. Check `VITE_STRIPE_KEY` and `VITE_STRIPE_MODE` in Railway Variables.
          </p>
        </div>
      )}
    </div>
  );
}
