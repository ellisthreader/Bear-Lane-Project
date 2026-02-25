import React from "react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function SocialLogin() {
  const gold = "#C6A75E";

  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/auth/facebook";
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200 text-gray-900 font-semibold text-lg"
      >
        <FcGoogle size={24} />
        Sign up with Google
      </button>

      <button
        type="button"
        onClick={handleFacebookLogin}
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200 text-gray-900 font-semibold text-lg"
        style={{ borderColor: gold }}
      >
        <FaFacebook size={24} />
        Sign up with Facebook
      </button>
    </div>
  );
}
