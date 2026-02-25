"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import LuxuryPhoneInput from "@/Components/LuxuryPhoneInput";

export default function SpeakToArtist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);

  const gold = "#C9A24D";
  const maxCharacters = 1000;

  /* ---------------- EMAIL VALIDATION ---------------- */

  const isEmailValid = (email: string) => {
    const strictRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    return strictRegex.test(email.trim());
  };

  const emailValid = !touchedEmail || isEmailValid(email);

  /* ---------------- PHONE VALIDATION ---------------- */

  const isPhoneValid =
    !touchedPhone ||
    (phone.length > 5 && isValidPhoneNumber(phone));

  /* ---------------- BUDGET HANDLER ---------------- */

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    const numeric = value.replace(/\D/g, "");

    if (!numeric) {
      setBudget("");
      return;
    }

    setBudget("£" + numeric);
  };

  /* ---------------- FORM VALIDATION ---------------- */

  const isFormValid =
    name.trim().length > 0 &&
    isEmailValid(email) &&
    phone.length > 5 &&
    isValidPhoneNumber(phone) &&
    details.trim().length > 0;

  /* ---------------- FILE HANDLING ---------------- */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    setFiles((prev) => [...prev, ...selectedFiles]);

    const newPreviews = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const updatedFiles = [...files];
    const updatedPreviews = [...previews];

    URL.revokeObjectURL(updatedPreviews[index]);

    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  /* ---------------- SUBMIT ---------------- */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost";

const handleSubmit = async () => {
  if (!isFormValid) return;

  setLoading(true);
  setError("");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("phone", phone);
  formData.append("budget", budget);
  formData.append("details", details);
  files.forEach((file) => formData.append("images[]", file));

  try {
    const response = await fetch(`${API_URL}/api/quote-request`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Submission failed");

    setSubmitted(true);
    setName("");
    setEmail("");
    setPhone("");
    setBudget("");
    setDetails("");
    setFiles([]);
    setPreviews([]);
    setTimeout(() => setSubmitted(false), 2500);

  } catch (err) {
    console.error(err);
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};




  return (
    <div className="bg-white px-4 md:px-0 pt-10 pb-20 max-w-4xl mx-auto">
      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-12">
        Speak to an Embroidery Artist
      </h1>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />

            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouchedEmail(true)}
                className={`w-full rounded-xl border px-5 py-4 focus:outline-none focus:ring-2 ${
                  !emailValid
                    ? "border-red-400 ring-red-200 focus:ring-red-200"
                    : "border-gray-200 focus:ring-[#C9A24D]"
                }`}
              />
              {!emailValid && (
                <p className="text-red-500 text-sm mt-1">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            <LuxuryPhoneInput
              value={phone}
              onChange={(v) => setPhone(v)}
              required
              onBlur={() => setTouchedPhone(true)}
            />

            <input
              type="text"
              placeholder="Estimated Budget"
              value={budget}
              onChange={handleBudgetChange}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />

            <div>
              <textarea
                maxLength={maxCharacters}
                placeholder="Describe your design in detail..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 h-40 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {details.length}/{maxCharacters}
              </div>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {previews.map((src, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                  >
                    <img
                      src={src}
                      alt={`Upload ${index}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-6 cursor-pointer hover:border-[#C9A24D] transition-colors">
              <span className="text-gray-600">
                Upload Reference Images
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {error && (
              <p className="text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className={`w-full py-5 rounded-2xl text-white font-semibold transition-all duration-200 ${
                !isFormValid || loading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:scale-[1.02]"
              }`}
              style={{ backgroundColor: gold }}
            >
              {loading ? "Submitting..." : "Request Detailed Quote"}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-28"
          >
            <div className="bg-[#C9A24D] text-white rounded-full p-5 mb-5 shadow-lg">
              <Check size={36} />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Request Sent
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Thank you. Our embroidery artist will contact you shortly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
