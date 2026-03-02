"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
}

export default function WomenSidebar({ closeSidebar }: Props) {
  return <GenericCategorySidebar rootKey="women" title="Women" closeSidebar={closeSidebar} />;
}
