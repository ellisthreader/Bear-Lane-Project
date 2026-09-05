"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteDesign } from "@/Theme/siteDesign";

export const DEFAULT_HERO_SLIDES = [
  "/hero.webp",
  "/images/HeroSection/hero-clothing2.webp",
  "/images/HeroSection/hero-clothing3.webp",
  "/images/HeroSection/hero-clothing4.webp",
];

export default function HeroSection() {
  const siteDesign = useSiteDesign();
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
    intervalRef.current = setInterval(() => {
      handleNext(true);
    }, 5000);
  };

  useEffect(() => {
    resetAutoSlide();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          disabled={isDisabled}
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
      </div>
    </div>
  );
}
