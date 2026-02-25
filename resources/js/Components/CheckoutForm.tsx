#import React, { useState, useMemo } from "react";
import { useCart } from "@/Context/CartContext";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { router } from "@inertiajs/react";
import { useCheckout } from "@/Context/CheckoutContext";

import ContactInfo from "./CheckOutComponents/ContactInfo";
import DeliveryInfo from "./CheckOutComponents/DeliveryInfo";
import ShippingMethod from "./CheckOutComponents/ShippingMethod";
import OrderSummary from "./CheckOutComponents/OrderSummary";
import PaymentSection from "./CheckOutComponents/PaymentSection";

import { computeTotalsInCents } from "@/Utils/totals";
import { toast } from "react-toastify";

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { cart } = useCart();
  const {
    email,
    address,
    shippingMethod,
    shippingCost = 0,
    appliedDiscount,
    setLoading,
    setError,
  } = useCheckout();

  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

  const {
    firstName,
    lastName,
    phone: addrPhone,
    country,
    addressLine1,
    addressLine2,
    city,
    postcode,
  } = address || {};

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

  // Identify digital-only orders
  const isDigitalOnly = useMemo(() => {
    const physicalTitles = [
      "Web Dev Fundamentals (Paperback)",
      "TikTok Creator Starter Pack",
      "Marketing Productivity Pack",
    ];
    return cart.every((item) => !physicalTitles.includes(item.title));
  }, [cart]);

  // Compute totals
  const totals = useMemo(() => {
    return computeTotalsInCents({
      items: cart.map((item) => ({
        unit_price: item.price,
        quantity: item.quantity,
      })),
      shippingCost,
      appliedDiscount,
    });
  }, [cart, shippingCost, appliedDiscount]);

  const validateContact = () => {
    const missing: string[] = [];
    if (!email) missing.push("email");
    if (!firstName) missing.push("first name");
    if (!lastName) missing.push("last name");
    if (!addressLine1 && !isDigitalOnly) missing.push("address line 1");
    if (!city && !isDigitalOnly) missing.push("city");
    if (!postcode && !isDigitalOnly) missing.push("postcode");
    if (!country && !isDigitalOnly) missing.push("country");

    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`, { position: "top-center" });
      return false;
    }
    return true;
  };

  const handleInfoContinue = () => {
    if (!validateContact()) return;
    setCheckoutStep(isDigitalOnly ? 3 : 2);
  };

  const handleShippingContinue = () => {
    if (!shippingMethod) {
      toast.error("Please select a shipping method.", { position: "top-center" });
      return;
    }
    setCheckoutStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe not ready yet.", { position: "top-center" });
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      toast.error("Payment form not ready.", { position: "top-center" });
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty.", { position: "top-center" });
      return;
    }

    if (!validateContact()) return;
    if (!isDigitalOnly && !shippingMethod) {
      toast.error("Please select a shipping method.", { position: "top-center" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- Create payment intent ---
      const paymentRes = await fetch(`${import.meta.env.VITE_API_URL}/api/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: cart.map((i) => ({
            name: i.title,
            quantity: i.quantity,
            unit_price_cents: Math.round(i.price * 100),
            size: i.size,
            colour: i.colour,
          })),
          discount_code: appliedDiscount?.code || null,
          shipping: isDigitalOnly ? null : { method: shippingMethod, cost: totals.shipping_cents },
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentData.client_secret) throw new Error(paymentData.error || "Failed to create payment intent.");

      // --- Confirm payment ---
      const result = await stripe.confirmCardPayment(paymentData.client_secret, {
        payment_method: {
          card,
          billing_details: {
            email,
            phone: addrPhone || undefined,
            name: `${firstName} ${lastName}`,
            address: {
              country: country === "United Kingdom" ? "GB" : country,
              line1: addressLine1,
              line2: addressLine2,
              city,
              postal_code: postcode,
            },
          },
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Invalid card details.", { position: "top-center" });
        setError(result.error.message);
      } else if (result.paymentIntent?.status === "succeeded") {
        // --- Store order ---
        const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/checkout/store-order`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken || "",
          },
          body: JSON.stringify({
            email,
            items: cart,
            totals,
            appliedDiscount,
            delivery: {
              firstName,
              lastName,
              phone: addrPhone || undefined,
              country,
              line1: addressLine1,
              line2: addressLine2,
              city,
              postcode,
            },
            payment_intent_id: result.paymentIntent.id,
            discount_code: appliedDiscount?.code || null,
          }),
        });

        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error(orderData.error || "Failed to save order.");

        toast.success("Payment successful! Order saved.", { position: "top-center" });

        router.visit(`/order-confirmed/${orderData.order_number}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Payment failed. Try again.", { position: "top-center" });
      setError(err.message);
    }

    setLoading(false);
  };

  // --- Render digital-only vs physical multi-step ---
  if (isDigitalOnly) {
    return (
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="bg-gray-50 border rounded-xl p-6 shadow-sm">
          <OrderSummary />
        </div>
        <div className="bg-gray-50 border rounded-xl p-6 shadow-sm">
          <ContactInfo />
        </div>
        <div className="bg-gray-50 border rounded-xl p-6 shadow-sm">
          <PaymentSection />
        </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold text-lg">
          Pay £{totals.total}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {checkoutStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">1. Customer Information</h2>
          <ContactInfo />
          <DeliveryInfo />
          <button type="button" onClick={handleInfoContinue} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">
            Continue to Shipping
          </button>
        </div>
      )}
      {checkoutStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">2. Shipping Method</h2>
          <ShippingMethod />
          <div className="flex justify-between gap-4">
            <button type="button" onClick={() => setCheckoutStep(1)} className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium">
              Back
            </button>
            <button type="button" onClick={handleShippingContinue} className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">
              Continue to Payment
            </button>
          </div>
        </div>
      )}
      {checkoutStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">3. Payment</h2>
          <OrderSummary />
          <PaymentSection />
          <div className="flex justify-between gap-4">
            <button type="button" onClick={() => setCheckoutStep(2)} className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium">
              Back
            </button>
            <button type="submit" className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold">
              Pay £{totals.total}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
