"use client";

import React from "react";
import { Shirt, Upload as UploadIcon, Type, Image as ClipartIcon } from "lucide-react";
import SidebarHeader from "./SidebarHeader";
import { useDesignPageContext } from "../Context/DesignPageContext";

type SidebarTab = "product" | "upload" | "text" | "clipart";

const SIDEBAR_TABS: Array<{ id: SidebarTab; label: string; icon: React.ReactNode }> = [
  { id: "product", icon: <Shirt size={22} />, label: "Product" },
  { id: "upload", icon: <UploadIcon size={22} />, label: "Upload" },
  { id: "text", icon: <Type size={22} />, label: "Text" },
  { id: "clipart", icon: <ClipartIcon size={22} />, label: "Clipart" },
];

export default function DesignSidebars() {
  const {
    activeSidebar,
    canGoBack,
    onBack,
    onClose,
    onSelectTab,
    headerTitle,
    sidebarContent,
  } = useDesignPageContext();

  return (
    <>
      <div
        className="mt-4 mb-6 ml-6 w-[140px] bg-white shadow-lg border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 items-center h-[calc(100vh-160px)] overflow-hidden"
      >
        {SIDEBAR_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`w-full h-16 flex flex-col items-center justify-center rounded-xl border transition ${
              activeSidebar === tab.id
                ? "border-[#C6A75E] bg-[#C6A75E]/15 shadow-sm"
                : "border-gray-200 bg-white hover:border-[#C6A75E]/50 hover:bg-[#C6A75E]/10"
            }`}
          >
            {React.cloneElement(tab.icon as React.ReactElement, {
              className: activeSidebar === tab.id ? "text-[#8A6D2B]" : "text-gray-700",
            })}
            <span
              className={`text-sm ${activeSidebar === tab.id ? "text-[#8A6D2B] font-semibold" : "text-gray-700"}`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div
        className="mt-4 mb-6 ml-4 w-[480px] h-[calc(100vh-160px)] overflow-hidden"
      >
        <div className="bg-white shadow-lg border border-gray-200 rounded-2xl overflow-y-auto h-full">
          {activeSidebar !== "blank" && (
            <SidebarHeader title={headerTitle} canGoBack={canGoBack} onBack={onBack} onClose={onClose} />
          )}
          <div className="p-4">{sidebarContent}</div>
        </div>
      </div>
    </>
  );
}
