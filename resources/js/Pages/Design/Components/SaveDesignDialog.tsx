"use client";

import React from "react";

type SaveMode = "new" | "overwrite";

type Props = {
  open: boolean;
  isSavingDesign: boolean;
  pendingDesignName: string;
  maxDesignNameLength: number;
  saveDialogError: string | null;
  savedDesignCount: number;
  maxSavedDesigns: number;
  currentSavedDesignId: number | null;
  saveMode: SaveMode;
  onPendingDesignNameChange: (value: string) => void;
  onSaveModeChange: (mode: SaveMode) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function SaveDesignDialog({
  open,
  isSavingDesign,
  pendingDesignName,
  maxDesignNameLength,
  saveDialogError,
  savedDesignCount,
  maxSavedDesigns,
  currentSavedDesignId,
  saveMode,
  onPendingDesignNameChange,
  onSaveModeChange,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  const hasReachedDesignLimit = savedDesignCount >= maxSavedDesigns;

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#C6A75E]/30 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#F8F3E6] via-[#FCFAF2] to-white px-7 py-5 border-b border-[#C6A75E]/20">
          <h3 className="text-2xl font-semibold tracking-tight text-gray-900">Save Design</h3>
          <p className="mt-1 text-sm text-gray-600">
            Give your design a clear name so it is easy to find later.
          </p>
        </div>

        <div className="px-7 py-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            Design Title
          </label>
          <div className="relative">
            <input
              type="text"
              value={pendingDesignName}
              maxLength={maxDesignNameLength}
              onChange={e => {
                onPendingDesignNameChange(e.target.value.slice(0, maxDesignNameLength));
              }}
              placeholder="My design name"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition focus:border-[#C6A75E] focus:ring-4 focus:ring-[#C6A75E]/20 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
              {pendingDesignName.length}/{maxDesignNameLength}
            </span>
          </div>

          {saveDialogError && <p className="mt-2 text-sm text-red-600">{saveDialogError}</p>}
          {hasReachedDesignLimit && (
            <p className="mt-2 text-sm text-amber-700">
              You have reached the {maxSavedDesigns}-design limit. Delete a design to save a new
              one.
            </p>
          )}

          {currentSavedDesignId && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                Saving Options
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSaveModeChange("overwrite")}
                  className={`rounded-xl px-3 py-2 text-sm border transition ${
                    saveMode === "overwrite"
                      ? "border-[#C6A75E] bg-[#C6A75E]/20 text-[#8A6D2B] shadow-sm"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  Overwrite Current
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hasReachedDesignLimit) return;
                    onSaveModeChange("new");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm border transition ${
                    saveMode === "new"
                      ? "border-[#C6A75E] bg-[#C6A75E]/20 text-[#8A6D2B] shadow-sm"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                  disabled={hasReachedDesignLimit}
                >
                  Save as New
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isSavingDesign) return;
                onClose();
              }}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 transition hover:bg-gray-50"
              disabled={isSavingDesign}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-xl bg-[#C6A75E] px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#B8994E] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingDesign || (saveMode === "new" && hasReachedDesignLimit)}
            >
              {isSavingDesign ? "Saving..." : "Save Design"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
