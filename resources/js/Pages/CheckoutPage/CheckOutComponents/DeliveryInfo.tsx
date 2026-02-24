import React, { useEffect, useMemo, useState } from "react";
import { useCheckout } from "@/Context/CheckoutContext";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";
import { getCountryCode } from "@/Utils/countryCodes";
import LuxuryPhoneInput from "@/Components/LuxuryPhoneInput";
import type { CheckoutFieldErrors, CheckoutFieldKey } from "../CheckoutForm";

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

type DeliveryInfoProps = {
  invalidFields?: Set<CheckoutFieldKey>;
  fieldErrors?: CheckoutFieldErrors;
  onFieldValueChange?: (field: CheckoutFieldKey, value: string) => void;
};

export default function DeliveryInfo({
  invalidFields = new Set<CheckoutFieldKey>(),
  fieldErrors = {},
  onFieldValueChange,
}: DeliveryInfoProps) {
  const { address, setAddress, country, setCountry } = useCheckout();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [lookupValue, setLookupValue] = useState("");

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const countries = useMemo(
    () => [
      "Australia",
      "Austria",
      "Belgium",
      "Canada",
      "Croatia",
      "Cyprus",
      "Czech Republic",
      "Denmark",
      "Estonia",
      "Finland",
      "France",
      "Germany",
      "Greece",
      "Hong Kong",
      "Hungary",
      "Iceland",
      "India",
      "Indonesia",
      "Ireland",
      "Israel",
      "Italy",
      "Japan",
      "Latvia",
      "Lithuania",
      "Luxembourg",
      "Malaysia",
      "Malta",
      "Mexico",
      "Netherlands",
      "New Zealand",
      "Norway",
      "Philippines",
      "Poland",
      "Portugal",
      "Singapore",
      "Slovakia",
      "Slovenia",
      "South Korea",
      "Spain",
      "Sweden",
      "Switzerland",
      "Taiwan",
      "Thailand",
      "Turkey",
      "United Arab Emirates",
      "United Kingdom",
      "United States",
      "Vietnam",
    ],
    []
  );

  useEffect(() => {
    if (!autocomplete) return;
    const iso = getCountryCode(country);
    if (iso) autocomplete.setComponentRestrictions({ country: iso });
  }, [autocomplete, country]);

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

    const line1 = `${streetNumber} ${route}`.trim() || address.addressLine1;

    setAddress((prev) => ({
      ...prev,
      addressLine1: line1,
      city: locality || prev.city,
      county: county || prev.county,
      postcode: postcode || prev.postcode,
      country: detectedCountry && countries.includes(detectedCountry) ? detectedCountry : prev.country,
    }));

    if (detectedCountry && countries.includes(detectedCountry)) {
      setCountry(detectedCountry);
    }

    setLookupValue(place.formatted_address || line1);
    setManualEntry(true);
  };

  const handleChange =
    (key: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      if (key === "country") setCountry(value);
      setAddress((prev) => ({ ...prev, [key]: value }));

      const requiredFieldMap: Partial<Record<keyof typeof address, CheckoutFieldKey>> = {
        firstName: "firstName",
        lastName: "lastName",
        country: "country",
        addressLine1: "addressLine1",
        city: "city",
        postcode: "postcode",
      };

      const mappedField = requiredFieldMap[key];
      if (mappedField) onFieldValueChange?.(mappedField, value);
    };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-[#C6A75E] focus:ring-2 focus:ring-[#C6A75E]/25 focus:outline-none";
  const isInvalid = (field: CheckoutFieldKey) => invalidFields.has(field);
  const getInputClass = (field: CheckoutFieldKey) =>
    `${inputClass} ${
      isInvalid(field)
        ? "checkout-field-error checkout-field-shake border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200"
        : ""
    }`;
  const lookupInvalid =
    !manualEntry &&
    (isInvalid("addressLine1") || isInvalid("city") || isInvalid("postcode") || isInvalid("addressLookup"));
  const lookupFieldError =
    !manualEntry &&
    (Boolean(fieldErrors.addressLine1) || Boolean(fieldErrors.city) || Boolean(fieldErrors.postcode)) &&
    (!address.addressLine1 || !address.city || !address.postcode);

  if (!isLoaded) {
    return (
      <div className="p-0">
        <p className="text-sm text-gray-500">Loading address lookup...</p>
      </div>
    );
  }

  return (
    <div className="p-0">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Delivery details</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label>
          <input className={getInputClass("firstName")} value={address.firstName} onChange={handleChange("firstName")} required />
          {fieldErrors.firstName && !address.firstName && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.firstName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label>
          <input className={getInputClass("lastName")} value={address.lastName} onChange={handleChange("lastName")} required />
          {fieldErrors.lastName && !address.lastName && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.lastName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
          <LuxuryPhoneInput
            value={address.phone || ""}
            onChange={(value) => {
              setAddress((prev) => ({ ...prev, phone: value }));
              onFieldValueChange?.("phone", value);
            }}
            forceError={isInvalid("phone")}
            className={isInvalid("phone") ? "checkout-field-shake" : undefined}
          />
          {fieldErrors.phone && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Country or region</label>
          <select className={getInputClass("country")} value={country} onChange={handleChange("country")} required>
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {fieldErrors.country && !country && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.country}</p>}
        </div>

        {!manualEntry ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Add your postcode or address *</label>
            <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handleAddressPick}>
              <input
                className={`${inputClass} ${
                  lookupFieldError
                    ? "checkout-field-error checkout-field-shake border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200"
                    : ""
                }`}
                value={lookupValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setLookupValue(value);
                  onFieldValueChange?.("addressLookup", value);
                }}
                placeholder="Search for an address"
                required
              />
            </Autocomplete>
            {lookupFieldError && (
              <p className="mt-1.5 text-sm text-red-600">
                Please enter address.
              </p>
            )}

            <button
              type="button"
              onClick={() => setManualEntry(true)}
              className="mt-3 text-sm text-black underline underline-offset-4"
            >
              Enter address manually
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address line 1 *</label>
              <input className={getInputClass("addressLine1")} value={address.addressLine1} onChange={handleChange("addressLine1")} required />
              {fieldErrors.addressLine1 && !address.addressLine1 && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.addressLine1}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address line 2</label>
              <input className={inputClass} value={address.addressLine2} onChange={handleChange("addressLine2")} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Town/city *</label>
              <input className={getInputClass("city")} value={address.city} onChange={handleChange("city")} required />
              {fieldErrors.city && !address.city && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.city}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">County</label>
              <input className={inputClass} value={address.county ?? ""} onChange={handleChange("county")} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Postcode *</label>
              <input className={getInputClass("postcode")} value={address.postcode} onChange={handleChange("postcode")} required />
              {fieldErrors.postcode && !address.postcode && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.postcode}</p>}
            </div>

            <button
              type="button"
              onClick={() => setManualEntry(false)}
              className="text-sm text-black underline underline-offset-4"
            >
              Back to lookup address
            </button>
          </>
        )}
      </div>
    </div>
  );
}
