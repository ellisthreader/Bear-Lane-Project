"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function ImagePreviewModal({
  original,
  processed,
  variants,
  loading,
  onConfirm,
  onClose,
  onRegenerate,
  onSelectVariant,
}: {
  original: string;
  processed: string;
  variants?: string[];
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onRegenerate?: () => void;
  onSelectVariant?: (img: string) => void;
}) {
  const [showProcess, setShowProcess] = useState(false);
  const [comment, setComment] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)" }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-6xl w-full p-6 overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 disabled:opacity-50 transition"
        >
          <X size={22} />
        </button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Image Processing Preview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your image has been converted into a stitch-ready stencil for precise embroidery.
          </p>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-6">
          {/* Original */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">Original Upload</p>
            <div className="border rounded-2xl bg-gray-50 p-3 shadow-sm flex items-center justify-center">
              <img
                src={original}
                className="max-h-[55vh] w-full object-contain rounded-xl"
                alt="Original"
              />
            </div>
          </div>

          {/* Processed */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">Stencil Output</p>
            <div className="relative border rounded-2xl bg-gray-50 p-3 shadow-sm flex items-center justify-center">
              <img
                src={processed}
                className={`max-h-[55vh] w-full object-contain rounded-xl ${
                  loading ? "opacity-40" : ""
                }`}
                alt="Processed"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-10 w-10 rounded-full border-4 border-[#C6A75E] border-t-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Comment Box */}
        <div className="mt-4">
          <textarea
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-2xl p-3 text-sm resize-none focus:ring-2 focus:ring-[#C6A75E] focus:border-[#C6A75E] transition"
            rows={3}
          />
        </div>

        {/* How is this done + Footer Buttons */}
        <div className="mt-6 flex justify-between items-center">
          {/* Bottom-left: How is this done */}
          <button
            onClick={() => setShowProcess((prev) => !prev)}
            className="text-sm text-[#8A6D2B] hover:underline font-medium transition"
          >
            How is this done?
          </button>

          {/* Bottom-right: Cancel & Confirm */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 font-semibold disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-2 rounded-2xl bg-[#C6A75E] hover:bg-[#B8994E] text-white font-semibold disabled:bg-gray-400 transition"
            >
              Confirm & Add
            </button>
          </div>
        </div>

        {/* Process Explanation */}
        {showProcess && (
          <div className="mt-6 border-t border-gray-200 pt-6 space-y-6 bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-inner p-6 transition-all">
            <div className="text-gray-800 text-sm space-y-3">
              <p className="text-lg font-semibold">Our Process</p>
              <p>
                Using top-of-the-line embroidery machines and highly trained professionals,
                we transform your uploaded image into a precise, stitch-ready design.
                Every thread is placed for maximum clarity, durability, and vibrant color fidelity.
              </p>
              <p>
                Our team ensures attention to detail at every step, from processing your image
                to the final embroidery on high-quality fabric. You get a professional, clean,
                and perfect result every time.
              </p>
            </div>

            {/* Demo Video */}
            <div className="flex justify-center">
              <video
                src="/videos/embroidery-demo.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="rounded-2xl shadow-xl w-full max-w-4xl border border-gray-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
