"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
  variant?: "drilldown" | "accordion";
  showHeading?: boolean;
}

export default function MenSidebar({ closeSidebar, variant, showHeading }: Props) {
  return (
    <GenericCategorySidebar
      rootKey="men"
      title="Men"
      closeSidebar={closeSidebar}
      variant={variant}
      showHeading={showHeading}
    />
  );
}
