import React, { useState, useEffect } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function ResetPassword() {
  const pathParts = window.location.pathname.split("/");
  const token = pathParts[pathParts.length - 1];

  const query = new URLSearchParams(window.location.search);
  const email = query.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [status, setStatus] = useState<string | null>(null);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const gold = "#C6A75E";

  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  if (!token || !email) {
    return (
      <div className="text-red-500 p-4 text-center text-lg font-semibold">
        Invalid or expired link.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    if (!passwordCriteria.length)
      newErrors.passwordLength = "At least 8 characters required.";
    if (!passwordCriteria.uppercase)
      newErrors.passwordUppercase = "Must contain uppercase letter.";
    if (!passwordCriteria.number)
      newErrors.passwordNumber = "Must contain a number.";
    if (!passwordCriteria.special)
      newErrors.passwordSpecial = "Must contain a special character.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await axios.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      setStatus("Password reset successfully! Redirecting to login...");
      setErrors({});

      setTimeout(() => {
        router.visit("/login");
      }, 2000);
    } catch (err: any) {
      setErrors({
        general:
          err.response?.data?.errors?.email?.[0] || "Invalid or expired link.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.08)] border border-[#EFE3C3] p-16 flex flex-col">
        <h2 className="text-3xl font-semibold text-center text-gray-900 mb-8">
          Reset Password
        </h2>

        {/* Success Notification */}
        {status && (
          <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5 mb-8 shadow-md">
            <CheckCircleIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium text-lg">{status}</p>
          </div>
        )}

        {/* Error Notification */}
        {errors.general && (
          <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 shadow-md">
            <XCircleIcon className="w-8 h-8 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium text-lg">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-gray-700 font-medium mb-3 text-xl">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-6 py-6 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
              placeholder="Enter new password"
              required
            />
            <ul className="text-base text-gray-500 mt-3 space-y-1">
              <li
                className={passwordCriteria.length ? "text-green-600 font-semibold" : ""}
              >
                • At least 8 characters
              </li>
              <li
                className={passwordCriteria.uppercase ? "text-green-600 font-semibold" : ""}
              >
                • Contains uppercase letter
              </li>
              <li
                className={passwordCriteria.number ? "text-green-600 font-semibold" : ""}
              >
                • Contains a number
              </li>
              <li
                className={passwordCriteria.special ? "text-green-600 font-semibold" : ""}
              >
                • Contains special character
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3 text-xl">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-6 py-6 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
              placeholder="Confirm new password"
              required
            />
            {errors.confirmPassword && (
              <p className="text-red-600 font-medium text-base mt-2 flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-red-600" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-6 text-white font-semibold text-lg rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg"
            style={{ background: gold }}
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
