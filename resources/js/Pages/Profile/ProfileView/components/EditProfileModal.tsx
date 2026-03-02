import React from "react";
import Modal from "@/Components/Modal";
import LuxuryPhoneInput from "@/Components/LuxuryPhoneInput";
import { useProfileViewContext } from "../ProfileViewContext";

export default function EditProfileModal() {
  const {
    showEditModal,
    handleEditCancel,
    handleProfileSave,
    editName,
    setEditName,
    editUsername,
    setEditUsername,
    editPhone,
    setEditPhone,
    fieldErrors,
    editError,
    savingProfile,
  } = useProfileViewContext();

  const getInputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? "checkout-field-error checkout-field-shake border-red-400 ring-red-200 focus:ring-red-200"
        : "border-[#E1D4B5] focus:ring-[#C6A75E]"
    }`;

  return (
    <Modal show={showEditModal} onClose={handleEditCancel} maxWidth="lg">
      <div className="border-b border-[#EEE1C5] px-6 py-4">
        <h3 className="text-xl font-semibold text-[#2A2418]">Edit Profile</h3>
      </div>
      <form onSubmit={handleProfileSave} className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            className={getInputClass("name")}
          />
          {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Username</label>
          <input
            type="text"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            required
            className={getInputClass("username")}
          />
          {fieldErrors.username && <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6B5A34]">Phone</label>
          <LuxuryPhoneInput
            value={editPhone}
            onChange={setEditPhone}
            forceError={Boolean(fieldErrors.phone)}
            variant="modal"
            className={fieldErrors.phone ? "w-full checkout-field-shake" : "w-full"}
          />
          {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
        </div>
        {editError && <p className="text-sm text-red-600">{editError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleEditCancel}
            className="rounded-lg border border-[#D7BE84] px-4 py-2 text-sm font-medium text-[#7B6530] transition hover:bg-[#FFF8E8]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C] disabled:opacity-70"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
