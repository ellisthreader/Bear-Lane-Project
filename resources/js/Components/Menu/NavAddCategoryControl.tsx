"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCategoryEditorLock } from "@/Components/Menu/CategoryAdminControls";
import { invalidateCategoryMenu } from "@/Components/Menu/GenericCategorySidebar";

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

type Props = {
  variant?: "desktop" | "mobile";
  onSaved?: () => void | Promise<void>;
};

export default function NavAddCategoryControl({ variant = "desktop", onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useCategoryEditorLock(open);

  const close = () => {
    setOpen(false);
    setName("");
    setError(null);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const canSave = name.trim() !== "" && !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/admin/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ name: name.trim(), parent_id: null }),
      });
      if (!response.ok) throw new Error("Unable to add category.");

      invalidateCategoryMenu();
      close();
      await onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add category.");
    } finally {
      setSaving(false);
    }
  };

  const isMobile = variant === "mobile";

  return (
    <div ref={wrapperRef} className={isMobile ? "relative mt-3" : "relative"}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Add a main category"
        title="Add a main category"
        className={
          isMobile
            ? "inline-flex items-center gap-2 rounded-full border border-[#E0C98A] bg-[#FFF6DF] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#7D5E1A]"
            : "inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D7BE84] bg-[#FFFCF4] text-[#7B6530] transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
        }
      >
        <Plus className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
        {isMobile ? "Add category" : null}
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-64 rounded-2xl border border-[#E6D4AB] bg-[#FFFDF8] p-3 shadow-[0_18px_40px_rgba(68,50,18,0.18)] ${
            isMobile ? "left-0 top-full mt-2" : "left-1/2 top-full mt-3 -translate-x-1/2"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#846B37]">
              New main category
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-[#8A6D2B] transition hover:text-[#D4AF37]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-2 normal-case tracking-normal">
            <p className="text-[11px] text-[#6F5319]">Appears in the main navigation bar.</p>
            <label className="block text-[11px] font-medium text-[#6F5319]">
              Name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Category name"
                className="mt-1 w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5 text-sm text-[#2B2417]"
              />
            </label>

            {error ? <p className="text-[11px] text-[#8C3232]">{error}</p> : null}

            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-lg border border-[#D7BE84] bg-[#FFF6DF] px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#7B6530] transition hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add to navigation"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
