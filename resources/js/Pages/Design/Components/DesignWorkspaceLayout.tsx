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
          <div className="fixed inset-0 z-[80] bg-white/95 lg:bg-black/30 lg:backdrop-blur-[1px]" />
          <div
            ref={pricePanelRef}
            className="fixed inset-0 z-[90] overflow-hidden bg-white lg:inset-auto lg:right-6 lg:top-[104px] lg:h-[calc(100vh-160px)] lg:w-[820px] lg:rounded-2xl lg:border lg:border-gray-200 lg:shadow-lg"
          >
            {pricePanel}
          </div>
        </>
      )}
    </>
  );
}
