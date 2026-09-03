"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

type UploadPanelProps = {
  onUpload: (url: string) => void;
  onValidateUpload?: (file: File) => Promise<{ allowed: boolean; message?: string }>;

  /** UIDs, NOT URLs */
  recentImages?: string[];

  /** Full image state so we can resolve URLs */
  imageState: Record<string, any>;

  onSelectImage?: (uid: string) => void;
};

export default function UploadPanel({
  onUpload,
  onValidateUpload,
  recentImages = [],
  imageState,
  onSelectImage,
}: UploadPanelProps) {
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<"moderating" | "preparing">("moderating");
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileViewport(query.matches);
    sync();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }
    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  useEffect(() => {
    if (!loading) return;
    setProcessingProgress((prev) => (prev > 0 ? prev : 3));
    const interval = window.setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 92) return prev;
        const step =
          processingStage === "moderating"
            ? prev < 20
              ? 4
              : 2
            : prev < 40
            ? 6
            : prev < 70
            ? 3
            : 1;
        return Math.min(92, prev + step);
      });
    }, 320);
    return () => window.clearInterval(interval);
  }, [loading, processingStage]);

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
    setLoading(false);
    setProcessingProgress(0);
    setProcessingStage("moderating");
  };

  const toDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Unable to read image file."));
      };
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });

  /* ---------------- Upload ---------------- */
  const handleFile = async (file?: File) => {
    if (!file || loading) return;

    resetState();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setOriginal(objectUrl);
    setLoading(true);
    setProcessingStage("moderating");
    setProcessingProgress(4);

    if (onValidateUpload) {
      try {
        const moderation = await onValidateUpload(file);
        if (!moderation.allowed) {
          resetState();
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch (error) {
        console.error("Upload moderation failed:", error);
        resetState();
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    try {
      setProcessingStage("preparing");
      setProcessingProgress((prev) => Math.max(prev, 55));
      const rawDataUrl = await toDataUrl(file);
      setProcessingProgress(100);
      onUpload(rawDataUrl);
    } catch (err) {
      console.error("Image read failed:", err);
    } finally {
      resetState();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <div className="p-6 space-y-6 h-full overflow-y-auto">
        {loading && original ? (
          <div className="rounded-xl border border-[#C6A75E]/45 bg-gradient-to-r from-[#FFF7E4] via-[#FFFDF7] to-[#F3E4BE] px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#6F5724]">
                {processingStage === "moderating" ? "Checking image safety..." : "Processing your image..."}
              </p>
              <span className="text-xs font-semibold text-[#6F5724]">{Math.round(processingProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EBDDB9]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#CFAC52] to-[#B9902E] transition-all duration-300"
                style={{ width: `${Math.max(6, Math.min(100, processingProgress))}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Browse Button */}
        <label className="w-full flex items-center gap-3 cursor-pointer bg-white hover:bg-[#FFF7E6] text-[#2F2617] py-3 px-4 rounded-lg border border-[#DCC89A] transition">
          <UploadCloud size={22} />
          <span className="font-medium">
            {loading
              ? processingStage === "moderating"
                ? "Checking upload…"
                : "Processing…"
              : isMobileViewport
              ? "Browse your device"
              : "Browse your computer"}
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
          className="w-full h-36 border-2 border-dashed border-[#D8C391] rounded-lg flex flex-col items-center justify-center text-[#7A6640] bg-[#FFFCF2] hover:bg-[#FFF6DE] transition"
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
        {(loading || recentImages.length > 0) && (
          <div className="pb-4">
            <p className="text-sm font-semibold mb-2 text-gray-800">
              Recent Uploads
            </p>
            <div className="grid grid-cols-2 gap-4 pr-1">
              {loading && original ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#3B82F6]/50 bg-gray-100">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={original}
                    alt="Processing upload"
                    className="w-full h-full object-contain bg-gray-100"
                    draggable={false}
                  />
                  <div
                    className="absolute inset-0 bg-blue-500/45 transition-all duration-300"
                    style={{ clipPath: `inset(0 ${Math.max(0, 100 - processingProgress)}% 0 0)` }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]">
                      {processingStage === "moderating" ? "Moderating" : "Processing"}
                    </span>
                    <span className="mt-1 text-sm font-bold">{Math.round(processingProgress)}%</span>
                  </div>
                </div>
              ) : null}
              {recentImages.map((uid) => {
                const layer = imageState[uid];
                if (!layer) return null;

                return (
                  <div
                    key={uid}
                    onClick={() => onSelectImage?.(uid)}
                    className="w-full h-32 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-[#C6A75E] transition"
                  >
                    <img loading="lazy" decoding="async"
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

    </>
  );
}
