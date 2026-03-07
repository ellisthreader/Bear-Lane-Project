"use client";

import React from "react";
import { useDesignPageContext } from "../Context/DesignPageContext";

export default function DesignWorkspaceLayout() {
  const { isPricePanelOpen, canvas, pricePanel, pricePanelRef } = useDesignPageContext();

  return (
    <>
      <div
        className={`mt-3 mb-[92px] mr-0 h-[calc(100dvh-140px)] flex-1 md:mt-4 md:mb-6 md:h-[calc(100vh-160px)] lg:mb-6 lg:mr-6 ${
          isPricePanelOpen ? "pointer-events-none opacity-45 blur-[1px]" : ""
        }`}
      >
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
            className="fixed inset-x-3 bottom-3 top-[92px] z-[80] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg lg:inset-auto lg:right-6 lg:top-[104px] lg:h-[calc(100vh-160px)] lg:w-[820px]"
          >
            {pricePanel}
          </div>
        </>
      )}
    </>
  );
}
