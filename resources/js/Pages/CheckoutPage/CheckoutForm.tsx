import React, { useMemo, useState, useEffect, useRef } from "react";
import { useCart } from "@/Context/CartContext";
import { CardNumberElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { router } from "@inertiajs/react";
import { useCheckout } from "@/Context/CheckoutContext";
import { isValidPhoneNumber } from "react-phone-number-input";

import ContactInfo from "./CheckOutComponents/ContactInfo";
import DeliveryInfo from "./CheckOutComponents/DeliveryInfo";
import ShippingMethod from "./CheckOutComponents/ShippingMethod";
import OrderSummary from "./CheckOutComponents/OrderSummary";
import PaymentSection from "./CheckOutComponents/PaymentSection";

import { computeTotalsInCents } from "@/Utils/totals";
import { showCheckoutError, showCheckoutSuccess } from "./checkoutToasts";

type CheckoutFormProps = {
  initialEmail?: string;
};

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

const GIFT_PACKAGING_PRICE = 10;
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
const PENDING_REDIRECT_ORDER_KEY = "checkout_pending_redirect_order";
const CHECKOUT_GUEST_EMAIL_KEY = "checkout_guest_email";

const CheckoutForm = ({ initialEmail = "" }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { cart } = useCart();
  const {
    email,
    setEmail,
    address,
    shippingMethod,
    shippingCost = 0,
    appliedDiscount,
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
  const isFinalizingRedirectPaymentRef = useRef(false);

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

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  const deliveryAddressSummary = useMemo(
    () =>
      [`${firstName || ""} ${lastName || ""}`.trim(), addressLine1, addressLine2, city, county, postcode, country]
        .filter((part) => Boolean(part && String(part).trim()))
        .join(", ") || "Delivery address not set yet.",
    [firstName, lastName, addressLine1, addressLine2, city, county, postcode, country]
  );

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
      price: i.price,
      quantity: i.quantity,
      image: i.image,
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
    },
    discount_code: appliedDiscount?.code || null,
  });

  const storeOrderPayload = async (payload: Record<string, unknown>) => {
    const orderRes = await fetch(`/checkout/store-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken || "",
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
        sessionStorage.removeItem(CHECKOUT_GUEST_EMAIL_KEY);
        showCheckoutSuccess("Payment successful! Order saved.");
        router.visit(`/order-confirmed/${orderData.order_number}`);
      } catch (err: any) {
        showCheckoutError(err.message || "Payment failed. Try again.");
        setError(err.message || "Payment failed. Try again.");
      } finally {
        setLoading(false);
        isFinalizingRedirectPaymentRef.current = false;
      }
    })();
  }, [setError, setLoading, stripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (paymentType === "CARD" && !cardholderName.trim()) {
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
      const paymentRes = await fetch(`/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        body: JSON.stringify({
          email,
          items: cart.map((i) => ({
            slug: i.slug,
            name: i.title,
            quantity: i.quantity,
            unit_price_cents: Math.round(i.price * 100),
          })),
          discount_code: appliedDiscount?.code || null,
          shipping: {
            method: shippingMethod,
            cost: totals.shipping_cents,
            gift_packaging_cost: Math.round(giftPackagingCost * 100),
          },
          payment_type: paymentType,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentData.client_secret) throw new Error(paymentData.error || "Failed to create payment intent.");

      const orderPayload = buildOrderPayload();
      const billingCountry = mapCountryCode(useDeliveryAddressAsBilling ? country : billingAddress.country);
      const billingName = cardholderName.trim() || `${firstName || ""} ${lastName || ""}`.trim() || email;

      if (paymentType === "CARD") {
        if (!elements) {
          throw new Error("Card fields are still loading. Please wait a second and try again.");
        }

        const cardNumber = await getCardElementWithRetry();
        if (!cardNumber) {
          throw new Error("Card details did not load. Please refresh the page and try again.");
        }

        const result = await stripe.confirmCardPayment(paymentData.client_secret, {
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
      sessionStorage.setItem(CHECKOUT_GUEST_EMAIL_KEY, email);
      const returnUrl = window.location.href;

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

  const sectionHeader = (step: 1 | 2 | 3, title: string) => {
    const isOpen = activeSection === step;
    const canEdit = step < activeSection;

    return (
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">{step} - {title}</h2>
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="rounded-2xl border border-[#C6A75E]/25 bg-white p-6">
          <div className="flex gap-6">
            <div className="hidden lg:block">
              <div className="relative w-40">
                <div className="absolute left-[15px] top-4 h-[calc(100%-32px)] w-px bg-[#C6A75E]/35" />
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
                      className={`relative z-10 mb-7 flex items-center gap-3 text-left transition ${
                        item.step > activeSection ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                          isActive
                            ? "border-[#C6A75E] bg-[#FCF7EB] text-[#8A6D2B] ring-2 ring-[#C6A75E]/20"
                            : isCompleted
                            ? "border-[#C6A75E] bg-[#F7E7BF] text-[#8A6D2B]"
                            : "border-gray-300 bg-white text-gray-500"
                        }`}
                      >
                        {item.step}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isActive || isCompleted ? "text-[#8A6D2B]" : "text-gray-500"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full space-y-6">
          <div className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            {sectionHeader(1, "Delivery")}
            <div className={sectionBodyClass(activeSection === 1)}>
              <div className="space-y-6 overflow-hidden">
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

          <div className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            {sectionHeader(2, "Delivery options")}
            <div className={sectionBodyClass(activeSection === 2)}>
              <div className="space-y-6 overflow-hidden">
                <ShippingMethod />

                <div className="space-y-4 p-0">
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
                          <label className="mb-2 block text-sm font-medium text-gray-700">Gift message (optional)</label>
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
                      <img
                        src="/images/Gift-Wrapping.jpeg"
                        alt="Gift wrapping example"
                        className="h-[320px] w-full rounded-2xl object-cover"
                      />
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

          <div className="space-y-4 rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
            {sectionHeader(3, "Payment")}
            <div className={sectionBodyClass(activeSection === 3)}>
              <div className="space-y-6 overflow-hidden">
                <PaymentSection
                  paymentType={paymentType}
                  onPaymentTypeChange={setPaymentType}
                  cardholderName={cardholderName}
                  onCardholderNameChange={setCardholderName}
                  useDeliveryAddressAsBilling={useDeliveryAddressAsBilling}
                  onUseDeliveryAddressAsBillingChange={setUseDeliveryAddressAsBilling}
                  deliveryAddressSummary={deliveryAddressSummary}
                  billingAddress={billingAddress}
                  onBillingAddressChange={setBillingAddress}
                  termsAccepted={termsAccepted}
                  onTermsAcceptedChange={setTermsAccepted}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={paymentType === "CARD" && (!stripe || !elements)}
                    className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-1/2"
                  >
                    Pay now
                  </button>
                </div>
              </div>
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
