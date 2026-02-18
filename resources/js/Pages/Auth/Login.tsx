import React, { useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import NavMenu from "@/Components/Menu/NavMenu";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "password" | "register">("email");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const gold = "#C6A75E";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return;
    setLoading(true);

    try {
      const res = await axios.post("/check-email", { email });
      if (res.data.exists) setStep("password");
      else setStep("register");
    } catch (err) {
      console.error(err);
      setError("Error checking email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  router.post(
    "/login",
    { email, password },
    {
      preserveScroll: true,

      onError: (errors) => {
        // If backend returns validation error
        if (errors.password) {
          setError(errors.password);
        } else if (errors.email) {
          setError(errors.email);
        } else {
          setError("Invalid credentials. Please try again.");
        }
      },

      onFinish: () => {
        setLoading(false);
      },
    }
  );
};

  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/auth/facebook";
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-white">
      <NavMenu />

      <main className="flex h-screen items-stretch overflow-hidden">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex flex-col justify-start items-center max-h-screen pt-16 md:pt-24">
          <div className="flex flex-col justify-start items-center w-full max-w-md space-y-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img src="/images/BL-Logo.png" alt="Logo" className="w-44 h-auto" />
            </div>

            {/* Show Forgot Password if triggered */}
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
                {/* Email Step */}
                {step === "email" && (
                  <div className="w-full space-y-6 animate-fadeIn">
                    <h2 className="text-4xl font-bold text-gray-900 text-center">Hi There!</h2>
                    <p className="text-gray-700 text-center mt-2 text-lg">
                      Enter your email to sign in or join.
                    </p>
                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full rounded-2xl border border-gray-200 px-6 py-6 text-gray-900 text-xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
                      />
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 text-white font-semibold text-xl rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                        style={{
                          background: gold,
                          opacity: loading ? 0.8 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        {loading ? "Checking..." : "Continue"}
                      </button>
                    </form>

                    <div className="flex items-center my-6">
                      <hr className="flex-1 border-gray-300" />
                      <span className="mx-2 text-gray-400 font-medium">OR</span>
                      <hr className="flex-1 border-gray-300" />
                    </div>

                    <div className="flex justify-center gap-6">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-16 h-16 flex items-center justify-center rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 bg-white"
                      >
                        <FcGoogle size={32} />
                      </button>
                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        className="w-16 h-16 flex items-center justify-center rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 bg-white text-blue-600"
                      >
                        <FaFacebookF size={28} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Password Step */}
                {step === "password" && (
                  <div className="w-full space-y-6 animate-fadeIn">
                    <h2 className="text-4xl font-bold text-gray-900 text-center">Welcome Back!</h2>
                    <p className="text-gray-700 text-center mt-2 text-lg">Enter your password to sign in.</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full rounded-2xl border border-gray-200 px-6 py-6 text-gray-900 text-xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition-all duration-200"
                      />
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 text-white font-semibold text-xl rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                        style={{
                          background: gold,
                          opacity: loading ? 0.8 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        {loading ? "Logging in..." : "Login"}
                      </button>
                    </form>

                    {/* Forgot Password Link */}
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
              </>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="hidden md:flex md:w-1/2 items-stretch overflow-hidden">
          <img
            src="images/Login-Art.png"
            alt="Decorative"
            className="w-full h-full object-cover animate-fadeInRight"
          />
        </div>
      </main>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }

        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeInRight {
          animation: fadeInRight 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
