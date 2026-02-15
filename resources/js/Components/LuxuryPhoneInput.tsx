import React, { useState, useRef, useEffect } from "react";
import PhoneInput, { getCountries, getCountryCallingCode, isValidPhoneNumber } from "react-phone-number-input";
import en from "react-phone-number-input/locale/en.json";
import ReactCountryFlag from "react-country-flag";
import "react-phone-number-input/style.css";

type Props = {
  value: string;                  // digits only
  onChange: (value: string) => void;
  required?: boolean;
  onBlur?: () => void;
};

export default function LuxuryPhoneInput({ value, onChange, required = false, onBlur }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string>("GB");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [touched, setTouched] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const countries = getCountries();
  const filteredCountries = countries.filter((country) =>
    en[country].toLowerCase().includes(search.toLowerCase())
  );

  // Build full number for validation
  const fullNumber = `+${getCountryCallingCode(selectedCountry)}${value}`;
  const isValid = !touched || (value.length > 0 && isValidPhoneNumber(fullNumber));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`flex items-center border rounded-2xl px-4 py-3 bg-white transition-all ${
          !isValid
            ? "border-red-400 ring-2 ring-red-200"
            : "border-gray-200 hover:border-[#C9A24D]/50 focus-within:ring-2 focus-within:ring-[#C9A24D]"
        }`}
      >
        {/* COUNTRY SELECTOR */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 pr-3 border-r border-gray-200"
        >
          <ReactCountryFlag countryCode={selectedCountry} svg style={{ width: "1.5em", height: "1.5em" }} />
          <span className="text-sm font-medium text-gray-700">
            +{getCountryCallingCode(selectedCountry)}
          </span>
        </button>

        {/* PHONE INPUT */}
        <PhoneInput
          country={selectedCountry}
          international={false}   // ✅ national mode (removes + in input)
          value={value}
          onChange={(v) => onChange(v || "")}
          countrySelectComponent={() => null}
          onBlur={() => { setTouched(true); onBlur?.(); }}
          onFocus={() => setTouched(true)}
          className="flex-1 ml-3 focus:outline-none text-gray-900"
        />
      </div>

      {!isValid && touched && (
        <p className="text-red-500 text-sm mt-1">
          Please enter a valid phone number.
        </p>
      )}

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => {
                  setSelectedCountry(country);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAF7ED] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ReactCountryFlag countryCode={country} svg style={{ width: "1.4em", height: "1.4em" }} />
                  <span className="text-sm text-gray-800">{en[country]}</span>
                </div>
                <span className="text-sm text-gray-500">+{getCountryCallingCode(country)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
