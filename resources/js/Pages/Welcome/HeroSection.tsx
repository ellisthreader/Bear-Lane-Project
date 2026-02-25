"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/images/HeroSection/hero-clothing1.jpeg",
  "/images/HeroSection/hero-clothing2.jpeg",
  "/images/HeroSection/hero-clothing3.jpeg",
  "/images/HeroSection/hero-clothing4.png",
];

export default function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
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
    setCurrentIndex((prev) => (prev + 1) % images.length);
    if (!auto) {
      setIsDisabled(true);
      setTimeout(() => setIsDisabled(false), 800);
      resetAutoSlide();
    }
  };

  const handlePrev = () => {
    if (isDisabled) return;
    setDirection(-1);
    setCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
    setIsDisabled(true);
    setTimeout(() => setIsDisabled(false), 800);
    resetAutoSlide();
  };

  return (
    <div className="relative w-full" style={{ paddingTop: "px" }}>
      {/* Hero container */}
      <div className="relative w-full aspect-video max-h-[91vh] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Hero image ${currentIndex + 1}`}
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
          src={
            images[
              (currentIndex - direction + images.length) % images.length
            ]
          }
          alt="Previous hero"
          className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        />

        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          disabled={isDisabled}
          className={`absolute left-6 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-900 p-3 rounded-full shadow-md transition z-20 ${
            isDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => handleNext()}
          disabled={isDisabled}
          className={`absolute right-6 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-900 p-3 rounded-full shadow-md transition z-20 ${
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
