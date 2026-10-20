"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ImagePlus, RefreshCw, X } from "lucide-react";
import { useSiteDesign } from "@/Theme/siteDesign";
import { EditAction, EditText } from "@/Components/SiteEditor/primitives";
import { DEFAULT_HERO_SLIDE_PATHS } from "@/Components/SiteEditor/sections";
import {
  editHeroSlides,
  uploadImage,
  useEditMode,
  useEditorDesign,
  useEditorState,
  useText,
} from "@/Components/SiteEditor/store";
import type { StoredImage } from "@/Components/SiteEditor/types";

export const DEFAULT_HERO_SLIDES = DEFAULT_HERO_SLIDE_PATHS.map((path) => `/${path}`);

export default function HeroSection() {
  const siteDesign = useSiteDesign();
  const editing = useEditMode();
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const customSlides = siteDesign?.images?.hero_slides;
  const images = customSlides && customSlides.length > 0 ? customSlides : DEFAULT_HERO_SLIDES;
  const slideCountRef = useRef(images.length);
  slideCountRef.current = images.length;

  const [rawIndex, setCurrentIndex] = useState(0);
  // Slides can change while previewing from the admin dashboard; keep the index in range.
  const currentIndex = rawIndex % images.length;
  const [direction, setDirection] = useState(1);
  const [isDisabled, setIsDisabled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // The slideshow holds still while the owner is editing so thumbnails and text stay put.
    if (editingRef.current) return;
    intervalRef.current = setInterval(() => {
      handleNext(true);
    }, 5000);
  };

  useEffect(() => {
    resetAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [editing]);

  const handleNext = (auto = false) => {
    if (isDisabled && !auto) return; // prevent spam clicks
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slideCountRef.current);
    if (!auto) {
      setIsDisabled(true);
      setTimeout(() => setIsDisabled(false), 800);
      resetAutoSlide();
    }
  };

  const handlePrev = () => {
    if (isDisabled) return;
    setDirection(-1);
    setCurrentIndex((prev) => {
      const count = slideCountRef.current;
      const current = prev % count;
      return current === 0 ? count - 1 : current - 1;
    });
    setIsDisabled(true);
    setTimeout(() => setIsDisabled(false), 800);
    resetAutoSlide();
  };

  const backupIndex =
    currentIndex === 0 && direction === 1
      ? 0
      : (currentIndex - direction + images.length) % images.length;

  return (
    <div className="relative w-full">
      {/* Hero container */}
      <div className="relative h-[72vh] min-h-[430px] max-h-[86vh] w-full overflow-hidden sm:h-[76vh] md:h-auto md:max-h-[91vh] md:aspect-video">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Hero image ${currentIndex + 1}`}
            loading="eager"
            fetchPriority={currentIndex === 0 ? "high" : "auto"}
            decoding="async"
            custom={direction}
            initial={{ x: direction > 0 ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: direction > 0 ? "-100%" : "100%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Backup image to prevent white flash */}
        <img
          src={images[backupIndex]}
          alt="Previous hero"
          loading="lazy"
          decoding="async"
          className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        />

        <HeroOverlay />

        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          disabled={isDisabled}
          data-edit-allow
          className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/70 p-2.5 text-gray-900 shadow-md transition hover:bg-white sm:left-6 sm:p-3 ${
            isDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => handleNext()}
          disabled={isDisabled}
          data-edit-allow
          className={`absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/70 p-2.5 text-gray-900 shadow-md transition hover:bg-white sm:right-6 sm:p-3 ${
            isDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots (non-clickable visual indicators) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "bg-gray-900 scale-110"
                  : "bg-gray-400/50"
              }`}
            />
          ))}
        </div>

        {editing ? (
          <HeroSlidesEditor
            current={currentIndex}
            onSelect={(index) => {
              setDirection(index >= currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Optional headline / subtitle / button on top of the slides. Empty (and invisible) until the owner adds text. */
function HeroOverlay() {
  const editing = useEditMode();
  const hasText = [useText("hero.title", ""), useText("hero.subtitle", ""), useText("hero.button", "")].some(Boolean);
  if (!editing && !hasText) return null;

  const shadow = "[text-shadow:0_2px_14px_rgba(0,0,0,0.55)]";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
      {hasText ? <div className="absolute inset-0 bg-black/25" /> : null}
      <div className="pointer-events-auto relative flex max-w-3xl flex-col items-center gap-4 text-center">
        <EditText
          id="hero.title"
          as="h1"
          label="Headline"
          placeholder="Add a headline"
          className={`text-4xl font-bold leading-tight text-white md:text-6xl ${shadow}`}
        >
          {""}
        </EditText>
        <EditText
          id="hero.subtitle"
          as="p"
          label="Subtitle"
          placeholder="Add a short line of text"
          className={`max-w-xl text-base text-white md:text-xl ${shadow}`}
        >
          {""}
        </EditText>
        <EditAction
          id="hero.button"
          label=""
          placeholder="Add a button"
          hideWhenEmpty
          defaultHref="/personalise"
          className="rounded-2xl bg-[#C9A24D] px-8 py-4 font-semibold text-white shadow-lg transition hover:opacity-90"
        />
      </div>
    </div>
  );
}

/** Edit mode only: thumbnails of the slides with add, replace, reorder and remove. */
function HeroSlidesEditor({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  const design = useEditorDesign();
  const { limits, uploads } = useEditorState();
  const [busy, setBusy] = useState(false);
  if (!design) return null;

  const slides = design.hero_slides ?? DEFAULT_HERO_SLIDE_PATHS.map((path) => ({ path, url: `/${path}` }));
  const max = limits.heroSlides;

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added: StoredImage[] = [];
      for (const file of Array.from(files).slice(0, Math.max(0, max - slides.length))) {
        added.push(await uploadImage(file));
      }
      if (added.length > 0) editHeroSlides((all) => [...all, ...added]);
    } catch {
      // uploadImage already told the owner what went wrong
    } finally {
      setBusy(false);
    }
  };

  const replaceAt = async (index: number, file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await uploadImage(file);
      editHeroSlides((all) => all.map((slide, i) => (i === index ? image : slide)));
    } catch {
      // handled in uploadImage
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: -1 | 1) =>
    editHeroSlides((all) => {
      const target = index + delta;
      if (target < 0 || target >= all.length) return all;
      const next = [...all];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const tool = "flex h-5 flex-1 items-center justify-center text-white hover:bg-white/25 disabled:opacity-30";

  return (
    <div data-editor-ui className="absolute bottom-12 left-4 z-30 max-w-[calc(100%-2rem)] rounded-xl bg-white/95 p-2.5 shadow-xl backdrop-blur">
      <p className="px-0.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Hero images ({slides.length}/{max}){design.hero_slides === null ? " · built-in" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {slides.map((slide, index) => (
          <div
            key={`${slide.path}-${index}`}
            className={`group/thumb relative h-14 w-20 overflow-hidden rounded-lg ring-2 ${index === current ? "ring-blue-500" : "ring-transparent"}`}
          >
            <button type="button" onClick={() => onSelect(index)} className="block h-full w-full" aria-label={`Show slide ${index + 1}`}>
              <img src={slide.url ?? ""} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
            <div className="absolute inset-x-0 bottom-0 hidden bg-black/75 group-hover/thumb:flex">
              <button type="button" className={tool} disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move earlier">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <label className={`${tool} cursor-pointer`} aria-label="Replace image" title="Replace image">
                <RefreshCw className="h-3 w-3" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void replaceAt(index, file);
                  }}
                />
              </label>
              <button type="button" className={tool} disabled={index === slides.length - 1} onClick={() => move(index, 1)} aria-label="Move later">
                <ChevronRight className="h-3 w-3" />
              </button>
              <button type="button" className={tool} onClick={() => editHeroSlides((all) => all.filter((_, i) => i !== index))} aria-label="Remove slide">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {slides.length < max ? (
          <label className="flex h-14 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-blue-400 text-[11px] font-medium text-blue-600 hover:bg-blue-50">
            <ImagePlus className="h-4 w-4" />
            {busy || uploads > 0 ? "Uploading" : "Add"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = event.target.files;
                void addFiles(files);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
