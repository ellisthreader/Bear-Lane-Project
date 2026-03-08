import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";

interface Props {
  email: string;
}

export default function OAuthVerify({ email }: Props) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // -----------------------
  // SEND CODE ON LOAD
  // -----------------------
  useEffect(() => {
    const sendCode = async () => {
      if (!email) return;

      setSending(true);
      setError(null);

      try {
        await axios.post("/oauth/send-code", { email });
      } catch (err: any) {
        if (err.response?.status === 429) {
          setError("Too many requests. Please wait before trying again.");
        } else {
          setError("Failed to send verification code.");
        }
      } finally {
        setSending(false);
      }
    };

    sendCode();
  }, [email]);

  // -----------------------
  // HANDLE INPUT CHANGE
  // -----------------------
  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // -----------------------
  // VERIFY
  // -----------------------
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCode = code.join("");

    if (finalCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("/oauth/verify-code", {
        email,
        code: finalCode,
      });

      if (res.data.success) {
        router.visit("/profile");
      } else {
        setError("Invalid or expired code.");
      }
    } catch (err) {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // RESEND
  // -----------------------
  const handleResend = async () => {
    setError(null);
    setSending(true);

    try {
      await axios.post("/oauth/resend-code", { email });
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError("Too many resend attempts. Please wait.");
      } else {
        setError("Error resending code.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-6 px-3 pb-2 pt-1 animate-fadeIn sm:space-y-8 sm:px-0">
      <p className="text-center text-lg leading-relaxed text-gray-800 sm:text-xl">
        {sending
          ? "Sending verification code..."
          : "A 6-digit code has been sent to "}
        {!sending && (
          <span className="font-semibold text-gray-900">{email}</span>
        )}
        {!sending && (
          <>
            <br />
            Enter it below to continue.
          </>
        )}
      </p>

      <form onSubmit={handleVerify} className="space-y-6 sm:space-y-8">
        <div className="flex justify-center gap-2 sm:gap-4">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              value={digit}
              maxLength={1}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="h-14 w-11 rounded-2xl border border-gray-200 bg-white text-center text-xl shadow-sm transition-all duration-200 focus:border-[#C6A75E] focus:outline-none focus:ring-2 focus:ring-[#C6A75E] sm:h-16 sm:w-14 sm:text-2xl"
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[#C6A75E] py-4 text-lg font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#b89148] hover:shadow-lg sm:py-5 sm:text-xl"
        >
          {loading ? "Verifying..." : "Continue"}
        </button>
      </form>

      <div className="text-center text-gray-600">
        Didn't receive the code?{" "}
        <button
          onClick={handleResend}
          disabled={sending}
          className="underline hover:text-gray-900 font-semibold transition-colors"
        >
          {sending ? "Sending..." : "Resend"}
        </button>
      </div>
    </div>
  );
}
