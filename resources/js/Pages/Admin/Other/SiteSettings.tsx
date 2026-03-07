import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Save } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type SiteSettings = {
  site_name: string;
  support_email: string;
  contact_phone: string;
  business_address: string;
  logo_path: string;
  favicon_path: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  maintenance_mode: boolean;
};

type Props = {
  siteSettings: SiteSettings;
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

export default function SiteSettingsPage({ siteSettings }: Props) {
  const [form, setForm] = React.useState<SiteSettings>(siteSettings);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [faviconFile, setFaviconFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const logoPreview = React.useMemo(() => {
    if (!logoFile) return form.logo_url || null;
    return URL.createObjectURL(logoFile);
  }, [logoFile, form.logo_url]);

  const faviconPreview = React.useMemo(() => {
    if (!faviconFile) return form.favicon_url || null;
    return URL.createObjectURL(faviconFile);
  }, [faviconFile, form.favicon_url]);

  React.useEffect(() => {
    return () => {
      if (logoFile) URL.revokeObjectURL(logoPreview || "");
      if (faviconFile) URL.revokeObjectURL(faviconPreview || "");
    };
  }, [logoFile, faviconFile, logoPreview, faviconPreview]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("site_name", form.site_name);
      payload.append("support_email", form.support_email || "");
      payload.append("contact_phone", form.contact_phone || "");
      payload.append("business_address", form.business_address || "");
      payload.append("maintenance_mode", form.maintenance_mode ? "1" : "0");
      if (logoFile) payload.append("logo", logoFile);
      if (faviconFile) payload.append("favicon", faviconFile);

      const response = await fetch("/admin/other/site-settings", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: payload,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save site settings.");
      }

      if (data.site_settings) {
        setForm(data.site_settings as SiteSettings);
      }
      setLogoFile(null);
      setFaviconFile(null);
      setMessage(data.message || "Site settings saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save site settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Site Settings" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / SITE SETTINGS</p>
                <h1 className="mt-1 text-2xl font-bold">Site Settings</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">Manage global storefront contact details and brand assets.</p>
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
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Site name</span>
                <input
                  type="text"
                  value={form.site_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, site_name: event.target.value }))}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Support email</span>
                <input
                  type="email"
                  value={form.support_email}
                  onChange={(event) => setForm((prev) => ({ ...prev, support_email: event.target.value }))}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Contact phone number</span>
                <input
                  type="text"
                  value={form.contact_phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Business address</span>
                <textarea
                  value={form.business_address}
                  onChange={(event) => setForm((prev) => ({ ...prev, business_address: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Logo upload</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
                {logoPreview ? (
                  <img loading="lazy" decoding="async" src={logoPreview} alt="Site logo preview" className="mt-2 h-14 w-auto rounded border border-[#E7D7B2] bg-white p-1" />
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Favicon upload</span>
                <input
                  type="file"
                  accept=".ico,.png,.svg"
                  onChange={(event) => setFaviconFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
                {faviconPreview ? (
                  <img loading="lazy" decoding="async" src={faviconPreview} alt="Favicon preview" className="mt-2 h-10 w-10 rounded border border-[#E7D7B2] bg-white p-1" />
                ) : null}
              </label>
            </div>

            <label className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6B5A34]">
              <input
                type="checkbox"
                checked={form.maintenance_mode}
                onChange={(event) => setForm((prev) => ({ ...prev, maintenance_mode: event.target.checked }))}
                className="h-4 w-4 rounded border-[#CFAF67]"
              />
              Maintenance mode
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8D8B5] pt-4">
              <p className="text-sm text-[#6B5A34]">Changes are persisted immediately to database settings.</p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Site Settings"}
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
