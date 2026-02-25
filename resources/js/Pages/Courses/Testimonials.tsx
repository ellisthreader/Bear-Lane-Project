"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const reviews = [
  { id: 1, name: "Alex J.", text: "This course helped me land my first freelance client within 2 weeks!" },
  { id: 2, name: "Maria K.", text: "The marketing strategies completely changed how I approach my content." },
  { id: 3, name: "Sam P.", text: "As a beginner, I was worried I wouldn’t keep up, but the lessons were so well structured." },
  { id: 4, name: "Daniel R.", text: "Honestly, this was the best investment I’ve made in my career." },
  { id: 5, name: "Sophie L.", text: "The TikTok Creator Pack was a game-changer for me." },
  { id: 6, name: "James T.", text: "I work full-time and wanted a side hustle. The guidance here gave me clarity." },
  { id: 7, name: "Priya S.", text: "The community support and 1-1 mentoring kept me accountable." },
  { id: 8, name: "Michael B.", text: "The Web Development Fundamentals course was crystal clear." },
  { id: 9, name: "Ella D.", text: "I started knowing absolutely nothing about digital marketing." },
  { id: 10, name: "Chris W.", text: "This wasn’t just a course. It felt like a complete system." },
];

export default function SuccessStories() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % reviews.length), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="testimonials"
      className="py-20 px-6 backdrop-blur-sm"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500">
        Student Success Stories
      </h2>

      <div className="relative max-w-4xl mx-auto h-52 md:h-44 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={reviews[index].id}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute w-full"
          >
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm shadow-xl rounded-2xl p-8 mx-4 text-center">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 italic leading-relaxed mb-6">
                “{reviews[index].text}”
              </p>
              <span className="block text-blue-600 dark:text-blue-400 font-semibold text-lg">
                – {reviews[index].name}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
