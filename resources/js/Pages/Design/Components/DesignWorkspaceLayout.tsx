"use client";

import React from "react";
import { useDesignPageContext } from "../Context/DesignPageContext";

export default function DesignWorkspaceLayout() {
  const { isPricePanelOpen, canvas, pricePanel, pricePanelRef } = useDesignPageContext();

  return (
    <>
      <div className={`mt-4 mb-6 h-[calc(100vh-160px)] flex-1 mr-6 ${isPricePanelOpen ? "pointer-events-none opacity-45 blur-[1px]" : ""}`}>
        <div className="relative h-full w-full">
          <div className="flex h-full rounded-2xl overflow-hidden bg-gray-100">
            {canvas}
          </div>
        </div>
      </div>

      {isPricePanelOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px]" />
          <div
            ref={pricePanelRef}
            className="fixed right-6 top-[104px] z-[80] h-[calc(100vh-160px)] w-[820px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          >
            {pricePanel}
          </div>
        </>
      )}
    </>
  );
}
