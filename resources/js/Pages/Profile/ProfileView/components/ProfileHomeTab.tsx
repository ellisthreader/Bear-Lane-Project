import React from "react";
import { useProfileViewContext } from "../ProfileViewContext";
import AddressBookSection from "./AddressBookSection";
import PaymentMethodsSection from "./PaymentMethodsSection";
import ProductRecommendations from "./ProductRecommendations";

const getProviderLabel = (provider?: string | null) => {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "google") return "Google";
  if (normalized === "facebook") return "Facebook";
  if (normalized === "apple") return "Apple";
  return "Google";
};

export default function ProfileHomeTab() {
  const {
    user,
    avatarSrc,
    openEditModal,
    uploadInputRef,
    handleAvatarUpload,
    handleGenerateAvatar,
    avatarBusy,
    avatarActionError,
    secondsLeft,
    cooldownLabel,
  } = useProfileViewContext();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E2D2A8] bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-[#9E8A62]">Profile</p>
        <h1 className="mt-2 text-3xl font-bold text-[#251E11] md:text-4xl">Welcome back, {user.username}</h1>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#E7D8B4] bg-gradient-to-br from-[#FFFEFA] to-[#FDF3DE] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EADBBC] px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9C8450]">Account Overview</p>
            <button
              onClick={openEditModal}
              type="button"
              className="rounded-lg border border-[#D7BE84] px-3 py-1.5 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF9EA]"
            >
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[340px_1fr]">
            <div>
              <div className="flex flex-col items-center">
                <img src={avatarSrc} alt="Profile" className="h-28 w-28 rounded-full object-cover ring-4 ring-[#F3E7C8] ring-offset-4 ring-offset-[#FFFDF7]" />
                <p className="mt-4 text-lg font-semibold text-[#2A2314]">{user.name}</p>
                <p className="text-sm text-[#8A7652]">@{user.username}</p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-xl border border-[#D9C18B] bg-white px-4 py-2.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8]"
                  disabled={avatarBusy}
                >
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  className="rounded-xl border border-[#D9C18B] bg-white px-4 py-2.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8] sm:col-span-2 lg:col-span-1"
                  disabled={avatarBusy || secondsLeft > 0}
                >
                  {avatarBusy ? "Please wait..." : cooldownLabel}
                </button>
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)}
              />
              {avatarActionError && <p className="mt-3 text-xs text-red-600">{avatarActionError}</p>}
            </div>

            <div>
              <div className="divide-y divide-[#E9D9B7] rounded-2xl border border-[#E7D8B4]/80 bg-[#FFFDF8]">
                <div className="grid grid-cols-[130px_1fr] px-4 py-3 text-sm">
                  <p className="font-medium text-[#8C7D5D]">Name</p>
                  <p className="font-semibold text-[#2A2314]">{user.name}</p>
                </div>
                <div className="grid grid-cols-[130px_1fr] px-4 py-3 text-sm">
                  <p className="font-medium text-[#8C7D5D]">Username</p>
                  <p className="font-semibold text-[#2A2314]">@{user.username}</p>
                </div>
                <div className="grid grid-cols-[130px_1fr] px-4 py-3 text-sm">
                  <p className="font-medium text-[#8C7D5D]">Email</p>
                  <p className="font-semibold text-[#2A2314] break-all">{user.email}</p>
                </div>
                <div className="grid grid-cols-[130px_1fr] px-4 py-3 text-sm">
                  <p className="font-medium text-[#8C7D5D]">Password</p>
                  <p className="font-semibold text-[#2A2314]">
                    {user.is_oauth
                      ? `Handled by ${getProviderLabel(user.oauth_provider)}`
                      : "••••••••"}
                  </p>
                </div>
                <div className="grid grid-cols-[130px_1fr] px-4 py-3 text-sm">
                  <p className="font-medium text-[#8C7D5D]">Phone</p>
                  <p className="font-semibold text-[#2A2314]">{user.phone || "Not set"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AddressBookSection />
        <PaymentMethodsSection />
      </div>

      <ProductRecommendations />
    </div>
  );
}
