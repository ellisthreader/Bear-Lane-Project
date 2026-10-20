"use client";

import React from "react";
import { motion } from "framer-motion";

export default function HeroSection() {
  // Smooth scroll helper
  const handleScroll = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className="
        relative h-screen flex items-center justify-center px-6
        bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
        dark:from-blue-900 dark:via-purple-900 dark:to-gray-900
        backdrop-blur-sm transition-colors duration-500
      "
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-6xl md:text-7xl font-extrabold leading-tight mb-6 text-white"
        >
          Learn. Build. Grow.
          <span className="block text-blue-200 dark:text-blue-300">
            Level up your career & content.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-xl md:text-2xl mb-12 text-gray-100 max-w-2xl mx-auto"
        >
          Professional courses, creator tools, and bundles designed to help you
          master digital marketing, grow your brand, and monetize your skills.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6"
        >
          <button
            onClick={() => handleScroll("courses")}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold shadow hover:opacity-90 transition"
          >
            Browse Courses
          </button>

          <button
            onClick={() => handleScroll("products")}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-lg font-semibold shadow hover:opacity-90 transition"
          >
            Shop Products
          </button>
        </motion.div>
      </div>
    </div>
  );
}
