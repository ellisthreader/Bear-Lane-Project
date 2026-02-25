import { Copy, RotateCw, RefreshCw, Trash2 } from "lucide-react";

type ActionButtonsProps = {
  selectedImage: string;
  onDuplicateUploadedImage?: (id: string) => void;
  onRemoveUploadedImage?: (id: string) => void;
  onResetImage?: (id: string) => void;
  onCrop?: (id: string) => void;
};

export default function ActionButtons({
  selectedImage,
  onDuplicateUploadedImage,
  onRemoveUploadedImage,
  onResetImage,
  onCrop,
}: ActionButtonsProps) {
  if (!selectedImage) return null;

  return (
    <div className="space-y-3">
      {/* Duplicate */}
      <button
        type="button"
        className="w-full py-3 bg-gray-200 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-300"
        onClick={() => onDuplicateUploadedImage?.(selectedImage)}
      >
        <Copy size={18} />
        Duplicate
      </button>

      {/* Crop */}
      <button
        type="button"
        className="w-full py-3 bg-gray-200 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-300"
        onClick={() => {
          console.log("✂️ Crop clicked:", selectedImage);
          onCrop?.(selectedImage);
        }}
      >
        <RotateCw size={18} />
        Crop
      </button>

      {/* Reset */}
      <button
        type="button"
        className="w-full py-3 bg-red-100 text-red-700 rounded-xl flex items-center justify-center gap-2 hover:bg-red-200"
        onClick={() => onResetImage?.(selectedImage)}
      >
        <RefreshCw size={18} />
        Reset To Original
      </button>

      {/* Delete */}
      <button
        type="button"
        className="w-full py-3 bg-red-200 text-red-700 rounded-xl flex items-center justify-center gap-2 hover:bg-red-300"
        onClick={() => onRemoveUploadedImage?.(selectedImage)}
      >
        <Trash2 size={18} />
        Delete Image
      </button>
    </div>
  );
}
