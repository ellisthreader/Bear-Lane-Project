"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
  variant?: "drilldown" | "accordion";
  showHeading?: boolean;
}

const toKidsAgeHref = (sizes: string[]) => {
  const params = new URLSearchParams();
  sizes.forEach((size) => params.append("size", size));
  return `/category/kids?${params.toString()}`;
};

const KIDS_AGE_QUICK_LINKS = [
  {
    label: "JUNIOR (12-15 years)",
    href: toKidsAgeHref(["12-13 YEARS", "13-14 YEARS", "14-15 YEARS"]),
  },
  {
    label: "KIDS (4-12 years)",
    href: toKidsAgeHref([
      "4-5 YEARS",
      "5-6 YEARS",
      "6-7 YEARS",
      "7-8 YEARS",
      "8-9 YEARS",
      "9-10 YEARS",
      "10-11 YEARS",
      "11-12 YEARS",
    ]),
  },
  {
    label: "TODDLERS (12 months-4 years)",
    href: toKidsAgeHref(["12-18 MONTHS", "18-24 MONTHS", "2-3 YEARS (2T-3T)", "3-4 YEARS (3T-4T)"]),
  },
  {
    label: "BABIES (0-24 months)",
    href: toKidsAgeHref([
      "NEWBORN (0-1 MONTH)",
      "0-3 MONTHS",
      "3-6 MONTHS",
      "6-9 MONTHS",
      "9-12 MONTHS",
      "12-18 MONTHS",
      "18-24 MONTHS",
    ]),
  },
] as const;

export default function KidsSidebar({ closeSidebar, variant, showHeading }: Props) {
  return (
    <GenericCategorySidebar
      rootKey="kids"
      title="Kids"
      closeSidebar={closeSidebar}
      variant={variant}
      showHeading={showHeading}
      quickLinks={KIDS_AGE_QUICK_LINKS.map((item) => ({ label: item.label, href: item.href }))}
      hideRootCategoriesWhenQuickLinks
    />
  );
}
