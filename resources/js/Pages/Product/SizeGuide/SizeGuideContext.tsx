import React, { createContext, useContext, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { SIZE_GUIDE_DATA } from "./sizeGuideData";
import type { GenderKey, GenderSizeGuide } from "./types";

type SizeGuideContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  gender: GenderKey;
};

const SizeGuideContext = createContext<SizeGuideContextValue | undefined>(undefined);

export function SizeGuideProvider({ initialGender, children }: { initialGender: GenderKey; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<SizeGuideContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      gender: initialGender,
    }),
    [initialGender, isOpen]
  );

  return <SizeGuideContext.Provider value={value}>{children}</SizeGuideContext.Provider>;
}

export function useSizeGuide() {
  const ctx = useContext(SizeGuideContext);
  if (!ctx) {
    throw new Error("useSizeGuide must be used inside SizeGuideProvider");
  }
  return ctx;
}

export function useSizeGuideData() {
  const { gender } = useSizeGuide();
  const page = usePage<{
    storeSettings?: {
      size_guide?: Record<
        GenderKey,
        {
          heading?: string;
          subtitle?: string;
          rows?: Array<{
            size?: string;
            chest?: string;
            length?: string;
            sleeve?: string;
          }>;
        }
      >;
    };
  }>();

  const dynamic = page.props.storeSettings?.size_guide?.[gender];
  const hasRows = Array.isArray(dynamic?.rows) && (dynamic?.rows?.length ?? 0) > 0;

  if (!dynamic || !hasRows) {
    return SIZE_GUIDE_DATA[gender];
  }

  const rows = (dynamic.rows || []).map((row) => [
    row.size || "",
    row.chest || "",
    row.length || "",
    row.sleeve || "",
  ]);

  const normalized: GenderSizeGuide = {
    heading: dynamic.heading || SIZE_GUIDE_DATA[gender].heading,
    subtitle: dynamic.subtitle || SIZE_GUIDE_DATA[gender].subtitle,
    sections: [
      {
        kind: "table",
        id: "tops",
        title: dynamic.heading || SIZE_GUIDE_DATA[gender].heading,
        columns: ["Size", "Chest CM", "Waist CM", "Arm Length CM"],
        rows,
      },
    ],
  };

  return normalized;
}
