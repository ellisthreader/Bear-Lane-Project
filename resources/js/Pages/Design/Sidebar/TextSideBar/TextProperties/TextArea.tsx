"use client";

import React from "react";

const MAX_TEXT_LENGTH = 65;

type Props = {
  textValue: string;
  onTextChange: (v: string) => void;
};

export default function TextArea({ textValue, onTextChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">Text</label>

      <textarea
        value={textValue}
        maxLength={MAX_TEXT_LENGTH}
        onChange={(e) =>
          onTextChange(e.target.value.slice(0, MAX_TEXT_LENGTH))
        }
        className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
        rows={2}
      />

      <div className="text-xs text-gray-500 text-right">
        {textValue.length} / {MAX_TEXT_LENGTH}
      </div>
    </div>
  );
}
