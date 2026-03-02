"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
}

export default function MenSidebar({ closeSidebar }: Props) {
  return <GenericCategorySidebar rootKey="men" title="Men" closeSidebar={closeSidebar} />;
}
