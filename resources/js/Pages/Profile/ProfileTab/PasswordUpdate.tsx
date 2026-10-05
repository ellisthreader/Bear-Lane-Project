import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react"; // Lightweight icons for the eye toggle

export default function PasswordUpdate() {
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // States to control visibility for each field
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordUpdate = async () => {
    setPasswordLoading(true);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage("❌ Passwords do not match.");
      setPasswordLoading(false);
      return;
    }

    try {
      await axios.put("/user/password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordMessage("Password updated successfully!");
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        if (errors.current_password) {
          setPasswordMessage("❌ Current password is incorrect.");
        } else {
          setPasswordMessage(
            "❌ Failed to update password. Please check your details."
          );
        }
      } else {
        setPasswordMessage("❌ Failed to update password. Please try again.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderPasswordInput = (
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    show: boolean,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    placeholder: string
  ) => (
    <div className="relative w-full">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  return (
    <div>
      <label className="block text-gray-700 dark:text-gray-200 mb-1">
        Password
      </label>
      {!editingPassword ? (
        <div className="flex items-center justify-between w-full border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-gray-100">
          <span>********</span>
          <button
            type="button"
            onClick={() => setEditingPassword(true)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {renderPasswordInput(
            currentPassword,
            setCurrentPassword,
            showCurrent,
            setShowCurrent,
            "Current Password"
          )}
          {renderPasswordInput(
            newPassword,
            setNewPassword,
            showNew,
            setShowNew,
            "New Password"
          )}
          {renderPasswordInput(
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            setShowConfirm,
            "Confirm New Password"
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingPassword(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={passwordLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {passwordLoading ? "Saving..." : "Save"}
            </button>
          </div>
          {passwordMessage && (
            <p className="text-sm mt-1 text-green-600 dark:text-green-400">
              {passwordMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
