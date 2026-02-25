import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import confetti from "canvas-confetti";
import { CheckCircle2, FileText, Package, Truck, CreditCard, MapPin } from "lucide-react";
import NavMenu from "@/Components/Menu/NavMenu";

type OrderItem = {
  id: number;
  product_brand?: string | null;
  product_name: string;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderPayload = {
  order_number: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  shipping_address?: {
    city?: string | null;
    province?: string | null;
    country?: string | null;
  } | null;
  delivery_type?: "STANDARD" | "NEXT_DAY" | "TIMED" | string | null;
  shipping_rate?: string | null;
  payment_type?: "CARD" | "KLARNA" | "PAYPAL" | "APPLE_PAY" | "GOOGLE_PAY" | string | null;
  subtotal: number;
  discount_amount: number;
  vat: number;
  shipping: number;
  total: number;
  invoice_url?: string | null;
  items: OrderItem[];
};

declare global {
  interface Window {
    google?: any;
    __initOrderConfirmedShippingMap?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "YOUR_GOOGLE_MAPS_API_KEY";

const formatMoney = (value: number | string | null | undefined) => `£${Number(value || 0).toFixed(2)}`;

const paymentTypeLabel = (value?: string | null) => {
  switch ((value || "").toUpperCase()) {
    case "KLARNA":
      return "Klarna";
    case "PAYPAL":
      return "PayPal";
    case "APPLE_PAY":
      return "Apple Pay";
    case "GOOGLE_PAY":
      return "Google Pay";
    default:
      return "Credit / Debit Card";
  }
};

const deliveryTypeLabel = (value?: string | null) => {
  switch ((value || "").toUpperCase()) {
    case "NEXT_DAY":
      return "Next Day Delivery";
    case "TIMED":
      return "Timed Delivery";
    default:
      return "Standard Delivery";
  }
};

export default function OrderConfirmed() {
  const { props } = usePage<{ order?: OrderPayload }>();
  const order = props.order;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const burst = () =>
      confetti({
        particleCount: 130,
        spread: 85,
        startVelocity: 48,
        origin: { y: 0.2 },
        colors: ["#C6A75E", "#E9D7A7", "#F7EFD9", "#8A6D2B", "#FFFFFF"],
      });

    const sideCannons = () => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.55 },
        colors: ["#C6A75E", "#8A6D2B", "#FFFFFF"],
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.55 },
        colors: ["#C6A75E", "#8A6D2B", "#FFFFFF"],
      });
    };

    burst();
    const t1 = window.setTimeout(sideCannons, 320);
    const t2 = window.setTimeout(burst, 680);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen bg-white px-6 py-14 text-gray-900">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-[#C6A75E]/25 bg-white p-10 text-center">
          <h1 className="text-3xl font-semibold">Order not found</h1>
          <p className="mt-2 text-gray-600">We could not find this confirmation.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg bg-[#C6A75E] px-5 py-2.5 font-semibold text-white hover:bg-[#B8994E]">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const greetingName = [order.first_name, order.last_name].filter(Boolean).join(" ").trim() || "there";
  const shippingAddress = [order.address_line1, order.address_line2, order.city, order.postcode, order.country]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(", ");
  const shippingMapCity = order.shipping_address?.city || order.city || "";
  const shippingMapProvince = order.shipping_address?.province || "";
  const shippingMapCountry = order.shipping_address?.country || order.country || "";
  const shippingMapCityCountry = [shippingMapCity, shippingMapCountry]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(", ");
  const shippingMapAddress = [shippingMapCity, shippingMapProvince, shippingMapCountry]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(", ");
  const addOns = useMemo(() => {
    const calculated = Number(order.total) - Number(order.subtotal) - Number(order.vat) - Number(order.shipping) + Number(order.discount_amount || 0);
    return calculated > 0 ? calculated : 0;
  }, [order.discount_amount, order.shipping, order.subtotal, order.total, order.vat]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!shippingMapAddress) {
      setMapFailed(true);
      return;
    }
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      setMapFailed(true);
      return;
    }

    let cancelled = false;

    const failMap = () => {
      if (!cancelled) setMapFailed(true);
    };

    const renderMap = () => {
      if (cancelled || !mapRef.current) return;
      const googleMaps = window.google?.maps;
      if (!googleMaps) {
        failMap();
        return;
      }

      const geocoder = new googleMaps.Geocoder();
      geocoder.geocode({ address: shippingMapAddress }, (results: any, status: string) => {
        if (cancelled || !mapRef.current) return;
        if (status !== "OK" || !results?.length) {
          failMap();
          return;
        }

        const location = results[0].geometry.location;
        const map = new googleMaps.Map(mapRef.current, {
          center: location,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new googleMaps.Marker({
          map,
          position: location,
          title: "Shipping Address",
        });

        const infoContent = document.createElement("div");
        infoContent.className = "map-info-window";

        const title = document.createElement("div");
        title.textContent = "Shipping Address:";
        title.className = "map-info-window__title";

        const addressText = document.createElement("div");
        addressText.textContent = shippingMapCityCountry || shippingMapAddress;
        addressText.className = "map-info-window__address";

        infoContent.appendChild(title);
        infoContent.appendChild(addressText);

        const infoWindow = new googleMaps.InfoWindow({
          content: infoContent,
          maxWidth: 300,
        });

        infoWindow.open(map, marker);

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
      });
    };

    if (window.google?.maps) {
      renderMap();
      return () => {
        cancelled = true;
      };
    }

    window.__initOrderConfirmedShippingMap = renderMap;

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="order-confirmed"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__initOrderConfirmedShippingMap&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "order-confirmed";
      script.onerror = failMap;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [shippingMapAddress, shippingMapCity, shippingMapCountry, shippingMapProvince]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Head title="Order Confirmed" />
      <NavMenu />
      <style>{`
        .order-confirmed-map .gm-style .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 12px !important;
        }

        .order-confirmed-map .gm-style .gm-style-iw-d {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        .order-confirmed-map .gm-style .gm-ui-hover-effect {
          top: 0 !important;
          right: 0 !important;
          width: 30px !important;
          height: 30px !important;
          transform: none !important;
        }

        .order-confirmed-map .map-info-window {
          margin: 0 !important;
          padding: 12px 16px !important;
          min-width: 220px;
          min-height: 96px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
        }

        .order-confirmed-map .map-info-window__title {
          margin: 0 0 6px 0;
          font-size: 16px;
          line-height: 1.2;
          font-weight: 700;
          color: #1f2937;
        }

        .order-confirmed-map .map-info-window__address {
          margin: 0;
          font-size: 14px;
          line-height: 1.35;
          color: #4b5563;
        }
      `}</style>

      <div className="mx-auto flex min-h-[calc(100vh-86px)] max-w-[1260px] items-center px-6 py-6">
        <div className="w-full rounded-3xl border border-[#C6A75E]/25 bg-gradient-to-b from-[#FFFCF5] via-[#FFFDF9] to-white p-6 shadow-[0_10px_35px_rgba(198,167,94,0.12)] md:p-7">
          <div className="mb-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#F3E4BE] p-3 text-[#8A6D2B]">
                <CheckCircle2 size={34} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6D2B]/90">Order Confirmed</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Thank you {greetingName}</h1>
                <p className="mt-1 text-sm text-gray-600">Your order has been placed successfully and we are preparing it now.</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#C6A75E]/30 bg-white px-4 py-3 text-sm">
              <p className="text-gray-500">Order number</p>
              <p className="font-semibold text-gray-900">{order.order_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-[#C6A75E]/20 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Package size={18} className="text-[#8A6D2B]" />
                Order Summary
              </h2>

              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-gray-50/70 p-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border border-dashed border-gray-300 bg-white" />
                      )}
                      <div className="min-w-0">
                        {item.product_brand && <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.product_brand}</p>}
                        <p className="truncate text-sm font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-600">Qty {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{formatMoney(item.line_total)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-[#C6A75E]/20 pt-3 text-sm">
                <div className="flex justify-between py-1 text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatMoney(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-gray-700">
                  <span>VAT</span>
                  <span>{formatMoney(order.vat)}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-700">
                  <span>Shipping</span>
                  <span>{formatMoney(order.shipping)}</span>
                </div>
                {addOns > 0 && (
                  <div className="flex justify-between py-1 text-gray-700">
                    <span>Gift wrap / extras</span>
                    <span>{formatMoney(addOns)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-[#C6A75E]/20 pt-3 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                  <Truck size={17} className="text-[#8A6D2B]" />
                  Shipping
                </h3>
                <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Method:</span> {deliveryTypeLabel(order.delivery_type)}</p>
                <p className="mt-1 text-sm text-gray-700"><span className="font-medium text-gray-900">Service:</span> {order.shipping_rate || "Carrier selected automatically"}</p>
                <p className="mt-1 text-sm text-gray-700"><span className="font-medium text-gray-900">Address:</span> {shippingAddress || "Address pending"}</p>
                {order.phone && <p className="mt-1 text-sm text-gray-700"><span className="font-medium text-gray-900">Phone:</span> {order.phone}</p>}
              </div>

              <div className="rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                  <MapPin size={17} className="text-[#8A6D2B]" />
                  Billing
                </h3>
                <p className="text-sm text-gray-700">Billing address is the same as your shipping address for this order.</p>
              </div>

              <div className="rounded-2xl border border-[#C6A75E]/20 bg-white p-4">
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                  <CreditCard size={17} className="text-[#8A6D2B]" />
                  Payment
                </h3>
                <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Method:</span> {paymentTypeLabel(order.payment_type)}</p>
                <p className="mt-1 text-sm text-gray-700"><span className="font-medium text-gray-900">Email:</span> {order.email}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {order.invoice_url && (
                  <a
                    href={order.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C6A75E]/35 bg-[#FCF7EB] px-4 py-3 text-sm font-semibold text-[#8A6D2B] hover:bg-[#F6ECD2]"
                  >
                    <FileText size={16} />
                    View invoice
                  </a>
                )}
                <Link
                  href="/profile/edit?tab=orders"
                  className="inline-flex items-center justify-center rounded-xl bg-[#C6A75E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#B8994E]"
                >
                  View my orders
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center rounded-xl border border-[#C6A75E]/35 bg-white px-4 py-3 text-sm font-semibold text-[#8A6D2B] hover:bg-[#FCF7EB] sm:col-span-2"
                >
                  Continue shopping
                </Link>
              </div>
            </section>
          </div>

          <section className="order-confirmed-map mt-5 w-full overflow-hidden rounded-2xl border border-[#C6A75E]/20 bg-white">
            <div className="border-b border-[#C6A75E]/15 bg-[#FCF7EB] px-5 py-3">
              <p className="text-sm font-semibold text-gray-900">Shipping Address:</p>
              <p className="mt-1 text-sm text-gray-700">{shippingMapCityCountry || "Address unavailable"}</p>
            </div>

            {!mapFailed ? (
              <div ref={mapRef} className="w-full min-h-[300px] md:min-h-[400px]" />
            ) : (
              <div className="px-5 py-6 text-sm text-gray-600">
                We couldn&apos;t load the map for this address.
              </div>
            )}
          </section>

          <div className="mt-5 border-t border-[#C6A75E]/20 pt-3 text-sm text-gray-600">
            A confirmation email has been sent to <span className="font-medium text-gray-900">{order.email}</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
