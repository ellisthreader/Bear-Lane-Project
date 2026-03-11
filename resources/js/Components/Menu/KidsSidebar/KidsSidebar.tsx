"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
  variant?: "drilldown" | "accordion";
  showHeading?: boolean;
}

export default function KidsSidebar({ closeSidebar, variant, showHeading }: Props) {
  return (
    <GenericCategorySidebar
      rootKey="kids"
      title="Kids"
      closeSidebar={closeSidebar}
      variant={variant}
      showHeading={showHeading}
    />
  );
}
