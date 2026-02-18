import React, { useState, useEffect } from "react";
import axios from "axios";
import { Inertia } from "@inertiajs/inertia";
import confetti from "canvas-confetti";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupErrors, setSignupErrors] = useState<any>({});
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [signupLoading, setSignupLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const gold = "#C6A75E";

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

  // --------------------------
  // Username validation
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

    const timeout = setTimeout(() => {
      axios
        .get("/check-username", { params: { username } })
        .then((res) => {
          if (res.data.exists) {
            setSignupErrors((prev: any) => ({
              ...prev,
              username: "Username already taken.",
            }));
            setUsernameSuggestions(res.data.suggestions || []);
          } else {
            setSignupErrors((prev: any) => ({ ...prev, username: undefined }));
            setUsernameSuggestions([]);
          }
        })
        .catch(() => {
          setSignupErrors((prev: any) => ({
            ...prev,
            username: "Error checking username.",
          }));
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  // --------------------------
  // Email validation
  // --------------------------
  useEffect(() => {
    if (!email) return;

    const timeout = setTimeout(() => {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setSignupErrors((prev: any) => ({ ...prev, email: "Invalid email address." }));
        return;
      }

      axios
        .get("/check-email", { params: { email } })
        .then((res) => {
          if (res.data.exists) {
            setSignupErrors((prev: any) => ({
              ...prev,
              email: "This email is already registered.",
            }));
          } else {
            setSignupErrors((prev: any) => ({ ...prev, email: undefined }));
          }
        })
        .catch(() => {
          setSignupErrors((prev: any) => ({
            ...prev,
            email: "Error checking email.",
          }));
        });
    }, 500);

    return () => clearTimeout(timeout);
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
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Invalid email address.";
    if (!password) errors.password = "Password is required.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      setSignupLoading(false);
      setHasSubmitted(false);
      return;
    }

    setSignupErrors({});

    try {
      await axios.post("/register", {
        username,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      setSuccess(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => Inertia.visit("/profile/edit"), 3000);
    } catch (err: any) {
      const backendErrors = err.response?.data?.errors || {};
      setSignupErrors(backendErrors);
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

  if (success) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-2xl p-6 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🎉 Account Created! 🎉</h2>
          <p className="text-gray-700 mb-4">Your account has been created successfully.</p>
          <button
            onClick={() => Inertia.visit("/profile/edit")}
            className="px-4 py-2 bg-[#C6A75E] hover:bg-[#b89148] text-white font-semibold rounded-2xl text-lg transition-all duration-300"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4 w-full max-w-2xl mx-auto px-4">

      {/* Social Login */}
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

      {/* Username */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          placeholder="Your username"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.username && <p className="text-red-500 text-sm mt-1">{signupErrors.username}</p>}
        {usernameSuggestions.length > 0 && <p className="text-gray-500 text-sm mt-1">Suggestions: {usernameSuggestions.join(", ")}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.email && <p className="text-red-500 text-sm mt-1">{signupErrors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.password && <p className="text-red-500 text-sm mt-1">{signupErrors.password}</p>}
        {password && <p className={`mt-1 font-semibold ${passwordStrength.color} text-sm`}>Password Strength: {passwordStrength.label}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-gray-700 mb-1 font-medium text-sm">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C6A75E] text-base"
        />
        {signupErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{signupErrors.confirmPassword}</p>}
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
