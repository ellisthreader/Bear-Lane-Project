import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ChevronRight, CircleDollarSign, Percent, Ruler, Settings2, SlidersHorizontal } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type OtherSection = {
  title: string;
  description: string;
  href: string;
};

type Props = {
  sections: OtherSection[];
};

function sectionIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes("price")) return <CircleDollarSign className="h-5 w-5" />;
  if (key.includes("discount")) return <Percent className="h-5 w-5" />;
  if (key.includes("site")) return <Settings2 className="h-5 w-5" />;
  if (key.includes("tax")) return <SlidersHorizontal className="h-5 w-5" />;
  if (key.includes("size")) return <Ruler className="h-5 w-5" />;
  return <Settings2 className="h-5 w-5" />;
}

export default function OtherIndex({ sections }: Props) {
  return (
    <AuthenticatedLayout>
      <Head title="Admin Other" />
      <AdminTopNav />

      <div className="min-h-screen bg-gradient-to-br from-[#F9F5EA] via-[#FCF8EE] to-[#F4ECDD] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white/95 p-6 shadow-[0_18px_46px_rgba(91,70,27,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Admin Console</p>
            <h1 className="mt-1 text-3xl font-bold">OTHER</h1>
            <p className="mt-2 text-sm text-[#6B5A34]">
              Global store controls for pricing, tax, discounts, and storefront configuration.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-2xl border border-[#E4D2AA] bg-white/95 p-5 shadow-[0_10px_30px_rgba(91,70,27,0.08)] transition hover:-translate-y-0.5 hover:border-[#D4B56E]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2CCA1] bg-[#FFF8E7] text-[#8A6D2B]">
                    {sectionIcon(section.title)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A6D2B] transition group-hover:translate-x-1" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#2D2515]">{section.title}</h2>
                <p className="mt-1 text-sm text-[#6B5A34]">{section.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
