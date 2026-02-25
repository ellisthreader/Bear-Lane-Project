// resources/js/Pages/Profile/ProfileTab/index.tsx
import React, { useState, useEffect } from "react";
import { useProfile } from "@/Context/ProfileContext";
import AvatarUpload from "./AvatarUpload";
import ProfileFields from "./ProfileFields";
import { ProfileTabProps } from "../types";

export default function ProfileTab({ flash, backendErrors, updateAvatar }: ProfileTabProps) {
  const { user, setUser } = useProfile();

  // --- Profile field states ---
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [email, setEmail] = useState(user?.email || "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailConfirm, setEmailConfirm] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");

  // --- Notification states (centralized) ---
  const [successMessage, setSuccessMessage] = useState<string | null>(flash?.success || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(backendErrors ? "Please fix the errors below." : null);

  useEffect(() => {
    if (flash?.success) setSuccessMessage(flash.success);
    if (flash?.error) setErrorMessage(flash.error);
  }, [flash]);

  useEffect(() => {
    if (backendErrors && Object.keys(backendErrors).length > 0) {
      setErrorMessage("Please fix the errors below.");
    }
  }, [backendErrors]);

  // --- General field updater ---
  const updateField = async (
    field: string,
    value: any
  ) => {
    setUser((prev) =>
      prev ? { ...prev, [field]: value, avatar_url: prev.avatar_url } : prev
    );

    const formData = new FormData();
    formData.append("name", field === "name" ? value : name);
    formData.append("username", field === "username" ? value : username);
    formData.append("email", field === "email" ? value : email);
    formData.append("phone", field === "phone" ? value : phone);
    formData.append("bio", field === "bio" ? value : bio);

    try {
      const res = await fetch("/profile/update", {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const data = await res.json();

      if (data?.user) {
        setUser((prev) => ({
          ...prev,
          ...data.user,
          avatar_url: data.user.avatar_url || prev?.avatar_url,
        }));

        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        const valueText = field === "password" ? "" : `: ${value}`;
        setSuccessMessage(`Successfully changed ${fieldName}${valueText}`);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 3000);

        if (field === "username") {
          setUsernameError(null);
          setUsernameSuggestions([]);
        }
        if (field === "email") setEmailError(null);
      }
    } catch (err: any) {
      let message = "❌ Failed to update field.";
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        if (errors.username) {
          message = `❌ ${errors.username[0]}`;
          setUsernameSuggestions(err.response.data.suggestions || []);
        }
        if (errors.email) message = `❌ ${errors.email[0]}`;
      }
      setErrorMessage(message);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  return (
    <form className="space-y-5">
      {/* --- Notifications ABOVE avatar --- */}
      {successMessage && (
        <div className="mb-4 px-4 py-2 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* --- Avatar Upload --- */}
      <AvatarUpload
        updateAvatar={updateAvatar}
        setSuccessMessage={setSuccessMessage}
        setErrorMessage={setErrorMessage}
      />

      {/* --- Profile Fields --- */}
      <ProfileFields
        name={name}
        setName={setName}
        username={username}
        setUsername={setUsername}
        usernameError={usernameError}
        usernameSuggestions={usernameSuggestions}
        email={email}
        setEmail={setEmail}
        emailError={emailError}
        emailConfirm={emailConfirm}
        setEmailConfirm={setEmailConfirm}
        phone={phone}
        setPhone={setPhone}
        bio={bio}
        setBio={setBio}
        updateField={updateField}
        setSuccessMessage={setSuccessMessage}
        setErrorMessage={setErrorMessage}
      />
    </form>
  );
}
