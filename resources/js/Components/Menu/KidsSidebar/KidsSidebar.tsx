"use client";

import GenericCategorySidebar from "@/Components/Menu/GenericCategorySidebar";

interface Props {
  closeSidebar: () => void;
}

export default function KidsSidebar({ closeSidebar }: Props) {
  return <GenericCategorySidebar rootKey="kids" title="Kids" closeSidebar={closeSidebar} />;
}
