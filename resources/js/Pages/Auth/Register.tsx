import React, { useState, useEffect } from "react";
import axios from "axios";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

type RegisterProps = {
  email?: string;
};

export default function Register({ email: initialEmail = "" }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupErrors, setSignupErrors] = useState<any>({});
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [signupLoading, setSignupLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // --------------------------
  // Password strength
  // --------------------------
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 0:
      case 1:
        return { label: "Weak", color: "text-red-500" };
      case 2:
        return { label: "Medium", color: "text-orange-500" };
      case 3:
        return { label: "Strong", color: "text-green-500" };
      case 4:
        return { label: "Very Strong", color: "text-green-700" };
      default:
        return { label: "", color: "" };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    setEmail(initialEmail || "");
  }, [initialEmail]);

  // --------------------------
  // Username validation (local only)
  // --------------------------
  useEffect(() => {
    if (!username) {
      setUsernameSuggestions([]);
      setSignupErrors((prev: any) => ({ ...prev, username: undefined }));
      return;
    }

    if (username.length > 20) {
      setSignupErrors((prev: any) => ({
        ...prev,
        username: "Username must be 20 characters or less.",
      }));
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setSignupErrors((prev: any) => ({
        ...prev,
        username: "Only letters, numbers, and underscores are allowed.",
      }));
      return;
    }

    setSignupErrors((prev: any) => ({ ...prev, username: undefined }));
    setUsernameSuggestions([]);
  }, [username]);

  // --------------------------
  // Email validation (local only)
  // --------------------------
  useEffect(() => {
    if (!email) {
      setSignupErrors((prev: any) => ({ ...prev, email: undefined }));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setSignupErrors((prev: any) => ({
        ...prev,
        email: "Invalid email address.",
      }));
      return;
    }

    setSignupErrors((prev: any) => ({ ...prev, email: undefined }));
  }, [email]);

  // --------------------------
  // Confirm password check
  // --------------------------
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setSignupErrors((prev: any) => ({
        ...prev,
        confirmPassword: "Passwords do not match.",
      }));
    } else {
      setSignupErrors((prev: any) => {
        const { confirmPassword, ...rest } = prev;
        return rest;
      });
    }
  }, [password, confirmPassword]);

  // --------------------------
  // Handle signup
  // --------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted) return;

    setHasSubmitted(true);
    setSignupLoading(true);

    const errors: any = {};
    if (!username) errors.username = "Username is required.";
    if (!email) errors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      errors.email = "Invalid email address.";
    if (!password) errors.password = "Password is required.";
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      setSignupLoading(false);
      setHasSubmitted(false);
      return;
    }

    setSignupErrors({});

    try {
      const response = await axios.post("/register", {
        username,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      const redirectTo = response?.data?.redirect || "/profile";
      window.location.href = redirectTo;
    } catch (err: any) {
      const backendErrors = err.response?.data?.errors || {};
      const backendMessage = err.response?.data?.message;
      const mappedErrors: Record<string, string> = {};
      Object.entries(backendErrors).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          mappedErrors[key] = String(value[0]);
          return;
        }
        if (typeof value === "string") {
          mappedErrors[key] = value;
        }
      });
      if ((!backendErrors || Object.keys(backendErrors).length === 0) && backendMessage) {
        mappedErrors.general = backendMessage;
      }
      if (!mappedErrors.general && (!backendErrors || Object.keys(backendErrors).length === 0)) {
        mappedErrors.general = "Sign up failed. Please try again.";
      }
      setSignupErrors(mappedErrors);
      setHasSubmitted(false);
    } finally {
      setSignupLoading(false);
    }
  };

  // --------------------------
  // Social login handlers
  // --------------------------
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/auth/facebook";
  };

  return (
    <form
      onSubmit={handleSignup}
      className="space-y-4 w-full max-w-2xl mx-auto px-4"
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-[#C6A75E] hover:shadow-md transition-all duration-200 text-gray-900 font-semibold text-lg"
        >
          <FcGoogle size={20} /> Sign up with Google
        </button>

        <button
          type="button"
          onClick={handleFacebookLogin}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-[#C6A75E] hover:shadow-md transition-all duration-200 text-gray-900 font-semibold text-lg"
        >
          <FaFacebook size={20} /> Sign up with Facebook
        </button>
      </div>

      <div className="flex items-center my-1">
        <hr className="flex-1 border-gray-300" />
        <span className="mx-2 text-gray-400 font-medium">OR</span>
        <hr className="flex-1 border-gray-300" />
      </div>

      {signupErrors.general && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {signupErrors.general}
        </p>
      )}

      {/* Username */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          placeholder="Your username"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.username && (
          <p className="text-red-500 text-sm mt-1">
            {signupErrors.username}
          </p>
        )}
        {usernameSuggestions.length > 0 && (
          <p className="text-gray-500 text-sm mt-1">
            Suggestions: {usernameSuggestions.join(", ")}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.email && (
          <p className="text-red-500 text-sm mt-1">{signupErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.password && (
          <p className="text-red-500 text-sm mt-1">
            {signupErrors.password}
          </p>
        )}
        {password && (
          <p className={`mt-1 font-semibold ${passwordStrength.color} text-sm`}>
            Password Strength: {passwordStrength.label}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">
            {signupErrors.confirmPassword}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={signupLoading || hasSubmitted}
        className="w-full py-4 bg-[#C6A75E] hover:bg-[#b89148] text-white font-semibold rounded-2xl text-lg transition-all duration-300"
      >
        {signupLoading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}
