import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Save } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type PricingTier = {
  text_price: number;
  clipart_price: number;
  image_price: number;
  per_side_price: number;
};

type Props = {
  pricing: {
    printing: PricingTier;
  };
};

type FormState = Props["pricing"];

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const fieldMeta: Array<{ key: keyof PricingTier; label: string }> = [
  { key: "text_price", label: "Text price (£)" },
  { key: "clipart_price", label: "Clipart price (£)" },
  { key: "image_price", label: "Image price (£)" },
  { key: "per_side_price", label: "Per-side design price (£)" },
];

export default function Prices({ pricing }: Props) {
  const [form, setForm] = React.useState<FormState>(pricing);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const setTierValue = (tier: keyof FormState, key: keyof PricingTier, value: string) => {
    const parsed = Number(value);
    setForm((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [key]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/admin/other/prices", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to save pricing.");
      }

      if (payload.pricing) {
        setForm(payload.pricing as FormState);
      }
      setMessage(payload.message || "Pricing saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save pricing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Pricing" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / PRICES</p>
                <h1 className="mt-1 text-2xl font-bold">Design Pricing Rules</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">Configure how text, clipart, image, and per-side surcharges are calculated.</p>
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

          <form onSubmit={handleSave} className="grid grid-cols-1 gap-5">
            {(["printing"] as const).map((tier) => (
              <div key={tier} className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold capitalize">{tier}</h2>
                <div className="mt-4 space-y-3">
                  {fieldMeta.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">{field.label}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form[tier][field.key]}
                        onChange={(event) => setTierValue(tier, field.key, event.target.value)}
                        className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-[#E4D2AA] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[#6B5A34]">These values are applied in the design editor and pricing previews.</div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Prices"}
                </button>
              </div>
              {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
