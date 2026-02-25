"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsGear } from "react-icons/bs";

const saleImages = [
  {
    image: "/sale-hats.jpg",
    title: "30% Off All Hats",
    subtitle: "Find your perfect fit from our stylish new hat collection.",
    gradient: "from-yellow-400 to-red-500",
  },
  {
    image: "/sale-tees.jpg",
    title: "Buy 1 Get 1 Free",
    subtitle: "On all graphic tees — mix and match your favorite designs.",
    gradient: "from-pink-500 to-purple-600",
  },
  {
    image: "/sale-winter.jpg",
    title: "Winter Sale — Up to 50% Off",
    subtitle: "Exclusive deals on jackets, hoodies, and cozy essentials.",
    gradient: "from-blue-500 to-cyan-400",
  },
];

export default function SaleHeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % saleImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (id: string) => {
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative h-[70vh] w-full overflow-hidden"> {/* ⬅️ Reduced height */}
      {/* Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${saleImages[currentIndex].image}')`,
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-extrabold text-white mb-3"
        >
          {saleImages[currentIndex].title}
          <span
            className={`block bg-gradient-to-r ${saleImages[currentIndex].gradient} text-transparent bg-clip-text mt-1 text-lg md:text-xl font-semibold`}
          >
            {saleImages[currentIndex].subtitle}
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex gap-4 flex-wrap justify-center mt-5"
        >
          <button
            onClick={() => handleScroll("shop")}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold shadow hover:opacity-90 transition"
          >
            Shop Now
          </button>
          <button
            onClick={() => handleScroll("collections")}
            className={`px-6 py-3 bg-gradient-to-r ${saleImages[currentIndex].gradient} text-white rounded-lg font-semibold shadow hover:opacity-90 transition`}
          >
            View Collection
          </button>
        </motion.div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {saleImages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === currentIndex ? "bg-white" : "bg-gray-400/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
