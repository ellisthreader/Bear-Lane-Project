import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type DiscountCode = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  expiry_date: string | null;
  usage_limit: number | null;
  times_used: number;
  minimum_order_value: number;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type DiscountCodeForm = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  expiry_date: string;
  usage_limit: string;
  minimum_order_value: number;
  active: boolean;
};

type Props = {
  discountCodes: DiscountCode[];
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const emptyForm: DiscountCodeForm = {
  code: "",
  discount_type: "percent",
  discount_value: 10,
  expiry_date: "",
  usage_limit: "",
  minimum_order_value: 0,
  active: true,
};

const toForm = (item: DiscountCode): DiscountCodeForm => ({
  code: item.code,
  discount_type: item.discount_type,
  discount_value: item.discount_value,
  expiry_date: item.expiry_date || "",
  usage_limit: item.usage_limit ? String(item.usage_limit) : "",
  minimum_order_value: item.minimum_order_value,
  active: item.active,
});

const toPayload = (form: DiscountCodeForm) => ({
  code: form.code.trim().toUpperCase(),
  discount_type: form.discount_type,
  discount_value: form.discount_value,
  expiry_date: form.expiry_date || null,
  usage_limit: form.usage_limit.trim() ? Number(form.usage_limit) : null,
  minimum_order_value: form.minimum_order_value,
  active: form.active,
});

async function requestJson(url: string, options: RequestInit) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCsrfToken(),
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload as any;
}

export default function DiscountCodes({ discountCodes }: Props) {
  const [codes, setCodes] = React.useState<DiscountCode[]>(discountCodes);
  const [createForm, setCreateForm] = React.useState<DiscountCodeForm>(emptyForm);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingForm, setEditingForm] = React.useState<DiscountCodeForm>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const startEditing = (item: DiscountCode) => {
    setEditingId(item.id);
    setEditingForm(toForm(item));
    setError(null);
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingForm(emptyForm);
  };

  const createCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await requestJson("/admin/other/discount-codes", {
        method: "POST",
        body: JSON.stringify(toPayload(createForm)),
      });

      setCodes((prev) => [payload.discount_code as DiscountCode, ...prev]);
      setCreateForm(emptyForm);
      setMessage(payload.message || "Discount code created.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create discount code.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await requestJson(`/admin/other/discount-codes/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(editingForm)),
      });

      const updated = payload.discount_code as DiscountCode;
      setCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId(null);
      setMessage(payload.message || "Discount code updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update discount code.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCode = async (id: number) => {
    const confirmed = window.confirm("Delete this discount code?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await requestJson(`/admin/other/discount-codes/${id}`, {
        method: "DELETE",
      });

      setCodes((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) cancelEditing();
      setMessage(payload.message || "Discount code deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete discount code.");
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = (
    form: DiscountCodeForm,
    setForm: React.Dispatch<React.SetStateAction<DiscountCodeForm>>,
    compact = false,
  ) => (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Code name</span>
        <input
          type="text"
          value={form.code}
          onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
          placeholder="SAVE10"
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Type</span>
        <select
          value={form.discount_type}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, discount_type: event.target.value as "percent" | "fixed" }))
          }
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
        >
          <option value="percent">Percentage</option>
          <option value="fixed">Fixed amount (£)</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Value</span>
        <input
          type="number"
          min={0.01}
          step={form.discount_type === "percent" ? 1 : 0.01}
          value={form.discount_value}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, discount_value: Number(event.target.value) || 0 }))
          }
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Expiry date</span>
        <input
          type="date"
          value={form.expiry_date}
          onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Usage limit</span>
        <input
          type="number"
          min={1}
          step={1}
          value={form.usage_limit}
          onChange={(event) => setForm((prev) => ({ ...prev, usage_limit: event.target.value }))}
          placeholder="Optional"
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5A34]">Minimum order (£)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={form.minimum_order_value}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, minimum_order_value: Number(event.target.value) || 0 }))
          }
          className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} font-medium text-[#6B5A34]`}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          className="h-4 w-4 rounded border-[#CFAF67]"
        />
        Active
      </label>
    </>
  );

  return (
    <AuthenticatedLayout>
      <Head title="Admin Discount Codes" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / DISCOUNT CODES</p>
                <h1 className="mt-1 text-2xl font-bold">Discount Codes</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">Create, edit, and delete active checkout coupon codes.</p>
              </div>
              <Link
                href="/admin/other"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-4 py-2 text-sm font-semibold text-[#7D6228] hover:border-[#C29A4F]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>

          <form onSubmit={createCode} className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Create Discount Code</h2>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B8994E] disabled:opacity-70"
              >
                <Plus className="h-4 w-4" />
                Add code
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">{renderFormFields(createForm, setCreateForm)}</div>
          </form>

          <div className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Existing Codes</h2>
            <div className="mt-4 space-y-3">
              {codes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#DCC99D] p-4 text-sm text-[#6B5A34]">No discount codes created yet.</p>
              ) : (
                codes.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div key={item.id} className="rounded-xl border border-[#E8D8B5] bg-[#FFFDF7] p-4">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">{renderFormFields(editingForm, setEditingForm, true)}</div>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#DCC99D] px-3 py-1.5 text-xs font-semibold text-[#6B5A34]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#8A6D2B] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-[#2D2515]">{item.code}</p>
                            <p className="text-sm text-[#6B5A34]">
                              {item.discount_type === "percent" ? `${item.discount_value}% off` : `£${item.discount_value.toFixed(2)} off`} • Min order £{item.minimum_order_value.toFixed(2)}
                            </p>
                            <p className="text-xs text-[#6B5A34]">
                              Usage: {item.times_used}
                              {item.usage_limit ? ` / ${item.usage_limit}` : " (unlimited)"} • Expires: {item.expiry_date || "No expiry"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                item.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {item.active ? "Active" : "Inactive"}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCC99D] text-[#6B5A34]"
                              aria-label={`Edit ${item.code}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCode(item.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600"
                              aria-label={`Delete ${item.code}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
