import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { Transition } from "@headlessui/react";
import NavMenu from "@/Components/Menu/NavMenu";

export default function VerifyEmail() {
  const [message, setMessage] = useState<string | null>(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (!isCooldown || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsCooldown(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCooldown, remainingSeconds]);

  const handleResend = () => {
    if (isCooldown) return;

    router.post(
      "/email/verification-notification",
      {},
      {
        onSuccess: () => {
          setMessage("Verification link sent successfully. Please check your inbox.");
          setIsCooldown(true);
          setRemainingSeconds(60);
        },
        onError: (errors: any) => {
          if (errors?.response?.status === 429) {
            setMessage("Please wait before requesting another verification email.");
            setIsCooldown(true);
            const remaining = errors?.response?.data?.remaining_seconds ?? 60;
            setRemainingSeconds(remaining);
          } else {
            setMessage("Something went wrong. Please try again later.");
          }
        },
      }
    );
  };

  return (
    <>
      <NavMenu />

      {/* Main Wrapper — No Scroll */}
      <div className="relative h-[calc(100vh-80px)] overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4">

        {/* Soft Gold Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C6A75E]/10 blur-[140px] rounded-full pointer-events-none" />

        <Transition
          show={mounted}
          appear
          enter="transform transition duration-700 ease-out"
          enterFrom="opacity-0 translate-y-8 scale-95"
          enterTo="opacity-100 translate-y-0 scale-100"
        >
          {/* Slightly lifted card */}
          <div className="relative -mt-12 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 text-center">

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img
                src="/images/BL-Logo.png"
                alt="BL Logo"
                className="h-14 w-auto object-contain"
              />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Verify Your Email
            </h1>

            <p className="text-gray-600 text-base leading-relaxed mb-8 max-w-md mx-auto">
              We’ve sent a verification link to your email address.
              Please confirm your email to unlock full access to your account.
            </p>

            {/* Button */}
            <button
              onClick={handleResend}
              disabled={isCooldown}
              className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all duration-300
                ${
                  isCooldown
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#C6A75E] hover:bg-[#b89148] text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                }
              `}
            >
              {isCooldown
                ? `Resend Available In ${remainingSeconds}s`
                : "Resend Verification Email"}
            </button>

            {/* Animated Status */}
            <Transition
              show={!!message}
              enter="transform transition duration-500 ease-out"
              enterFrom="opacity-0 translate-y-4 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition duration-300 ease-in"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div
                className={`mt-6 px-6 py-4 rounded-2xl text-sm font-medium border
                  ${
                    message?.includes("successfully")
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }
                `}
              >
                {message}
              </div>
            </Transition>

          </div>
        </Transition>
      </div>
    </>
  );
}