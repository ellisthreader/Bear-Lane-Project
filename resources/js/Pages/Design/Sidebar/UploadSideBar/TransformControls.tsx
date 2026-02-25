"use client";

import { FlipHorizontal, FlipVertical } from "lucide-react";

type TransformControlsProps = {
  selectedImage: string;
  image: {
    rotation?: number;
    flip?: "none" | "horizontal" | "vertical";
  };
  onRotateImage?: (id: string, rotation: number) => void;
  onFlipImage?: (id: string, flip: "none" | "horizontal" | "vertical") => void;
};

export default function TransformControls({
  image,
  onRotateImage,
  onFlipImage,
  selectedImage,
}: TransformControlsProps) {
  if (!image) return null; // defensive check

  const handleFlip = (direction: "horizontal" | "vertical") => {
    console.log("Flip clicked:", selectedImage, direction, "current flip:", image.flip);
    if (!onFlipImage) {
      console.warn("onFlipImage handler is not provided!");
      return;
    }

    const newFlip = image.flip === direction ? "none" : direction;
    onFlipImage(selectedImage, newFlip);
  };

  const handleRotate = (value: number) => {
    console.log("Rotate changed:", selectedImage, value);
    if (!onRotateImage) {
      console.warn("onRotateImage handler is not provided!");
      return;
    }
    onRotateImage(selectedImage, value);
  };

  return (
    <div className="space-y-3">
      {/* Rotate Slider */}
      <input
        type="range"
        min={-180}
        max={180}
        value={image.rotation ?? 0}
        onChange={(e) => handleRotate(Number(e.target.value))}
        className="w-full"
      />

      {/* Flip Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleFlip("horizontal")}
          className={`p-2 rounded-md border ${
            image.flip === "horizontal" ? "bg-[#C6A75E]/20" : "bg-gray-200"
          }`}
        >
          <FlipHorizontal size={18} />
        </button>

        <button
          onClick={() => handleFlip("vertical")}
          className={`p-2 rounded-md border ${
            image.flip === "vertical" ? "bg-[#C6A75E]/20" : "bg-gray-200"
          }`}
        >
          <FlipVertical size={18} />
        </button>
      </div>
    </div>
  );
}
