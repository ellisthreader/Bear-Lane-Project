"use client";

import { useState } from "react";

const MAX_TEXT_LENGTH = 260;

export type TextLayer = {
  id: string;
  type: "text";
  text: string;
  font: string;
  color: string;
  fontSize: number;
  rotation: number;
  borderColor: string;
  borderWidth: number;
  width?: number;
};

export default function AddText({
  onAddText,
}: {
  onAddText: (layer: TextLayer) => void;
}) {
  const [text, setText] = useState("");

  const calculateFontSize = (
    text: string,
    fontFamily: string,
    maxWidth: number,
    maxFontSize: number
  ) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return maxFontSize;

    let fontSize = maxFontSize;

    while (fontSize > 5) {
      context.font = `${fontSize}px ${fontFamily}`;
      const textWidth = context.measureText(text).width;
      if (textWidth <= maxWidth) break;
      fontSize -= 1;
    }

    return fontSize;
  };

  const handleAddText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const clampedText = trimmed.slice(0, MAX_TEXT_LENGTH);

    const maxWidth = 200;
    const maxFontSize = 40;

    const adjustedFontSize = calculateFontSize(
      clampedText,
      "Inter",
      maxWidth,
      maxFontSize
    );

    onAddText({
      id: crypto.randomUUID(),
      type: "text",
      text: clampedText,
      font: "Inter",
      color: "#000000",
      fontSize: adjustedFontSize,
      rotation: 0,
      borderColor: "#000000",
      borderWidth: 0,
      width: maxWidth,
    });

    setText("");
  };

  return (
    <div className="space-y-3">
      {/* Input */}
      <input
        type="text"
        placeholder="Enter text here..."
        className="w-full p-3 text-gray-800 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#C6A75E] focus:outline-none transition placeholder-gray-400"
        value={text}
        maxLength={MAX_TEXT_LENGTH}
        onChange={(e) =>
          setText(e.target.value.slice(0, MAX_TEXT_LENGTH))
        }
      />

      {/* Character Counter */}
      <div className="text-xs text-gray-400 text-right">
        {text.length} / {MAX_TEXT_LENGTH}
      </div>

      {/* Add Button */}
      <button
        className="w-full py-3 bg-[#C6A75E] text-white font-semibold rounded-xl transition hover:bg-[#B8994E]"
        onClick={handleAddText}
      >
        Add Text
      </button>

      {/* Optional Tip */}
      <p className="text-gray-400 text-xs text-center">
        Tip: Keep text concise for best results
      </p>
    </div>
  );
}
