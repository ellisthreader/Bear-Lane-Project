import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type SizeGuideRow = {
  size: string;
  chest: string;
  length: string;
  sleeve: string;
};

type SizeGuideSection = {
  heading: string;
  subtitle: string;
  rows: SizeGuideRow[];
};

type SizeGuideData = {
  men: SizeGuideSection;
  women: SizeGuideSection;
  kids: SizeGuideSection;
};

type Props = {
  sizeGuide: SizeGuideData;
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const sectionTabs: Array<{ key: keyof SizeGuideData; label: string }> = [
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "kids", label: "Kids" },
];

const newRow = (): SizeGuideRow => ({ size: "", chest: "", length: "", sleeve: "" });

export default function SizeGuidePage({ sizeGuide }: Props) {
  const [form, setForm] = React.useState<SizeGuideData>(sizeGuide);
  const [activeSection, setActiveSection] = React.useState<keyof SizeGuideData>("men");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const section = form[activeSection];

  const updateSectionField = (field: keyof Omit<SizeGuideSection, "rows">, value: string) => {
    setForm((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        [field]: value,
      },
    }));
  };

  const updateRowField = (rowIndex: number, key: keyof SizeGuideRow, value: string) => {
    setForm((prev) => {
      const rows = [...prev[activeSection].rows];
      rows[rowIndex] = {
        ...rows[rowIndex],
        [key]: value,
      };

      return {
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          rows,
        },
      };
    });
  };

  const addRow = () => {
    setForm((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        rows: [...prev[activeSection].rows, newRow()],
      },
    }));
  };

  const removeRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        rows: prev[activeSection].rows.filter((_, rowIndex) => rowIndex !== index),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/admin/other/size-guide", {
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
        throw new Error(payload.message || "Unable to save size guide.");
      }

      if (payload.size_guide) {
        setForm(payload.size_guide as SizeGuideData);
      }
      setMessage(payload.message || "Size guide saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save size guide.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Size Guide" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / SIZE GUIDE</p>
                <h1 className="mt-1 text-2xl font-bold">Size Guide Management</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">Edit size tables for men, women, and kids shown on product pages.</p>
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

          <div className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSection(tab.key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    activeSection === tab.key
                      ? "border-[#D1B46F] bg-[#FFF3D6] text-[#6A541F]"
                      : "border-[#E7DBC3] bg-white text-[#6B5A34]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Heading</span>
                <input
                  type="text"
                  value={section.heading}
                  onChange={(event) => updateSectionField("heading", event.target.value)}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#5F4C2A]">Subtitle</span>
                <input
                  type="text"
                  value={section.subtitle}
                  onChange={(event) => updateSectionField("subtitle", event.target.value)}
                  className="w-full rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-[#E8D8B5]">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FBF4E5] text-left text-xs uppercase tracking-[0.1em] text-[#6A5530]">
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Chest CM</th>
                    <th className="px-3 py-2">Waist CM</th>
                    <th className="px-3 py-2">Arm Length CM</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, index) => (
                    <tr key={`${activeSection}-${index}`} className="border-t border-[#F2EBDD]">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(event) => updateRowField(index, "size", event.target.value)}
                          className="w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.chest}
                          onChange={(event) => updateRowField(index, "chest", event.target.value)}
                          className="w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.length}
                          onChange={(event) => updateRowField(index, "length", event.target.value)}
                          className="w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.sleeve}
                          onChange={(event) => updateRowField(index, "sleeve", event.target.value)}
                          className="w-full rounded-lg border border-[#DCC99D] bg-white px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600"
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {section.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#6B5A34]">
                        No rows added yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-4 py-2 text-sm font-semibold text-[#7D6228] hover:border-[#C29A4F]"
              >
                <Plus className="h-4 w-4" />
                Add row
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Size Guide"}
              </button>
            </div>

            {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
