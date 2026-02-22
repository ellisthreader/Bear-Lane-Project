"use client";

import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { stencilizeImage } from "../../Canvas/Utils/stencilizeImage";
import ImagePreviewModal from "../../Components/ImagePreviewModal";

type StencilizeUIProps = {
  onUpload: (url: string) => void;

  /** UIDs, NOT URLs */
  recentImages?: string[];

  /** Full image state so we can resolve URLs */
  imageState: Record<string, any>;

  onSelectImage?: (uid: string) => void;
};

export default function StencilizeUI({
  onUpload,
  recentImages = [],
  imageState,
  onSelectImage,
}: StencilizeUIProps) {
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  /* ---------------- Cleanup ---------------- */
  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const resetState = () => {
    cleanupObjectUrl();
    setOriginal(null);
    setProcessed(null);
    setLoading(false);
  };

  /* ---------------- Upload ---------------- */
  const handleFile = async (file?: File) => {
    if (!file || loading) return;

    resetState();

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    setOriginal(objectUrl);
    setLoading(true);

    try {
      const processedImage = await stencilizeImage(objectUrl);
      setProcessed(processedImage);
    } catch (err) {
      console.error("Stencilize failed:", err);
      resetState();
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    if (!processed) return;
    onUpload(processed);
    resetState();
  };

  const handleCancel = () => {
    resetState();
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <div className="p-6 space-y-6 h-full overflow-y-auto bg-white rounded-xl">
        {/* Browse Button */}
        <label className="w-full flex items-center gap-3 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg border border-gray-300 transition">
          <UploadCloud size={22} />
          <span className="font-medium">
            {loading ? "Processing…" : "Browse your computer"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={loading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {/* Drag & Drop */}
        <div
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="w-full h-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-600 bg-gray-50 hover:bg-gray-100 transition"
        >
          <ImageIcon size={30} className="mb-2 opacity-70" />
          <p className="text-sm font-medium">Or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG supported</p>
        </div>

        {/* Image Requirements */}
        <div className="bg-[#FBF8F1] border border-[#E9DBB6] rounded-lg p-4 text-[#8A6D2B] text-sm">
          <ul className="list-disc ml-5 space-y-1">
            <li>High-resolution images (300 DPI+) look best</li>
            <li>Transparent backgrounds recommended</li>
            <li>Maximum file size: 25MB</li>
          </ul>
        </div>

        {/* Recent Uploads */}
        {recentImages.length > 0 && (
          <div className="pb-4">
            <p className="text-sm font-semibold mb-2 text-gray-800">
              Recent Uploads
            </p>
            <div className="grid grid-cols-2 gap-4 pr-1">
              {recentImages.map((uid) => {
                const layer = imageState[uid];
                if (!layer) return null;

                return (
                  <div
                    key={uid}
                    onClick={() => onSelectImage?.(uid)}
                    className="w-full h-32 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-[#C6A75E] transition"
                  >
                    <img
                      src={layer.url}
                      alt="recent upload"
                      className="w-full h-full object-contain bg-gray-100"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {original && processed && (
        <ImagePreviewModal
          original={original}
          processed={processed}
          loading={loading}
          onClose={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
