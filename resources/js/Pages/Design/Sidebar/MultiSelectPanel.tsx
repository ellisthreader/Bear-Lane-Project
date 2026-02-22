import React from "react";
import { Layers } from "lucide-react";

export default function MultiSelectPanel() {
  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Layers className="text-[#8A6D2B] w-6 h-6" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Multiple Objects Selected
        </h3>
      </div>

      {/* Description */}
      <div className="space-y-3 text-gray-700 dark:text-gray-300 text-base leading-relaxed">
        <p>
          You can move, resize, or transform your selected objects together.
        </p>
        <p>
          Right-click on a selection for additional editing options.
        </p>
        <p>
          To edit specific attributes like color or text, select one object at a time.
        </p>
      </div>

      {/* Footer / Tip */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Tip: Hold <span className="font-semibold">Shift</span> to select multiple objects quickly.
      </div>
    </div>
  );
}
