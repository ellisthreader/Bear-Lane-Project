import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import ColorsPanel from "./WebsiteDesign/ColorsPanel";
import FontsPanel from "./WebsiteDesign/FontsPanel";
import ImagesPanel from "./WebsiteDesign/ImagesPanel";
import LivePreview from "./WebsiteDesign/LivePreview";
import { useDesignEditor } from "./WebsiteDesign/useDesignEditor";
import type { DesignDefaults, ServerDesign } from "./WebsiteDesign/types";

type Props = {
  design: ServerDesign;
  defaults: DesignDefaults;
  maxHeroSlides: number;
};

export default function WebsiteDesignPage({ design, defaults, maxHeroSlides }: Props) {
  const editor = useDesignEditor(design, defaults, maxHeroSlides);

  React.useEffect(() => {
    if (!editor.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editor.isDirty]);

  return (
    <AuthenticatedLayout>
      <Head title="Admin Website Design" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-[1500px] space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / WEBSITE DESIGN</p>
                <h1 className="mt-1 text-2xl font-bold">Website Design</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">
                  Change the storefront's colours, fonts and imagery. Edits show instantly in the preview and go live for customers when you save.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/other"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-4 py-2 text-sm font-semibold text-[#7D6228] hover:border-[#C29A4F]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
                <button
                  type="button"
                  onClick={editor.resetToDefaults}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-4 py-2 text-sm font-semibold text-[#7D6228] hover:border-[#C29A4F]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to defaults
                </button>
                <button
                  type="button"
                  onClick={editor.save}
                  disabled={editor.saving || !editor.isDirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editor.saving ? "Saving..." : "Save & publish"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex min-h-[1.25rem] flex-wrap items-center gap-3 text-sm">
              {editor.isDirty ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes — only visible in the preview until you save
                </span>
              ) : null}
              {editor.message ? <p className="text-emerald-700">{editor.message}</p> : null}
              {editor.error ? <p className="text-red-600">{editor.error}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="space-y-5">
              <ColorsPanel colors={editor.draft.colors} onChange={editor.setColor} onApplyPreset={editor.setColors} />
              <FontsPanel fonts={editor.draft.fonts} onChange={editor.setFont} />
              <ImagesPanel editor={editor} maxHeroSlides={maxHeroSlides} />
            </div>
            <div className="xl:sticky xl:top-4 xl:self-start">
              <LivePreview design={editor.previewDesign} />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
