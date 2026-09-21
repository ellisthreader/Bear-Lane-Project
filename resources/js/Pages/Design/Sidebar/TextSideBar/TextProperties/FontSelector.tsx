"use client";

import { toCssFontFamily } from "../../../constants/designFonts";

type Props = {
  fontFamily: string;
  onOpenFonts: () => void;
};

export default function FontSelector({ fontFamily, onOpenFonts }: Props) {
  return (
    <div
      className="flex items-center justify-between w-full cursor-pointer py-3"
      onClick={onOpenFonts}
    >
      {/* Left label */}
      <div className="text-base font-semibold">
        Font
      </div>

      {/* Font name — right side */}
      <div
        className="text-sm text-gray-600 truncate"
        style={{ fontFamily: toCssFontFamily(fontFamily) }}
        title={fontFamily}
      >
        {fontFamily}
      </div>
    </div>
  );
}
