import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Save } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type TaxSettings = {
  enabled: boolean;
  rate_percent: number;
  price_mode: "inclusive" | "exclusive";
};

type Props = {
  taxSettings: TaxSettings;
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

export default function TaxSettingsPage({ taxSettings }: Props) {
  const [form, setForm] = React.useState<TaxSettings>(taxSettings);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/admin/other/tax-settings", {
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
        throw new Error(payload.message || "Unable to save tax settings.");
      }

      if (payload.tax_settings) {
        setForm(payload.tax_settings as TaxSettings);
      }
      setMessage(payload.message || "Tax settings saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save tax settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Tax Settings" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / TAX SETTINGS</p>
                <h1 className="mt-1 text-2xl font-bold">Tax Configuration</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">Control VAT/tax rate and whether catalog prices are tax-inclusive or tax-exclusive.</p>
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

          <form onSubmit={handleSave} className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Tax percentage</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.rate_percent}
                  onChange={(event) => setForm((prev) => ({ ...prev, rate_percent: Number(event.target.value) || 0 }))}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Price mode</span>
                <select
                  value={form.price_mode}
                  onChange={(event) => setForm((prev) => ({ ...prev, price_mode: event.target.value as "inclusive" | "exclusive" }))}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                >
                  <option value="exclusive">Tax exclusive</option>
                  <option value="inclusive">Tax inclusive</option>
                </select>
              </label>
            </div>

            <label className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6B5A34]">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-[#CFAF67]"
              />
              Tax enabled
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8D8B5] pt-4">
              <p className="text-sm text-[#6B5A34]">These settings are applied to the checkout totals calculation.</p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Tax Settings"}
              </button>
            </div>

            {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
