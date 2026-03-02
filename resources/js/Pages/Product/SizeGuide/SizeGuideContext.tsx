import React, { createContext, useContext, useMemo, useState } from "react";
import { SIZE_GUIDE_DATA } from "./sizeGuideData";
import type { GenderKey } from "./types";

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
  return SIZE_GUIDE_DATA[gender];
}
