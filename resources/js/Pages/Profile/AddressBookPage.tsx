import React, { useEffect, useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { Autocomplete } from "@react-google-maps/api";
import Modal from "@/Components/Modal";
import NavMenu from "@/Components/Menu/NavMenu";
import { showCheckoutError, showCheckoutSuccess } from "../CheckoutPage/checkoutToasts";
import useAnalyticsConsent from "@/Utils/useAnalyticsConsent";
import useGoogleMapsScript from "@/Utils/useGoogleMapsScript";

type SavedAddress = {
  id: number;
  label?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  county?: string | null;
  postcode: string;
  is_default: boolean;
};

type AddressFormState = {
  label: string;
  first_name: string;
  last_name: string;
  country: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
};

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

const emptyAddressForm: AddressFormState = {
  label: "",
  first_name: "",
  last_name: "",
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

export default function AddressBookPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";
  const hasAnalyticsConsent = useAnalyticsConsent();
  const canUseGoogleAddressLookup = googleMapsApiKey.length > 0 && hasAnalyticsConsent;
  const { isLoaded } = useGoogleMapsScript({
    enabled: canUseGoogleAddressLookup,
    apiKey: googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const countries = useMemo(() => buildCountryList(), []);

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

  const fetchAddresses = async () => {
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
        setAddresses([]);
        return;
      }

      const payload = await response.json();
      setAddresses(Array.isArray(payload.addresses) ? payload.addresses : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddressPick = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
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
    const line1 = `${streetNumber} ${route}`.trim();

    setAddressForm((prev) => ({
      ...prev,
      address_line1: line1 || prev.address_line1,
      city: locality || prev.city,
      county: county || prev.county,
      postcode: postcode || prev.postcode,
      country: detectedCountry && countries.includes(detectedCountry) ? detectedCountry : prev.country,
    }));
  };

  const openAddModal = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (address: SavedAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label || "",
      first_name: address.first_name || "",
      last_name: address.last_name || "",
      country: address.country || "United Kingdom",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      county: address.county || "",
      postcode: address.postcode || "",
    });
    setError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const saveAddress = async () => {
    setError(null);
    const nextErrors: Record<string, string> = {};
    if (!addressForm.first_name.trim()) nextErrors.first_name = "Please enter first name.";
    if (!addressForm.last_name.trim()) nextErrors.last_name = "Please enter last name.";
    if (!addressForm.address_line1.trim()) nextErrors.address_line1 = "Please enter address line 1.";
    if (!addressForm.city.trim()) nextErrors.city = "Please enter city.";
    if (!addressForm.postcode.trim()) nextErrors.postcode = "Please enter postcode.";
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      showCheckoutError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      const method = editingAddressId ? "PATCH" : "POST";
      const url = editingAddressId ? `/profile/addresses/${editingAddressId}` : "/profile/addresses";

      const res = await fetchWithCsrfRetry(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addressForm,
          ...(editingAddressId ? {} : { is_default: addresses.length === 0 }),
        }),
      });

      if (!res.ok) {
        setError(`Unable to ${editingAddressId ? "update" : "save"} address right now.`);
        showCheckoutError(`Unable to ${editingAddressId ? "update" : "save"} address right now.`);
        return;
      }

      setModalOpen(false);
      setAddressForm(emptyAddressForm);
      setEditingAddressId(null);
      setFieldErrors({});
      showCheckoutSuccess(editingAddressId ? "Address updated." : "Address saved.");
      await fetchAddresses();
    } finally {
      setSaving(false);
    }
  };

  const setDefaultAddress = async (addressId: number) => {
    const res = await fetchWithCsrfRetry(`/profile/addresses/${addressId}/default`, {
      method: "PATCH",
    });
    if (!res.ok) {
      showCheckoutError("Unable to update default address.");
      return;
    }
    showCheckoutSuccess("Default address updated.");
    await fetchAddresses();
  };

  const deleteAddress = async (addressId: number) => {
    const res = await fetchWithCsrfRetry(`/profile/addresses/${addressId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      showCheckoutError("Unable to remove address.");
      return;
    }
    showCheckoutSuccess("Address removed.");
    await fetchAddresses();
  };

  const getInputClass = (field: string) =>
    `rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? "animate-checkout-shake border-red-400 ring-red-200 focus:ring-red-200"
        : "border-[#E1D5B8] focus:ring-[#C6A75E]"
    }`;

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
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#8B7B57]">
              <Link href="/profile" className="font-semibold text-[#7B6530] hover:underline">Account</Link>
              <span className="px-1.5">&gt;</span>
              <span className="font-medium">Address Book</span>
            </p>
            <h1 className="mt-1 text-4xl font-bold text-[#251E11]">Address Book</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7B6D50]">Save, edit, and set your preferred delivery addresses.</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl border border-[#D7BE84] bg-white px-5 py-2.5 text-base font-semibold text-[#7B6530] transition hover:bg-[#FFF9EA]"
          >
            Add New
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#8B7B57]">Loading your addresses...</p>
        ) : addresses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E7D8B4] bg-[#FFFDF8] p-12 text-center">
            <p className="text-sm text-[#8B7B57]">You have no saved addresses yet.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
            >
              Add your first address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-3xl border border-[#E7D8B4] bg-gradient-to-br from-[#FFFEFA] to-[#FFF8E8] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-[#2A2418]">{address.first_name} {address.last_name}</p>
                    {address.label && <p className="mt-1 text-sm text-[#8B7B57]">{address.label}</p>}
                  </div>
                  {address.is_default && (
                    <span className="rounded-full border border-[#D7BE84] bg-white px-2.5 py-1 text-xs font-medium text-[#8A6D2B]">Default</span>
                  )}
                </div>

                <p className="mt-4 text-sm leading-7 text-[#5F533D]">
                  {[address.address_line1, address.address_line2, address.city, address.county, address.postcode, address.country].filter(Boolean).join(", ")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(address.id)}
                      className="rounded-md border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(address)}
                    className="rounded-md border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAddress(address.id)}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal show={modalOpen} onClose={() => setModalOpen(false)} maxWidth="2xl">
        <div className="border-b border-[#EEE1C5] px-6 py-4">
          <h3 className="text-xl font-semibold text-[#2A2418]">{editingAddressId ? "Edit Address" : "Add New Address"}</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={getInputClass("label")} placeholder="Label (optional)" value={addressForm.label} onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} />
            <select className={getInputClass("country")} value={addressForm.country} onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))}>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <div>
              <input className={`w-full ${getInputClass("first_name")}`} placeholder="First name*" value={addressForm.first_name} onChange={(e) => setAddressForm((p) => ({ ...p, first_name: e.target.value }))} />
              {fieldErrors.first_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>}
            </div>
            <div>
              <input className={`w-full ${getInputClass("last_name")}`} placeholder="Last name*" value={addressForm.last_name} onChange={(e) => setAddressForm((p) => ({ ...p, last_name: e.target.value }))} />
              {fieldErrors.last_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>}
            </div>
            <div className="md:col-span-2">
              {canUseGoogleAddressLookup && isLoaded ? (
                <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handleAddressPick}>
                  <input
                    className={`w-full ${getInputClass("address_line1")}`}
                    placeholder="Add your postcode or address *"
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm((p) => ({ ...p, address_line1: e.target.value }))}
                  />
                </Autocomplete>
              ) : (
                <input className={`w-full ${getInputClass("address_line1")}`} placeholder="Add your postcode or address *" value={addressForm.address_line1} onChange={(e) => setAddressForm((p) => ({ ...p, address_line1: e.target.value }))} />
              )}
              {fieldErrors.address_line1 && <p className="mt-1 text-sm text-red-600">{fieldErrors.address_line1}</p>}
            </div>
            <input className={`md:col-span-2 ${getInputClass("address_line2")}`} placeholder="Address line 2" value={addressForm.address_line2} onChange={(e) => setAddressForm((p) => ({ ...p, address_line2: e.target.value }))} />
            <div>
              <input className={`w-full ${getInputClass("city")}`} placeholder="City*" value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} />
              {fieldErrors.city && <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>}
            </div>
            <input className={getInputClass("county")} placeholder="County" value={addressForm.county} onChange={(e) => setAddressForm((p) => ({ ...p, county: e.target.value }))} />
            <div className="md:col-span-2">
              <input className={`w-full ${getInputClass("postcode")}`} placeholder="Postcode*" value={addressForm.postcode} onChange={(e) => setAddressForm((p) => ({ ...p, postcode: e.target.value }))} />
              {fieldErrors.postcode && <p className="mt-1 text-sm text-red-600">{fieldErrors.postcode}</p>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} type="button" className="rounded-lg border border-[#D7BE84] px-4 py-2 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]">Cancel</button>
            <button onClick={saveAddress} type="button" disabled={saving} className="rounded-lg bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C] disabled:opacity-70">{saving ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
