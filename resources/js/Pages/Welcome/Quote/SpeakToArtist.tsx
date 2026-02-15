"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import LuxuryPhoneInput from "@/Components/LuxuryPhoneInput";

export default function SpeakToArtist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // always string
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [touchedPhone, setTouchedPhone] = useState(false);

  const gold = "#C9A24D";
  const maxCharacters = 1000;

  // Email validation
  const isEmailValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Phone validation: only show error if touched
  const isPhoneValid = phone.trim().length > 6 || !touchedPhone;

  // Form validation
  const isFormValid =
    name.trim().length > 0 &&
    isEmailValid(email) &&
    phone.trim().length > 6 &&
    details.trim().length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
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

  const handleSubmit = () => {
    if (!isFormValid) return;

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);

    console.log({ name, email, phone, budget, details, files });
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
            {/* NAME */}
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />

            {/* PHONE */}
            <LuxuryPhoneInput
              value={phone}
              onChange={(v) => setPhone(v || "")}
              required
              onBlur={() => setTouchedPhone(true)}
            />

            {/* BUDGET */}
            <input
              type="text"
              placeholder="Estimated Budget (£)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
            />

            {/* DETAILS */}
            <div>
              <textarea
                maxLength={maxCharacters}
                placeholder="Describe your design in detail..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 h-40 focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {details.length}/{maxCharacters} characters
              </div>
            </div>

            {/* IMAGE PREVIEW */}
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

            {/* FILE UPLOAD */}
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-6 cursor-pointer hover:border-[#C9A24D] transition-colors">
              <span className="text-gray-600">Upload Reference Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`w-full py-5 rounded-2xl text-white font-semibold transition-all duration-200 ${
                !isFormValid ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
              }`}
              style={{ backgroundColor: gold }}
            >
              Request Detailed Quote
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
