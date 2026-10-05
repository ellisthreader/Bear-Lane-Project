import { useEffect, useState } from "react";
import { showCheckoutError, showCheckoutSuccess } from "../../../CheckoutPage/checkoutToasts";
import type { AddressFormState, SavedAddress, SavedPaymentMethod } from "../types";

const emptyAddressForm: AddressFormState = {
  label: "",
  first_name: "",
  last_name: "",
  phone: "",
  country: "United Kingdom",
  address_line1: "",
  address_line2: "",
  city: "",
  county: "",
  postcode: "",
};

const buildCountryList = () => {
  const names = new Set<string>();
  const DisplayNamesCtor = (Intl as any)?.DisplayNames;

  if (DisplayNamesCtor) {
    const displayNames = new DisplayNamesCtor(["en"], { type: "region" });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (const first of letters) {
      for (const second of letters) {
        const code = `${first}${second}`;
        const name = displayNames.of(code);
        if (!name || name === code) continue;
        names.add(name);
      }
    }
  }

  if (!names.size) {
    return ["United Kingdom", "United States", "Ireland", "France", "Germany", "Spain", "Italy", "Netherlands", "Canada"];
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

const addressCountries = buildCountryList();

export function useSavedCheckout(userId?: number) {
  const [addressFieldErrors, setAddressFieldErrors] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loadingSavedData, setLoadingSavedData] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [addressError, setAddressError] = useState<string | null>(null);

  const getCsrfToken = () => {
    const fromMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    if (fromMeta) return fromMeta;

    const xsrfCookie = document.cookie
      .split("; ")
      .find((part) => part.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];

    return xsrfCookie ? decodeURIComponent(xsrfCookie) : "";
  };

  const refreshCsrfCookie = async () => {
    try {
      await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        credentials: "same-origin",
      });
    } catch {
      // Ignore if endpoint is unavailable.
    }
  };

  const fetchWithCsrfRetry = async (url: string, init: RequestInit = {}) => {
    const token = getCsrfToken();
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { "X-CSRF-TOKEN": token, "X-XSRF-TOKEN": token } : {}),
      ...(init.headers || {}),
    };

    let response = await fetch(url, {
      credentials: "same-origin",
      ...init,
      headers,
    });

    if (response.status !== 419) return response;

    await refreshCsrfCookie();
    const refreshedToken = getCsrfToken();
    const retryHeaders = {
      ...headers,
      ...(refreshedToken ? { "X-CSRF-TOKEN": refreshedToken, "X-XSRF-TOKEN": refreshedToken } : {}),
    };

    response = await fetch(url, {
      credentials: "same-origin",
      ...init,
      headers: retryHeaders,
    });

    return response;
  };

  const fetchSavedCheckout = async () => {
    setLoadingSavedData(true);
    try {
      const response = await fetch("/profile/saved-checkout", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) return;
      const payload = await response.json();
      setAddresses(Array.isArray(payload.addresses) ? payload.addresses : []);
      setPaymentMethods(Array.isArray(payload.payment_methods) ? payload.payment_methods : []);
    } finally {
      setLoadingSavedData(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchSavedCheckout();
  }, [userId]);

  const submitAddress = async () => {
    setAddressError(null);
    const errors: Record<string, string> = {};

    if (!addressForm.first_name.trim()) errors.first_name = "Please enter first name.";
    if (!addressForm.last_name.trim()) errors.last_name = "Please enter last name.";
    if (!addressForm.address_line1.trim()) errors.address_line1 = "Please enter address line 1.";
    if (!addressForm.city.trim()) errors.city = "Please enter city.";
    if (!addressForm.postcode.trim()) errors.postcode = "Please enter postcode.";

    setAddressFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setAddressError("Please fix the highlighted fields.");
      showCheckoutError("Please fix the highlighted fields.");
      return;
    }

    const res = await fetchWithCsrfRetry("/profile/addresses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...addressForm,
        is_default: addresses.length === 0,
      }),
    });

    if (!res.ok) {
      setAddressError("Unable to save address right now.");
      showCheckoutError("Unable to save address right now.");
      return;
    }

    setAddressForm(emptyAddressForm);
    setAddressFieldErrors({});
    setShowAddAddress(false);
    showCheckoutSuccess("Address saved.");
    await fetchSavedCheckout();
  };

  const setDefaultAddress = async (addressId: number) => {
    await fetchWithCsrfRetry(`/profile/addresses/${addressId}/default`, {
      method: "PATCH",
    });
    showCheckoutSuccess("Default address updated.");
    await fetchSavedCheckout();
  };

  const deleteAddress = async (addressId: number) => {
    await fetchWithCsrfRetry(`/profile/addresses/${addressId}`, {
      method: "DELETE",
    });
    showCheckoutSuccess("Address removed.");
    await fetchSavedCheckout();
  };

  const setDefaultPaymentMethod = async (methodId: number) => {
    await fetchWithCsrfRetry(`/profile/payment-methods/${methodId}/default`, {
      method: "PATCH",
    });
    showCheckoutSuccess("Default payment method updated.");
    await fetchSavedCheckout();
  };

  const deletePaymentMethod = async (methodId: number) => {
    await fetchWithCsrfRetry(`/profile/payment-methods/${methodId}`, {
      method: "DELETE",
    });
    showCheckoutSuccess("Payment method removed.");
    await fetchSavedCheckout();
  };

  return {
    addresses,
    paymentMethods,
    loadingSavedData,
    showAddAddress,
    setShowAddAddress,
    addressForm,
    setAddressForm,
    addressFieldErrors,
    setAddressFieldErrors,
    addressError,
    setAddressError,
    addressCountries,
    submitAddress,
    setDefaultAddress,
    deleteAddress,
    setDefaultPaymentMethod,
    deletePaymentMethod,
  };
}
