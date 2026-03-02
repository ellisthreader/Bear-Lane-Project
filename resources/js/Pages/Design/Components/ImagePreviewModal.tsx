"use client";

import { useState } from "react";
import { ChevronDown, LifeBuoy, Mail, RefreshCw, X } from "lucide-react";

export default function ImagePreviewModal({
  original,
  processed,
  variants,
  loading,
  onConfirm,
  onClose,
  onRegenerate,
  onSelectVariant,
  contactHref = "/contact",
  tutorialVideoUrl = "/videos/embroidery-demo.mp4",
}: {
  original: string;
  processed: string;
  variants?: string[];
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onRegenerate?: () => void;
  onSelectVariant?: (img: string) => void;
  contactHref?: string;
  tutorialVideoUrl?: string;
}) {
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [comment, setComment] = useState("");
  const messageHref = `mailto:support@bearlane.co.uk?subject=${encodeURIComponent("Stencil preview feedback")}&body=${encodeURIComponent(comment || "Something looks wrong with my stencil preview.")}`;

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
      <div
        className={`relative z-10 max-w-6xl w-full p-5 rounded-3xl border border-[#E9DBB6] bg-gradient-to-br from-[#FFFEFB] via-white to-[#F7F3E8] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          showHowItWorks ? "h-[min(96vh,980px)]" : "h-[min(88vh,860px)]"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#4F3F1E] disabled:opacity-50 transition"
        >
          <X size={22} />
        </button>

        {/* Title */}
        <div className="mb-4 border border-[#E9DBB6] bg-[#FFF9ED] rounded-2xl p-3">
          <h2 className="text-2xl font-bold text-[#2F2617]">Image Processing Preview</h2>
          <p className="text-sm text-[#7A6640] mt-1">
            Your image has been converted into a stitch-ready stencil for precise embroidery.
          </p>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-5">
          {/* Original */}
          <div>
            <p className="text-sm font-semibold mb-2 text-[#5B4A2A]">Original Upload</p>
            <div className="border border-[#E7DFC8] rounded-2xl bg-white p-3 shadow-sm flex items-center justify-center">
              <img
                src={original}
                className={`w-full object-contain rounded-xl transition-all duration-300 ${
                  showHowItWorks ? "max-h-[21vh]" : "max-h-[31vh]"
                }`}
                alt="Original"
              />
            </div>
          </div>

          {/* Processed */}
          <div>
            <p className="text-sm font-semibold mb-2 text-[#5B4A2A]">Stencil Output</p>
            <div className="relative border border-[#D8C9A3] rounded-2xl bg-[#FFFDF6] p-3 shadow-sm flex items-center justify-center">
              <img
                src={processed}
                className={`w-full object-contain rounded-xl transition-all duration-300 ${
                  showHowItWorks ? "max-h-[21vh]" : "max-h-[31vh]"
                } ${loading ? "opacity-40" : ""}`}
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

        <div className="mt-3 min-h-[170px] rounded-2xl border border-[#E9DBB6] bg-[#FFFAEF] p-4">
          <p className="text-sm font-semibold text-[#5A4723]">Something wrong?</p>
          <p className="mt-1 text-sm text-[#7A6640]">
            Regenerate a new stencil variation, contact us directly, or leave a message.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onRegenerate}
              disabled={loading || !onRegenerate}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D1B87A] bg-white px-4 py-2 text-sm font-semibold text-[#6E5523] hover:bg-[#FFF4DA] disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Regenerate
            </button>
            <a
              href={contactHref}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D1B87A] bg-white px-4 py-2 text-sm font-semibold text-[#6E5523] hover:bg-[#FFF4DA]"
            >
              <LifeBuoy size={16} />
              Contact Us
            </a>
            <button
              type="button"
              onClick={() => setShowMessageBox((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D1B87A] bg-white px-4 py-2 text-sm font-semibold text-[#6E5523] hover:bg-[#FFF4DA]"
            >
              <Mail size={16} />
              Leave Message
            </button>
          </div>
          <div
            className={`transition-all duration-300 ease-out overflow-hidden ${
              showMessageBox ? "max-h-44 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <div className="pt-1">
              <textarea
                placeholder="Tell us what looks off and we will help."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-[#E5D9BC] rounded-xl p-3 text-sm resize-none bg-[#FFFEFB] focus:ring-2 focus:ring-[#C6A75E] focus:border-[#C6A75E] transition"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <a
                  href={messageHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C6A75E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#B8994E]"
                >
                  <Mail size={14} />
                  Send Message
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-out overflow-hidden ${
            showHowItWorks ? "max-h-[560px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="rounded-2xl border border-[#E9DBB6] bg-gradient-to-r from-[#FFF9ED] to-[#FFF5DD] p-4">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
              <div className="lg:col-span-2">
                <p className="text-base font-semibold text-[#4F3F1E] mb-2">How Your Design Becomes Embroidery-Ready</p>
                <ul className="text-sm leading-relaxed text-[#6E5A34] space-y-1">
                  <li>1. Your artwork is analyzed and simplified into clean stitch regions.</li>
                  <li>2. Edges are refined so details stay crisp without noisy thread paths.</li>
                  <li>3. Contrast and fill balance are tuned for stable machine stitching.</li>
                  <li>4. You can regenerate variations and pick the best stitch-ready result.</li>
                </ul>
              </div>
              <div className="lg:col-span-4 rounded-xl overflow-hidden border border-[#EADFC2] bg-[#FFFCF5] shadow-sm">
                <video className="w-full h-[380px] object-contain bg-black" controls preload="metadata">
                  <source src={tutorialVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowHowItWorks((prev) => !prev)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7A6640] hover:text-[#4F3F1E] transition"
          >
            How does it work?
            <ChevronDown
              size={16}
              className={`transition-transform ${showHowItWorks ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-2xl bg-[#E7E3D8] hover:bg-[#DCD5C1] text-[#2F2617] font-semibold disabled:opacity-50 transition"
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
      </div>
    </div>
  );
}
