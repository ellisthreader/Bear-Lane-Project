import React, { useState, useEffect, useRef } from "react";
import { usePage, router } from "@inertiajs/react";
import NavMenu from "@/Components/Menu/NavMenu";
import LuxuryPhoneInput from "@/Components/LuxuryPhoneInput";
import axios from "axios";

export default function EditProfilePage() {
  const { auth } = usePage().props as any;
  const user = auth.user;
  const gold = "#C6A75E";

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState(user.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File preview ---
  useEffect(() => {
    if (!profilePic) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(profilePic);
  }, [profilePic]);

  // --- Sync cooldown from server ---
  useEffect(() => {
    const fetchCooldown = async () => {
      try {
        const res = await axios.get("/profile/edit", {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const userData = res.data?.auth?.user;
        if (userData?.cooldown_ends_at) {
          const serverNow = new Date(userData.server_time);
          const cooldownEnd = new Date(userData.cooldown_ends_at);
          setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
        }
      } catch (err) {
        console.error("[EditProfilePage] Failed to fetch cooldown", err);
      }
    };
    fetchCooldown();
  }, []);

  // --- Countdown timer ---
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // --- Submit profile form ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("username", username);
    formData.append("phone", phone);
    if (profilePic) formData.append("profile_photo", profilePic);

    router.post("/profile/update", formData, {
      preserveScroll: true,
      onError: () => setError("Failed to update profile."),
      onFinish: () => setLoading(false),
    });
  };

  // --- Generate random avatar ---
  const handleGenerateRandom = async () => {
    if (generating || secondsLeft > 0) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await axios.post(
        "/profile/generate-avatar",
        {},
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
      );

      const data = res.data;
      if (data?.user) {
        setPreview(data.user.avatar_url);

        const serverNow = new Date(data.user.server_time);
        const cooldownEnd = new Date(data.user.cooldown_ends_at);
        setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
      } else {
        setError("Failed to generate avatar.");
      }
    } catch (err: any) {
      if (err.response?.status === 429 && err.response.data) {
        const serverNow = new Date(err.response.data.server_time);
        const cooldownEnd = new Date(err.response.data.cooldown_ends_at);
        setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
        setError(err.response.data.message || "Cooldown active. Try again later.");
      } else {
        setError("Failed to generate avatar.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = () => router.get("/profile");
  const handlePasswordHelp = () => router.get("/forgot-password");

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-xl font-semibold text-gray-900">
          You are not logged in.
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavMenu />

      <main className="flex-1 px-6 md:px-12 pt-10 pb-20">
        <div className="max-w-2xl mx-auto">

          {/* Breadcrumb */}
          <div className="text-gray-500 text-sm mb-6">
            <span
              className="cursor-pointer hover:underline"
              onClick={() => router.get("/profile")}
            >
              Profile
            </span>{" "}
            &gt; Edit Profile
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Edit Profile
          </h1>

          {/* Avatar + Actions */}
          <div className="flex justify-center mb-14">
            <div className="flex flex-col md:flex-row items-center gap-10">

              {/* Avatar */}
              <div className="w-36 h-36 rounded-full overflow-hidden shadow-md">
                <img
                  src={preview || "/images/default-avatar.png"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl border border-gray-300 font-medium transition hover:bg-gray-50"
                >
                  Upload Image
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  disabled={generating || secondsLeft > 0}
                  className="px-6 py-3 rounded-xl text-white font-medium transition"
                  style={{
                    background: gold,
                    opacity: generating || secondsLeft > 0 ? 0.85 : 1,
                  }}
                >
                  {generating
                    ? "Generating..."
                    : secondsLeft > 0
                    ? `Try again in ${formatTime(secondsLeft)}`
                    : "Generate Random"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files ? setProfilePic(e.target.files[0]) : null
                  }
                />
              </div>

            </div>
          </div>

          {/* Form */}
          <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition"
              required
            />

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C6A75E] transition"
              required
            />

            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 cursor-not-allowed"
            />

            <LuxuryPhoneInput
              value={phone}
              onChange={(value: string) => setPhone(value)}
            />

            {/* Password Help */}
            <div className="text-center">
              <button
                type="button"
                onClick={handlePasswordHelp}
                className="text-sm font-medium underline transition-colors hover:text-black"
                style={{ color: gold }}
              >
                Password Help?
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-white transition"
                style={{
                  background: gold,
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
