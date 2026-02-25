import React, { useState } from "react";
import axios from "axios";

// Important: configure axios once
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
axios.defaults.withCredentials = true;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const gold = "#C6A75E";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);
    setLoading(true);

    try {
      // If using Sanctum, first get CSRF cookie
      await axios.get("/sanctum/csrf-cookie");

      await axios.post("/forgot-password", { email });

      setSent(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.email?.[0] ||
        "Something went wrong. Please try again.";

      setErrors(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-">
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2 text-lg">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full rounded-2xl border px-6 py-5 text-gray-900 text-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors ? "border-red-500 focus:ring-red-400" : "border-gray-200 focus:ring-[#C6A75E]"
              }`}
            />
            {/* Error below input */}
            {errors && (
              <p className="text-red-500 mt-2 text-sm font-medium">{errors}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 text-white font-semibold text-lg rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
            style={{
              background: gold,
              opacity: loading ? 0.8 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center space-y-6 animate-fade-in scale-up">
          <div
            className="w-20 h-20 flex items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(198,167,94,0.2)" }}
          >
            <svg
              className="w-12 h-12 text-[#C6A75E]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Reset Link Sent!
          </h2>
          <p className="text-gray-700 text-center max-w-xs">
            If the email exists in our system, a password reset link has been sent.
          </p>

          <button
            onClick={() => setSent(false)}
            className="mt-4 px-8 py-3 bg-[#C6A75E] text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            Send Another
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
          .scale-up {
            transform-origin: center;
          }
        `}
      </style>
    </div>
  );
}
