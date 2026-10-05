import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { showCheckoutError, showCheckoutSuccess } from "../../../CheckoutPage/checkoutToasts";
import type { AuthUser } from "../types";

export function useAvatarActions(user: AuthUser | null) {
  const [avatarActionError, setAvatarActionError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const avatarSrc = useMemo(() => {
    if (!user) return "/images/profile.jpg";
    if (user.avatar_url) return user.avatar_url;
    if (user.avatar) return user.avatar.startsWith("http") ? user.avatar : `/storage/${user.avatar}`;
    return "/images/profile.jpg";
  }, [user]);

  const handleAvatarUpload = (file: File | null) => {
    if (!file || !user) return;
    setAvatarBusy(true);
    setAvatarActionError(null);

    const formData = new FormData();
    formData.append("profile_photo", file);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

    fetch("/profile/avatar", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formData,
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          const message =
            payload?.message
            || payload?.errors?.profile_photo?.[0]
            || "Unable to upload avatar right now.";
          setAvatarActionError(message);
          showCheckoutError(message);
          return;
        }
        showCheckoutSuccess("Profile picture updated.");
        router.reload({ preserveScroll: true });
      })
      .catch(() => {
        setAvatarActionError("Unable to upload avatar right now.");
        showCheckoutError("Unable to upload avatar right now.");
      })
      .finally(() => {
        setAvatarBusy(false);
        if (uploadInputRef.current) uploadInputRef.current.value = "";
      });
  };

  const handleGenerateAvatar = async () => {
    if (secondsLeft > 0) return;
    setAvatarBusy(true);
    setAvatarActionError(null);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
      const res = await fetch("/profile/generate-avatar", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        setAvatarActionError(payload?.message || "Failed to generate avatar.");
        showCheckoutError(payload?.message || "Failed to generate avatar.");
        if (payload?.cooldown_ends_at && payload?.server_time) {
          const serverNow = new Date(payload.server_time);
          const cooldownEnd = new Date(payload.cooldown_ends_at);
          setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
        }
        return;
      }

      showCheckoutSuccess("New avatar generated.");
      if (payload?.user?.cooldown_ends_at && payload?.user?.server_time) {
        const serverNow = new Date(payload.user.server_time);
        const cooldownEnd = new Date(payload.user.cooldown_ends_at);
        setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
      }

      router.reload({ preserveScroll: true });
    } catch {
      setAvatarActionError("Failed to generate avatar.");
      showCheckoutError("Failed to generate avatar.");
    } finally {
      setAvatarBusy(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSecondsLeft(0);
      return;
    }

    if (typeof user.remaining_seconds === "number") {
      setSecondsLeft(Math.max(0, user.remaining_seconds));
      return;
    }

    if (user.cooldown_ends_at && user.server_time) {
      const serverNow = new Date(user.server_time);
      const cooldownEnd = new Date(user.cooldown_ends_at);
      setSecondsLeft(Math.max(0, Math.floor((cooldownEnd.getTime() - serverNow.getTime()) / 1000)));
      return;
    }

    setSecondsLeft(0);
  }, [user?.id, user?.remaining_seconds, user?.cooldown_ends_at, user?.server_time]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const cooldownLabel = useMemo(() => {
    if (secondsLeft <= 0) return "Generate Random Avatar";
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `Try again in ${mins}:${String(secs).padStart(2, "0")}`;
  }, [secondsLeft]);

  return {
    avatarSrc,
    uploadInputRef,
    avatarActionError,
    avatarBusy,
    secondsLeft,
    cooldownLabel,
    handleAvatarUpload,
    handleGenerateAvatar,
  };
}
