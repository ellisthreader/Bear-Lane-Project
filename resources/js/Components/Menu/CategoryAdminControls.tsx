"use client";

import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const adminHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-CSRF-TOKEN": getCsrfToken(),
  "X-Requested-With": "XMLHttpRequest",
});

// Lets the nav bar know an inline category editor is open, so the hover panel
// does not close (and lose what is being typed) if the pointer slips out.
let openEditorCount = 0;
export const isCategoryEditorOpen = () => openEditorCount > 0;

// Shared by every inline category editor (sidebar and nav bar alike) so they all
// register against the same counter.
export const useCategoryEditorLock = (open: boolean) => {
  useEffect(() => {
    if (!open) return;
    openEditorCount += 1;
    return () => {
      openEditorCount = Math.max(0, openEditorCount - 1);
    };
  }, [open]);
};

const iconButtonClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D7BE84] bg-[#FFFCF4] text-[#7B6530] transition hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50";

type AddProps = {
  parentId: number | null;
  parentName: string;
  onSaved: () => void | Promise<void>;
};

export function AddCategoryControl({ parentId, parentName, onSaved }: AddProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useCategoryEditorLock(open);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/admin/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: adminHeaders(),
        body: JSON.stringify({ name: trimmed, parent_id: parentId }),
      });
      if (!response.ok) throw new Error("Unable to add category.");
      setName("");
      setOpen(false);
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add category.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="mt-1 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#7B6530] transition hover:text-[#D4AF37]"
        aria-label={`Add category to ${parentName}`}
      >
        <span className={iconButtonClass}>
          <Plus size={14} strokeWidth={2} />
        </span>
        Add to {parentName}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-1 space-y-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setName("");
            }
          }}
          placeholder="Category name"
          className="w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5 text-sm text-[#2B2417]"
        />
        <button type="submit" disabled={saving || name.trim() === ""} className={iconButtonClass} aria-label="Save category">
          <Plus size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
          className={iconButtonClass}
          aria-label="Cancel"
        >
          <Minus size={14} strokeWidth={2} />
        </button>
      </div>
      {error ? <p className="text-[11px] text-[#8C3232]">{error}</p> : null}
    </form>
  );
}

type DeleteProps = {
  categoryId: number;
  name: string;
  onDeleted: () => void | Promise<void>;
};

export function DeleteCategoryControl({ categoryId, name, onDeleted }: DeleteProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (deleting) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/admin/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: adminHeaders(),
      });
      if (!response.ok) throw new Error("Unable to delete category.");
      setConfirming(false);
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className={`${iconButtonClass} ${confirming ? "border-[#C97A7A] bg-[#FFF3F3] text-[#8C3232]" : ""}`}
      aria-label={confirming ? `Confirm removing ${name}` : `Remove ${name}`}
      title={confirming ? "Click again to remove" : `Remove ${name}`}
    >
      <Minus size={14} strokeWidth={2} />
    </button>
  );
}
