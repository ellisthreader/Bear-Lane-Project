"use client";

import React, { createContext, useContext } from "react";

type SidebarTab = "product" | "upload" | "text" | "clipart";

type DesignPageContextValue = {
  isPricePanelOpen: boolean;
  activeSidebar: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onSelectTab: (tab: SidebarTab) => void;
  headerTitle: string;
  sidebarContent: React.ReactNode;
  canvas: React.ReactNode;
  preview: React.ReactNode;
  pricePanel: React.ReactNode;
  pricePanelRef?: React.RefObject<HTMLDivElement>;
};

const DesignPageContext = createContext<DesignPageContextValue | null>(null);

export function DesignPageProvider({
  value,
  children,
}: {
  value: DesignPageContextValue;
  children: React.ReactNode;
}) {
  return <DesignPageContext.Provider value={value}>{children}</DesignPageContext.Provider>;
}

export function useDesignPageContext() {
  const context = useContext(DesignPageContext);
  if (!context) throw new Error("useDesignPageContext must be used within DesignPageProvider");
  return context;
}

