import React, { useState } from "react";
import axios from "axios";
import { useProfile } from "@/Context/ProfileContext";
import PasswordUpdate from "./PasswordUpdate";
import { toast } from "react-toastify";

interface Props {}

export default function ProfileFields({}: Props) {
  const { user, setUser } = useProfile();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [email, setEmail] = useState(user?.email || "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailConfirm, setEmailConfirm] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");

  const notify = (type: "success" | "error", message: string) =>
    toast[type](message, { position: "top-center", autoClose: 3000 });

  const updateField = async (field: string, value: any) => {
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
      const res = await axios.post("/profile/update", formData, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (res.data?.user) {
        setUser((prev) => ({
          ...prev,
          ...res.data.user,
          avatar_url: res.data.user.avatar_url || prev?.avatar_url,
        }));

        notify("success", ` ${field.charAt(0).toUpperCase() + field.slice(1)} updated`);

        if (field === "username") {
          setUsernameError(null);
          setUsernameSuggestions([]);
        }
        if (field === "email") {
          setEmailError(null);
          setEmailConfirm(false);
        }
      }
    } catch (err: any) {
      let message = " Failed to update field.";

      if (err.response?.status === 422) {
        const errors = err.response.data.errors;

        if (errors?.username) {
          message = ` ${errors.username[0]}`;
          setUsernameError(errors.username[0]);
          setUsernameSuggestions(err.response.data.suggestions || []);
        }

        if (errors?.email) {
          message = ` ${errors.email[0]}`;
          setEmailError(errors.email[0]);
        }
      }

      notify("error", message);
    }
  };

  return (
    <>
      {/* --- Full Name --- */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 mb-1">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          maxLength={25}
          onChange={(e) =>
            setName(e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 25))
          }
          onBlur={() => updateField("name", name)}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {/* --- Username --- */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 mb-1">
          Username
        </label>
        <input
          type="text"
          value={username}
          maxLength={25}
          onChange={(e) =>
            setUsername(e.target.value.replace(/[^\w]/g, "").slice(0, 25))
          }
          onBlur={() => updateField("username", username)}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100"
        />
        {usernameError && (
          <p className="text-red-600 mt-1 text-sm">{usernameError}</p>
        )}
        {usernameSuggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
              Try one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {usernameSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setUsername(s);
                    setUsernameSuggestions([]);
                    updateField("username", s);
                  }}
                  className="px-2 py-1 border rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Email --- */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          maxLength={254}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailConfirm(false);
            setEmailError(null);
          }}
          onBlur={() => updateField("email", email.trim())}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100"
        />
        {emailError && (
          <p className="text-red-600 mt-1 text-sm">{emailError}</p>
        )}
      </div>

      {/* --- Password --- */}
      <PasswordUpdate updateField={updateField} />

      {/* --- Phone --- */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={phone}
          maxLength={15}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))
          }
          onBlur={() => updateField("phone", phone)}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {/* --- Bio --- */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 mb-1">
          Bio / About Me
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          onBlur={() => updateField("bio", bio)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100"
        />
        <p className="text-gray-500 text-sm mt-1">{bio.length}/500</p>
      </div>
    </>
  );
}
