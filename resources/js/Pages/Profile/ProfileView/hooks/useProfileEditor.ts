import { router } from "@inertiajs/react";
import { useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { showCheckoutError, showCheckoutSuccess } from "../../../CheckoutPage/checkoutToasts";
import type { AuthUser } from "../types";

export function useProfileEditor(user: AuthUser | null) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const openEditModal = () => {
    if (!user) return;
    setEditName(user.name || "");
    setEditUsername(user.username || "");
    setEditPhone(user.phone || "");
    setFieldErrors({});
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    if (user) {
      setEditName(user.name || "");
      setEditUsername(user.username || "");
      setEditPhone(user.phone || "");
    }
    setFieldErrors({});
    setEditError(null);
    setShowEditModal(false);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!editName.trim()) nextErrors.name = "Please enter your name.";
    if (!editUsername.trim()) nextErrors.username = "Please enter your username.";
    if (editPhone.trim() && !isValidPhoneNumber(editPhone)) {
      nextErrors.phone = "Please enter a valid phone number.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setEditError("Please fix the highlighted fields.");
      showCheckoutError("Please fix the highlighted fields.");
      return;
    }

    setSavingProfile(true);
    setEditError(null);

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("username", editUsername);
    formData.append("phone", editPhone);

    router.post("/profile/update", formData, {
      preserveScroll: true,
      onSuccess: () => {
        setShowEditModal(false);
        setFieldErrors({});
        showCheckoutSuccess("Profile updated successfully.");
      },
      onError: (errors) => {
        const incoming = errors as Record<string, string>;
        setFieldErrors({
          name: incoming.name || "",
          username: incoming.username || "",
          phone: incoming.phone || "",
        });
        setEditError(incoming.name || incoming.username || incoming.phone || "Unable to save profile changes right now.");
        showCheckoutError("Unable to save profile changes right now.");
      },
      onFinish: () => setSavingProfile(false),
    });
  };

  return {
    showEditModal,
    setShowEditModal,
    editName,
    setEditName,
    editUsername,
    setEditUsername,
    editPhone,
    setEditPhone,
    fieldErrors,
    editError,
    savingProfile,
    openEditModal,
    handleEditCancel,
    handleProfileSave,
  };
}
