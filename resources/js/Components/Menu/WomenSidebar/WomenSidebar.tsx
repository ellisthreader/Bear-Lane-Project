"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
  variant?: "drilldown" | "accordion";
  showHeading?: boolean;
}

export default function WomenSidebar({ closeSidebar, variant, showHeading }: Props) {
  return (
    <GenericCategorySidebar
      rootKey="women"
      title="Women"
      closeSidebar={closeSidebar}
      variant={variant}
      showHeading={showHeading}
    />
  );
}
