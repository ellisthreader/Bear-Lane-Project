import React from "react";
import { router } from "@inertiajs/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { FaPaypal } from "react-icons/fa6";
import AddPaymentMethodModal from "./AddPaymentMethodModal";
import { useProfileViewContext } from "../ProfileViewContext";

const stripeKey = (import.meta.env.VITE_STRIPE_KEY as string | undefined)?.trim() || "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function PaymentMethodsSection() {
  const { loadingSavedData, paymentMethods, setDefaultPaymentMethod, deletePaymentMethod } = useProfileViewContext();
  const [showAddCard, setShowAddCard] = React.useState(false);
  const cardMethods = React.useMemo(
    () => paymentMethods.filter((method) => (method.provider_type || "card").toLowerCase() === "card"),
    [paymentMethods]
  );
  const paypalConnected = paymentMethods.some(
    (method) => method.is_active && (method.provider_type || "").toLowerCase() === "paypal"
  );
  const klarnaConnected = paymentMethods.some(
    (method) => method.is_active && (method.provider_type || "").toLowerCase() === "klarna"
  );

  return (
    <section className="rounded-2xl border border-[#E6D6AE] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#2A2418]">Payments</h3>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-[#D7BE84] px-3 py-1.5 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF9EA]"
            onClick={() => setShowAddCard(true)}
            type="button"
          >
            Add New
          </button>
          <button
            className="rounded-lg border border-[#D7BE84] px-3 py-1.5 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF9EA]"
            onClick={() => router.get("/profile/payment-methods")}
            type="button"
          >
            Manage
          </button>
        </div>
      </div>
      {(paypalConnected || klarnaConnected) && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {paypalConnected && (
            <div className="rounded-xl border border-[#ECDDB8] bg-[#FFFEFA] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl text-[#00457C]">
                    <FaPaypal />
                  </span>
                  <span className="text-sm font-semibold text-[#332A16]">PayPal</span>
                </div>
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  Connected
                </span>
              </div>
            </div>
          )}
          {klarnaConnected && (
            <div className="rounded-xl border border-[#ECDDB8] bg-[#FFFEFA] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#FFB3C7] px-2 py-0.5 text-xs font-extrabold text-[#1A1A1A]">
                    Klarna.
                  </span>
                  <span className="text-sm font-semibold text-[#332A16]">Klarna</span>
                </div>
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  Connected
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {loadingSavedData ? (
        <p className="text-sm text-gray-500">Loading saved payment methods...</p>
      ) : cardMethods.length === 0 ? (
        <p className="text-sm text-gray-500">No saved cards yet.</p>
      ) : (
        <div className="space-y-3">
          {cardMethods.map((method) => (
            <div key={method.id} className="rounded-xl border border-[#ECDDB8] bg-[#FFFEFA] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#332A16]">{(method.brand || "Card").toUpperCase()} •••• {method.last4 || "----"}</p>
                  <p className="mt-1 text-xs text-[#6C6250]">Expires {String(method.exp_month || "--").padStart(2, "0")}/{method.exp_year || "----"}</p>
                  {method.cardholder_name && <p className="mt-1 text-xs text-[#6C6250]">{method.cardholder_name}</p>}
                  {method.is_default && <p className="mt-1 text-xs font-medium text-[#8A6D2B]">Default payment method</p>}
                </div>
                <div className="flex gap-2">
                  {!method.is_default && (
                    <button onClick={() => setDefaultPaymentMethod(method.id)} className="rounded-md border border-[#D7BE84] px-2 py-1 text-xs text-[#8A6D2B]" type="button">Set default</button>
                  )}
                  <button onClick={() => deletePaymentMethod(method.id)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" type="button">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodModal
            show={showAddCard}
            onClose={() => setShowAddCard(false)}
            existingPaymentMethodCount={cardMethods.length}
            onSaved={async () => {
              router.reload({ preserveScroll: true });
            }}
          />
        </Elements>
      ) : (
        <p className="mt-4 text-sm text-red-600">
          Card management is unavailable. Missing `VITE_STRIPE_KEY`.
        </p>
      )}
    </section>
  );
}
