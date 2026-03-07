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
    onClose,
    onSelectTab,
    headerTitle,
    sidebarContent,
  } = useDesignPageContext();
  const showMobilePanel = activeSidebar !== "blank";
  const showMobileTabs = !showMobilePanel;

  return (
    <>
      <div className="mt-4 mb-6 ml-6 hidden h-[calc(100vh-160px)] w-[140px] flex-col items-center gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-lg lg:flex">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`h-16 w-full rounded-xl border transition ${
              activeSidebar === tab.id
                ? "border-[#C6A75E] bg-[#C6A75E]/15 shadow-sm"
                : "border-gray-200 bg-white hover:border-[#C6A75E]/50 hover:bg-[#C6A75E]/10"
            } flex flex-col items-center justify-center`}
          >
            {React.cloneElement(tab.icon as React.ReactElement, {
              className: activeSidebar === tab.id ? "text-[#8A6D2B]" : "text-gray-700",
            })}
            <span className={`text-sm ${activeSidebar === tab.id ? "font-semibold text-[#8A6D2B]" : "text-gray-700"}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 mb-6 ml-4 hidden h-[calc(100vh-160px)] w-[480px] overflow-hidden lg:block">
        <div className="h-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
          {activeSidebar !== "blank" ? (
            <SidebarHeader title={headerTitle} onClose={onClose} />
          ) : null}
          <div className="p-4">{sidebarContent}</div>
        </div>
      </div>

      {showMobilePanel ? (
        <div className="fixed inset-0 top-[88px] z-[75] sm:top-[96px] lg:hidden">
          <div className="h-full overflow-hidden bg-white shadow-[0_16px_38px_rgba(20,20,20,0.2)]">
            <SidebarHeader title={headerTitle} onClose={onClose} />
            <div className="h-[calc(100%-60px)] overflow-y-auto p-4 pb-8">{sidebarContent}</div>
          </div>
        </div>
      ) : null}

      {showMobileTabs ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-gray-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_26px_rgba(20,20,20,0.12)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={`mobile-${tab.id}`}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
                  activeSidebar === tab.id
                    ? "bg-[#C6A75E]/15 text-[#8A6D2B]"
                    : "bg-white text-gray-700 hover:bg-[#C6A75E]/10"
                }`}
              >
                {React.cloneElement(tab.icon as React.ReactElement, {
                  size: 18,
                  className: activeSidebar === tab.id ? "text-[#8A6D2B]" : "text-gray-700",
                })}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
