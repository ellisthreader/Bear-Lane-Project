import React, { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import OAuthVerify from "./OAuthVerify";
import NavMenu from "@/Components/Menu/NavMenu";
import { executeRecaptcha } from "@/Utils/recaptcha";

export default function AuthPage() {
  const isRegisterRoute = typeof window !== "undefined" && window.location.pathname === "/register";
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "password" | "register" | "oauthVerify">(
    isRegisterRoute ? "register" : "email",
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const emailFormRef = useRef<HTMLFormElement | null>(null);
  const passwordFormRef = useRef<HTMLFormElement | null>(null);

  // -----------------------
  // Handle email step
  // -----------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email or username.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/login/method", { email: email.trim() });
      const requiresEmailCode = Boolean(response?.data?.requires_email_code);
      setStep(requiresEmailCode ? "oauthVerify" : "password");
    } catch {
      setStep("password");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // Handle password login
  // -----------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha("login");

      router.post(
        "/login",
        { email, password, recaptcha_token: recaptchaToken },
        {
          preserveScroll: true,
          onError: (errors) => {
            const emailError = errors.email || "";
            const oauthBlocked =
              typeof emailError === "string" &&
              emailError.toLowerCase().includes("linked to") &&
              emailError.toLowerCase().includes("login");

            if (oauthBlocked) {
              setPassword("");
              setError(null);
              setStep("oauthVerify");
              return;
            }

            if (errors.password) setError(errors.password);
            else if (errors.email) setError(errors.email);
            else if ((errors as Record<string, string>).captcha) setError((errors as Record<string, string>).captcha);
            else setError("Invalid credentials. Please try again.");
          },
          onFinish: () => setLoading(false),
        }
      );
    } catch (captchaError) {
      setError(captchaError instanceof Error ? captchaError.message : "Captcha verification failed. Please try again.");
      setLoading(false);
    }
  };

  // -----------------------
  // OAuth redirects
  // -----------------------
  const handleGoogleLogin = () => (window.location.href = "/auth/google");
  const handleFacebookLogin = () => (window.location.href = "/auth/facebook");

  const allowScroll = step === "register" || step === "oauthVerify" || showForgotPassword;
  const scrollClass = allowScroll ? "overflow-y-auto" : "overflow-hidden";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("email_verified") !== "1") return;

    setVerificationNotice("Email verified. You can now sign in.");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <NavMenu />

      <main className="flex flex-1 min-h-0 items-stretch overflow-hidden">
        {/* Left Side */}
        <div
          className={`relative z-10 w-full md:w-1/2 flex flex-1 min-h-0 flex-col items-center justify-center px-4 sm:px-6 md:px-0 pt-4 pb-6 md:pt-20 md:justify-start md:overflow-y-auto ${scrollClass} pointer-events-auto hit-test-fix`}
        >
          <div className="flex flex-col justify-start items-center w-full max-w-[360px] sm:max-w-md space-y-4 sm:space-y-5 pb-6 pointer-events-auto">
            {/* Logo */}
            <div className="flex justify-center mb-1">
              <img loading="lazy" decoding="async" src="/images/BL-Logo.png" alt="Logo" className="w-24 sm:w-32 md:w-44 h-auto" />
            </div>

            {/* Forgot Password */}
            {showForgotPassword ? (
              <div className="w-full animate-fadeIn">
                <ForgotPassword email={email} />
                <div className="text-center mt-4 text-gray-500">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="underline hover:text-gray-900 text-lg transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                {verificationNotice && (
                  <div className="w-full rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {verificationNotice}
                  </div>
                )}

                {/* Email Step */}
                {step === "email" && (
                  <div className="w-full space-y-5 animate-fadeIn">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center">Hi There!</h2>
                    <p className="text-gray-700 text-center mt-2 text-sm sm:text-base md:text-lg">
                      Enter your email or username to sign in or join.
                    </p>
                    <form ref={emailFormRef} onSubmit={handleEmailSubmit} className="space-y-4">
                      <input
                        type="text"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com or username"
                        required
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-gray-900 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
                      />
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-[#C6A75E] py-3.5 text-base font-semibold text-white shadow-md transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80 sm:py-4 sm:text-lg touch-manipulation"
                      >
                        {loading ? "Checking..." : "Continue"}
                      </button>
                      <p className="text-center text-sm text-[#6B5A34]">
                        New here?{" "}
                        <button
                          type="button"
                          onClick={() => setStep("register")}
                          className="font-semibold text-blue-600 underline underline-offset-2 touch-manipulation"
                        >
                          Create a new account
                        </button>
                      </p>
                    </form>

                    <div className="flex items-center my-3">
                      <hr className="flex-1 border-gray-300" />
                      <span className="mx-2 text-gray-400 font-medium">OR</span>
                      <hr className="flex-1 border-gray-300" />
                    </div>

                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 bg-white touch-manipulation"
                      >
                        <FcGoogle size={32} />
                      </button>
                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 bg-white text-blue-600 touch-manipulation"
                      >
                        <FaFacebookF size={28} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Password Step */}
                {step === "password" && (
                  <div className="w-full space-y-5 animate-fadeIn">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center">Welcome Back!</h2>
                    <p className="text-gray-700 text-center mt-2 text-sm sm:text-base md:text-lg">Enter your password to sign in.</p>
                    <form ref={passwordFormRef} onSubmit={handleLogin} className="space-y-4">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-gray-900 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
                      />
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-[#C6A75E] py-3.5 text-base font-semibold text-white shadow-md transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80 sm:py-4 sm:text-lg touch-manipulation"
                      >
                        {loading ? "Logging in..." : "Login"}
                      </button>
                      <p className="text-center text-sm text-[#6B5A34]">
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setStep("register")}
                          className="font-semibold text-blue-600 underline underline-offset-2 touch-manipulation"
                        >
                          Register
                        </button>
                      </p>
                    </form>
                    <div className="text-center mt-4 text-gray-500">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="underline hover:text-gray-900 text-lg transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                )}

                {/* Register Step */}
                {step === "register" && <Register email={email} />}
                {step === "oauthVerify" && <OAuthVerify email={email.trim()} />}

              </>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="hidden md:flex md:w-1/2 items-stretch overflow-hidden">
          <img loading="lazy" decoding="async"
            src="images/Login-Art.png"
            alt="Decorative"
            className="w-full h-full object-cover animate-fadeInRight"
          />
        </div>
      </main>
    </div>
  );
}
