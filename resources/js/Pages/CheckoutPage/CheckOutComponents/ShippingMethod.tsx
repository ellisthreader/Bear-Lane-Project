import React, { useEffect, useMemo, useState } from "react";
import { useCheckout } from "@/Context/CheckoutContext";
import { getCountryCode } from "@/Utils/countryCodes";

type DeliveryType = "STANDARD" | "NEXT_DAY" | "TIMED";

type DeliveryOption = {
  type: DeliveryType;
  label: string;
  description: string;
  available: boolean;
  price: number;
  display_price: string;
  unavailable_reason?: string | null;
  selected_shippo_service?: string | null;
};

type DeliverySlot = {
  slot_id: number;
  time_window: string;
  capacity: number;
  reserved_count: number;
  remaining: number;
  available: boolean;
};

type DeliveryDay = {
  date: string;
  slots: DeliverySlot[];
};

export default function ShippingMethod() {
  const { address, shippingMethod, setShippingMethod, setShippingCost } = useCheckout();

  const [loading, setLoading] = useState(false);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [chosenType, setChosenType] = useState<DeliveryType | null>(null);

  const [slotDays, setSlotDays] = useState<DeliveryDay[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [reserving, setReserving] = useState(false);

  const [reservation, setReservation] = useState<{
    reservationId: number;
    slotId: number;
    expiresAt: string;
  } | null>(null);

  const isAddressComplete = () =>
    Boolean(
      address.firstName &&
        address.lastName &&
        address.phone &&
        address.addressLine1 &&
        address.city &&
        address.postcode &&
        address.country
    );

  const selectedType = useMemo<DeliveryType | null>(() => {
    if (shippingMethod.startsWith("TIMED:")) return "TIMED";
    if (shippingMethod === "STANDARD") return "STANDARD";
    if (shippingMethod === "NEXT_DAY") return "NEXT_DAY";
    return chosenType;
  }, [shippingMethod, chosenType]);

  const timedOption = useMemo(() => options.find((o) => o.type === "TIMED") ?? null, [options]);
  const visibleDays = useMemo(() => slotDays.slice(0, 14), [slotDays]);
  const topRowDays = useMemo(() => visibleDays.slice(0, 7), [visibleDays]);
  const bottomRowDays = useMemo(() => visibleDays.slice(7, 14), [visibleDays]);

  const reservedDate = useMemo(() => {
    if (!reservation) return "";

    for (const day of slotDays) {
      if (day.slots.some((slot) => slot.slot_id === reservation.slotId)) {
        return day.date;
      }
    }

    return "";
  }, [slotDays, reservation]);

  const rangeLabel = useMemo(() => {
    if (visibleDays.length === 0) return "";

    const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    const start = formatter.format(new Date(visibleDays[0].date));
    const end = formatter.format(new Date(visibleDays[visibleDays.length - 1].date));

    return `${start} - ${end}`;
  }, [visibleDays]);

  const getServiceLabel = (option: DeliveryOption) => {
    if (option.type === "TIMED") return "Service: Timed Delivery Service";
    return option.selected_shippo_service
      ? `Service: ${option.selected_shippo_service}`
      : "Service: Carrier selected automatically";
  };

  const fetchDeliveryOptions = async (silent = false) => {
    if (!isAddressComplete()) return;

    if (!silent && !hasLoadedOptions) {
      setLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams({
        postcode: address.postcode,
        country: getCountryCode(address.country) || "GB",
        city: address.city,
        street1: address.addressLine1,
      });

      const response = await fetch(`/api/delivery-options?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || `Failed to fetch delivery options (${response.status})`);
      }

      const nextOptions = Array.isArray(data?.options) ? (data.options as DeliveryOption[]) : [];
      setOptions(nextOptions);
      setIsMember(Boolean(data?.is_member));
      setHasLoadedOptions(true);

      if (selectedType && !nextOptions.some((opt) => opt.type === selectedType && opt.available)) {
        setShippingMethod("");
        setShippingCost(0);
        setReservation(null);
        setChosenType(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch delivery options");
    } finally {
      if (!silent && !hasLoadedOptions) {
        setLoading(false);
      }
    }
  };

  const fetchSlots = async () => {
    if (!address.postcode) return;

    setSlotsLoading(true);
    setSlotsError("");

    try {
      const response = await fetch(`/api/delivery-slots?postcode=${encodeURIComponent(address.postcode)}`, {
        headers: { Accept: "application/json" },
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || `Failed to fetch delivery slots (${response.status})`);
      }

      const days = Array.isArray(data?.days) ? (data.days as DeliveryDay[]) : [];
      setSlotDays(days);

      if (selectedDate && !days.some((day) => day.date === selectedDate)) {
        setSelectedDate("");
      }
    } catch (err: any) {
      setSlotsError(err.message || "Unable to load delivery slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOptions(false);
  }, [
    address.firstName,
    address.lastName,
    address.phone,
    address.addressLine1,
    address.city,
    address.postcode,
    address.country,
  ]);

  useEffect(() => {
    if (selectedType !== "TIMED") return;
    if (!isAddressComplete()) return;

    fetchSlots();

    const interval = window.setInterval(() => {
      fetchSlots();
      fetchDeliveryOptions(true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [selectedType, address.postcode]);

  useEffect(() => {
    if (reservedDate) {
      setSelectedDate(reservedDate);
    }
  }, [reservedDate]);

  const handleSelectOption = (option: DeliveryOption) => {
    if (!option.available) return;

    if (option.type === "TIMED") {
      setChosenType("TIMED");
      setShippingMethod("");
      setShippingCost(0);
      return;
    }

    setChosenType(option.type);
    setReservation(null);
    setShippingMethod(option.type);
    setShippingCost(option.price);
  };

  const reserveSlot = async (slotId: number) => {
    setReserving(true);
    setSlotsError("");

    try {
      const response = await fetch("/api/reserve-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          postcode: address.postcode,
          country: getCountryCode(address.country) || "GB",
          city: address.city,
          street1: address.addressLine1,
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to reserve slot");
      }

      setReservation({
        reservationId: Number(data.reservation_id),
        slotId: Number(data.slot_id),
        expiresAt: String(data.expires_at),
      });

      setChosenType("TIMED");
      setShippingMethod(`TIMED:${data.reservation_id}`);
      setShippingCost(timedOption?.price ?? 0);

      fetchSlots();
      fetchDeliveryOptions(true);
    } catch (err: any) {
      setSlotsError(err.message || "Unable to reserve date");
    } finally {
      setReserving(false);
    }
  };

  const cancelCurrentReservation = async () => {
    if (!reservation?.reservationId) return;

    const response = await fetch("/api/cancel-reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reservation_id: reservation.reservationId }),
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data?.message || "Unable to change delivery date right now.");
    }
  };

  const reserveDate = async (date: string) => {
    if (reservedDate === date) return;

    setSelectedDate(date);
    setSlotsError("");

    const day = slotDays.find((item) => item.date === date);
    const firstAvailableSlot = day?.slots.find((slot) => slot.available);

    if (!firstAvailableSlot) {
      setSlotsError("No availability for this date. Please choose another date.");
      return;
    }

    try {
      if (reservation) {
        await cancelCurrentReservation();
      }
    } catch (err: any) {
      setSlotsError(err.message || "Unable to change delivery date right now.");
      return;
    }

    await reserveSlot(firstAvailableSlot.slot_id);
  };

  if (loading) {
    return (
      <div className="p-0">
        <p className="text-gray-600">Loading delivery options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!options.length) {
    return (
      <div className="p-0">
        <p className="text-gray-600">No delivery options available yet.</p>
      </div>
    );
  }

  return (
    <div className="p-0">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Choose a delivery option</h3>
      {isMember && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Free with Membership
        </p>
      )}

      <div className="grid gap-4">
        {options.map((option) => {
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => handleSelectOption(option)}
              disabled={!option.available}
              className={`text-left border rounded-xl p-4 transition-all ${
                isSelected
                  ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/30 bg-[#FCF7EB]"
                  : option.available
                  ? "border-gray-300 bg-white hover:border-[#C6A75E]/60"
                  : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              }`}
            >
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className={`font-semibold ${option.available ? "text-gray-900" : "text-gray-500"}`}>
                    {option.label}
                  </p>
                  <p className={`text-sm ${option.available ? "text-gray-600" : "text-gray-400"}`}>
                    {option.description}
                  </p>
                  {option.available && (
                    <p className="mt-1 text-xs font-medium text-[#8A6D2B]">{getServiceLabel(option)}</p>
                  )}
                  {!option.available && option.unavailable_reason && (
                    <p className="mt-1 text-xs text-red-500">{option.unavailable_reason}</p>
                  )}
                </div>
                <p className={`font-semibold text-lg ${option.available ? "text-[#8A6D2B]" : "text-gray-400"}`}>
                  {option.display_price}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedType === "TIMED" && (
        <div className="mt-5 space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold text-gray-900">Select a delivery date</p>
            {rangeLabel && <p className="text-xs font-medium text-gray-500">{rangeLabel}</p>}
          </div>

          {slotsLoading && <p className="text-sm text-gray-600">Loading available dates...</p>}
          {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}

          {visibleDays.length > 0 && (
            <div className="space-y-2 overflow-x-auto pb-1">
              {[topRowDays, bottomRowDays].map((rowDays, rowIndex) => (
                <div key={rowIndex} className="flex min-w-max flex-nowrap gap-2">
                  {rowDays.map((day) => {
                    const dateObj = new Date(day.date);
                    const hasAvailability = day.slots.some((slot) => slot.available);
                    const isReservedDate = reservedDate === day.date;
                    const isSelectedDate = selectedDate === day.date || isReservedDate;
                    const disabled = !hasAvailability || reserving;

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => reserveDate(day.date)}
                        disabled={disabled}
                        className={`w-24 shrink-0 rounded-xl border px-2 py-3 text-center transition ${
                          isSelectedDate
                            ? "border-[#C6A75E] bg-[#F8EBC8] text-[#6F5724]"
                            : !hasAvailability
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#C6A75E]/60"
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                          {dateObj.toLocaleDateString(undefined, { weekday: "short" })}
                        </p>
                        <p className="mt-1 text-xl font-bold leading-none">
                          {dateObj.toLocaleDateString(undefined, { day: "numeric" })}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide">
                          {dateObj.toLocaleDateString(undefined, { month: "short" })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
