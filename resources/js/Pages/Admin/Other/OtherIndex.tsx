import React, { useMemo } from "react";
import { Link } from "@inertiajs/react";
import {
  BellRing,
  ChevronRight,
  CircleDollarSign,
  LayoutPanelTop,
  Palette,
  Percent,
  Ruler,
  Settings2,
  Shirt,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { AdminPage, SectionLabel } from "@/Components/Admin/ui";

type OtherSection = {
  title: string;
  description: string;
  href: string;
  group?: string;
};

type Props = {
  sections: OtherSection[];
};

const GROUP_ORDER = ["Storefront", "Products & Delivery", "Pricing", "Store"];

function sectionIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes("homepage") || key.includes("front")) return <LayoutPanelTop className="h-5 w-5" />;
  if (key.includes("personalise")) return <Shirt className="h-5 w-5" />;
  if (key.includes("delivery")) return <Truck className="h-5 w-5" />;
  if (key.includes("measurement") || key.includes("size")) return <Ruler className="h-5 w-5" />;
  if (key.includes("price")) return <CircleDollarSign className="h-5 w-5" />;
  if (key.includes("discount")) return <Percent className="h-5 w-5" />;
  if (key.includes("design")) return <Palette className="h-5 w-5" />;
  if (key.includes("tax")) return <SlidersHorizontal className="h-5 w-5" />;
  if (key.includes("notification")) return <BellRing className="h-5 w-5" />;
  if (key.includes("site")) return <Settings2 className="h-5 w-5" />;
  return <Settings2 className="h-5 w-5" />;
}

export default function OtherIndex({ sections }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, OtherSection[]>();
    sections.forEach((section) => {
      const group = section.group || "Store";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(section);
    });
    const ordered = GROUP_ORDER.filter((g) => map.has(g));
    map.forEach((_, key) => {
      if (!ordered.includes(key)) ordered.push(key);
    });
    return ordered.map((name) => ({ name, sections: map.get(name)! }));
  }, [sections]);

  return (
    <AdminPage
      eyebrow="Admin Console"
      title="Other"
      headTitle="Admin Other"
      description="Global store controls: storefront content, delivery, measurements, pricing and site configuration."
    >
      {groups.map((group) => (
        <section key={group.name} className="space-y-3">
          <SectionLabel>{group.name}</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-2xl border border-[#EBE2CF] bg-white p-5 shadow-[0_1px_2px_rgba(63,47,17,0.04),0_12px_32px_-18px_rgba(63,47,17,0.25)] transition hover:-translate-y-0.5 hover:border-[#C6A75E]"
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
        </section>
      ))}
    </AdminPage>
  );
}
