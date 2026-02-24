import React, { useMemo, useState, useEffect } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import CheckoutForm from "./CheckoutForm";
import { CheckoutProvider } from "@/Context/CheckoutContext";

// ✅ Stripe public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY as string);

export default function CheckoutPage() {
  const page = usePage<{ auth?: { user?: unknown } }>();
  const isAuthenticated = Boolean(page.props.auth?.user);
  const authEmail = ((page.props.auth?.user as { email?: string } | undefined)?.email ?? "").trim();

  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);

  const showCheckoutForm = useMemo(
    () => isAuthenticated || continueAsGuest,
    [isAuthenticated, continueAsGuest]
  );

  useEffect(() => {
    if (isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const hasReturnParams =
      Boolean(params.get("payment_intent_client_secret")) || Boolean(params.get("redirect_status"));

    if (!hasReturnParams) return;

    const savedGuestEmail = sessionStorage.getItem("checkout_guest_email") || "";
    if (savedGuestEmail) setGuestEmail(savedGuestEmail);
    setContinueAsGuest(true);
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    router.post(
      "/login",
      { email, password, redirect: "/checkout" },
      {
        preserveScroll: true,
        preserveState: true,
        onError: (errors) => {
          setLoginError(
            (errors.password as string) ||
              (errors.email as string) ||
              "Login failed. Please check your details."
          );
        },
        onFinish: () => setLoginLoading(false),
      }
    );
  };

  const handleGoogleLogin = () => (window.location.href = "/auth/google?redirect=/checkout");
  const handleFacebookLogin = () => (window.location.href = "/auth/facebook?redirect=/checkout");

  const handleContinueGuest = () => {
    const trimmed = guestEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!isValidEmail) {
      setGuestError("Please enter a valid email address to continue as guest.");
      return;
    }

    setGuestError(null);
    setContinueAsGuest(true);
  };

  return (
    <>
      <Head title="Checkout" />
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-[#C6A75E]/20 bg-white">
          <div className="max-w-[1300px] mx-auto px-6 py-4">
            <Link href="/" className="inline-flex items-center">
              <div className="relative h-[50px] w-[220px]">
                <img
                  src="/images/BLText.png"
                  alt="Bear Lane"
                  className="w-full h-full object-contain select-none"
                />
              </div>
            </Link>
          </div>
        </header>

        <div className="max-w-[1300px] mx-auto py-10 px-6">
          {!showCheckoutForm ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-4xl font-semibold tracking-tight">Checkout</h1>
                <Link href="/courses" className="text-lg font-medium text-[#8A6D2B] hover:text-[#6F5724] transition-colors">
                  ← Continue Shopping
                </Link>
              </div>

              <p className="text-lg text-gray-600 mb-12">
                Complete your purchase by entering your delivery details and payment information below.
              </p>

              <div className="max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
                  <div className="p-10 lg:p-12">
                    <div className="flex justify-center mb-6">
                      <img src="/images/BL-Logo.png" alt="Logo" className="w-44 h-auto" />
                    </div>

                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Login</h2>
                    <p className="mt-2 text-base text-gray-600">
                      Sign in to use your saved details and checkout faster.
                    </p>

                    <form onSubmit={handleLogin} className="mt-7 space-y-5">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full rounded-2xl border border-gray-300 px-5 py-4 text-lg text-gray-900 focus:border-[#C6A75E] focus:ring-4 focus:ring-[#C6A75E]/20 focus:outline-none"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full rounded-2xl border border-gray-300 px-5 py-4 text-lg text-gray-900 focus:border-[#C6A75E] focus:ring-4 focus:ring-[#C6A75E]/20 focus:outline-none"
                      />

                      {loginError && <p className="text-sm text-red-600">{loginError}</p>}

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full rounded-2xl bg-[#C6A75E] px-4 py-4 text-lg font-semibold text-white hover:bg-[#B8994E] disabled:opacity-70 disabled:cursor-not-allowed transition"
                      >
                        {loginLoading ? "Logging in..." : "Login"}
                      </button>
                    </form>

                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-sm text-gray-500">or continue with</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:border-[#C6A75E]/40 hover:bg-[#FCF7EB] transition"
                      >
                        <FcGoogle size={20} />
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:border-[#C6A75E]/40 hover:bg-[#FCF7EB] transition"
                      >
                        <FaFacebookF size={18} className="text-[#1877F2]" />
                        Facebook
                      </button>
                    </div>
                  </div>

                  <div className="p-10 lg:p-12 border-t lg:border-t-0 lg:border-l border-[#C6A75E]/20">
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Or checkout as a guest</h2>
                    <p className="mt-5 text-xl text-gray-700 font-semibold">Checkout as guest</p>
                    <p className="mt-2 text-lg text-gray-600">No need to register</p>
                    <p className="mt-2 text-lg text-gray-600">Come back and create an account later if you wish</p>

                    <div className="mt-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email address (required)
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          if (guestError) setGuestError(null);
                        }}
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-gray-300 px-5 py-4 text-lg text-gray-900 focus:border-[#C6A75E] focus:ring-4 focus:ring-[#C6A75E]/20 focus:outline-none"
                      />
                      {guestError && <p className="mt-2 text-sm text-red-600">{guestError}</p>}
                    </div>

                    <p className="mt-7 text-sm text-gray-500 leading-relaxed">
                      By signing up, logging in, or continuing to share your information you are opting-in to our Privacy Policy and Terms and Conditions.
                    </p>

                    <button
                      type="button"
                      onClick={handleContinueGuest}
                      className="mt-7 w-full rounded-2xl border border-[#C6A75E]/40 bg-[#FCF7EB] px-4 py-4 text-lg font-semibold text-[#8A6D2B] hover:bg-[#F6ECD2] transition"
                    >
                      Continue as Guest
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-4xl font-semibold tracking-tight">Secure checkout</h1>
                <Link href="/courses" className="text-lg font-medium text-[#8A6D2B] hover:text-[#6F5724] transition-colors">
                  ← Continue Shopping
                </Link>
              </div>

            <p className="text-lg text-gray-600 mb-12">
              Complete your purchase by entering your delivery details and payment information below.
            </p>

            <Elements stripe={stripePromise}>
              <CheckoutProvider>
                <CheckoutForm initialEmail={isAuthenticated ? authEmail : guestEmail.trim()} />
              </CheckoutProvider>
            </Elements>
          </>
          )}
        </div>
      </div>
    </>
  );
}
