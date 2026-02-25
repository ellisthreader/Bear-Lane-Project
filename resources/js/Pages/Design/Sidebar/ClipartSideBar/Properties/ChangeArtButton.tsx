"use client";

import { Palette } from "lucide-react";

type ChangeArtButtonProps = {
  onBack?: () => void;
  onChangeArt: () => void;
};

export default function ChangeArtButton({
  onBack,
  onChangeArt,
}: ChangeArtButtonProps) {
  const handleClick = () => {
    if (onBack) onBack();
    else onChangeArt();
  };

  return (
    <button
      onClick={handleClick}
      className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
    >
      <Palette size={18} />
      Change Art
    </button>
  );
}
