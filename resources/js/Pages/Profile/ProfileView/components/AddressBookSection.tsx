import React from "react";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { Autocomplete } from "@react-google-maps/api";
import { useProfileViewContext } from "../ProfileViewContext";
import useAnalyticsConsent from "@/Utils/useAnalyticsConsent";
import useGoogleMapsScript from "@/Utils/useGoogleMapsScript";

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

export default function AddressBookSection() {
  const {
    showAddAddress,
    setShowAddAddress,
    addressError,
    setAddressError,
    addressForm,
    setAddressForm,
    addressFieldErrors,
    setAddressFieldErrors,
    addressCountries,
    submitAddress,
    loadingSavedData,
    addresses,
  } = useProfileViewContext();

  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";
  const hasAnalyticsConsent = useAnalyticsConsent();
  const canUseGoogleAddressLookup = googleMapsApiKey.length > 0 && hasAnalyticsConsent;
  const { isLoaded } = useGoogleMapsScript({
    enabled: canUseGoogleAddressLookup,
    apiKey: googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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
      country: detectedCountry && addressCountries.includes(detectedCountry) ? detectedCountry : prev.country,
    }));
  };

  const getInputClass = (field: string) =>
    `rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      addressFieldErrors[field]
        ? "checkout-field-error checkout-field-shake border-red-400 ring-red-200 focus:ring-red-200"
        : "border-[#E1D5B8] focus:ring-[#C6A75E]"
    }`;

  return (
    <section className="rounded-2xl border border-[#E6D6AE] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#2A2418]">Address Book</h3>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-[#D7BE84] px-3 py-1.5 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF9EA]"
            onClick={() => {
              setShowAddAddress(true);
              setAddressError(null);
              setAddressFieldErrors({});
            }}
            type="button"
          >
            Add New
          </button>
          <button
            className="rounded-lg border border-[#D7BE84] px-3 py-1.5 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF9EA]"
            onClick={() => router.get("/profile/address-book")}
            type="button"
          >
            Manage
          </button>
        </div>
      </div>

      <Modal show={showAddAddress} onClose={() => setShowAddAddress(false)} maxWidth="2xl">
        <div className="border-b border-[#EEE1C5] px-6 py-4">
          <h3 className="text-xl font-semibold text-[#2A2418]">Add New Address</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={getInputClass("label")} placeholder="Label (optional)" value={addressForm.label} onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} />
            <select className={getInputClass("country")} value={addressForm.country} onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))}>
              {addressCountries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <div>
              <input className={`w-full ${getInputClass("first_name")}`} placeholder="First name*" value={addressForm.first_name} onChange={(e) => setAddressForm((p) => ({ ...p, first_name: e.target.value }))} />
              {addressFieldErrors.first_name && <p className="mt-1 text-sm text-red-600">{addressFieldErrors.first_name}</p>}
            </div>
            <div>
              <input className={`w-full ${getInputClass("last_name")}`} placeholder="Last name*" value={addressForm.last_name} onChange={(e) => setAddressForm((p) => ({ ...p, last_name: e.target.value }))} />
              {addressFieldErrors.last_name && <p className="mt-1 text-sm text-red-600">{addressFieldErrors.last_name}</p>}
            </div>
            <div className="md:col-span-2">
              {canUseGoogleAddressLookup && isLoaded ? (
                <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handleAddressPick}>
                  <input
                    className={`w-full ${getInputClass("address_line1")}`}
                    placeholder="Address line 1*"
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm((p) => ({ ...p, address_line1: e.target.value }))}
                  />
                </Autocomplete>
              ) : (
                <input className={`w-full ${getInputClass("address_line1")}`} placeholder="Address line 1*" value={addressForm.address_line1} onChange={(e) => setAddressForm((p) => ({ ...p, address_line1: e.target.value }))} />
              )}
              {addressFieldErrors.address_line1 && <p className="mt-1 text-sm text-red-600">{addressFieldErrors.address_line1}</p>}
            </div>
            <input className={`md:col-span-2 ${getInputClass("address_line2")}`} placeholder="Address line 2" value={addressForm.address_line2} onChange={(e) => setAddressForm((p) => ({ ...p, address_line2: e.target.value }))} />
            <div>
              <input className={`w-full ${getInputClass("city")}`} placeholder="City*" value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} />
              {addressFieldErrors.city && <p className="mt-1 text-sm text-red-600">{addressFieldErrors.city}</p>}
            </div>
            <input className={getInputClass("county")} placeholder="County" value={addressForm.county} onChange={(e) => setAddressForm((p) => ({ ...p, county: e.target.value }))} />
            <div className="md:col-span-2">
              <input className={`w-full ${getInputClass("postcode")}`} placeholder="Postcode*" value={addressForm.postcode} onChange={(e) => setAddressForm((p) => ({ ...p, postcode: e.target.value }))} />
              {addressFieldErrors.postcode && <p className="mt-1 text-sm text-red-600">{addressFieldErrors.postcode}</p>}
            </div>
          </div>
          {addressError && <p className="text-sm text-red-600">{addressError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddAddress(false)} type="button" className="rounded-lg border border-[#D7BE84] px-4 py-2 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]">Cancel</button>
            <button onClick={submitAddress} type="button" className="rounded-lg bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C]">Save address</button>
          </div>
        </div>
      </Modal>

      {loadingSavedData ? (
        <p className="text-sm text-gray-500">Loading saved addresses...</p>
      ) : addresses.length === 0 ? (
        <p className="text-sm text-gray-500">No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-xl border border-[#ECDDB8] bg-[#FFFEFA] p-4">
              <div>
                <p className="text-sm font-semibold text-[#332A16]">{address.first_name} {address.last_name}</p>
                <p className="mt-1 text-sm text-[#6C6250]">
                  {[address.address_line1, address.address_line2, address.city, address.county, address.postcode, address.country].filter(Boolean).join(", ")}
                </p>
                {address.phone && <p className="mt-1 text-xs text-[#857960]">{address.phone}</p>}
                {address.is_default && <p className="mt-1 text-xs font-medium text-[#8A6D2B]">Default address</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
