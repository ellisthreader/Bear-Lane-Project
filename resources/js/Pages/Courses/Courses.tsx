"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Trophy, GraduationCap } from "lucide-react";
import { useCart } from "@/Context/CartContext";

const courses = [
  {
    id: 1,
    title: "TikTok Creator Rewards Programme",
    description: (
      <span>
        Includes 10+ hours of educational content, access to exclusive Discord community, 1-1 mentoring, 24/7 support and{" "}
        <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent font-semibold">
          guaranteed acceptance
        </span>{" "}
        into Creator Rewards Programme.
      </span>
    ),
    longDescription:
      "Our TikTok Creator Rewards Programme is designed for aspiring influencers who want to grow and monetize their accounts. With structured lessons, mentorship, and real community support, this course is the most complete way to unlock TikTok’s earning potential.",
    image: "/images/tiktok.jpeg",
    price: 299,
    features: [
      { icon: <Trophy className="w-5 h-5" />, text: "1 Year Access" },
      { icon: <Users className="w-5 h-5" />, text: "33 Students" },
      { icon: <Clock className="w-5 h-5" />, text: "Course Duration: 15 Hours" },
      { icon: <GraduationCap className="w-5 h-5" />, text: "30-Day Money Back Guarantee" },
    ],
    reviews: [
      { user: "Sarah", text: "This course got me into the program—worth every penny!", rating: 5 },
      { user: "Alex", text: "The mentoring was the best part.", rating: 4 },
    ],
  },
  {
    id: 2,
    title: "Digital Marketing Mastery",
    description:
      "Includes 12+ hours of content, live workshops, SEO & social media strategies, paid advertising guides, and a certificate of completion.",
    longDescription:
      "Digital Marketing Mastery equips you with the skills to dominate online marketing. Learn SEO, social media growth strategies, paid ads, and conversion optimization. Perfect for freelancers, entrepreneurs, and businesses wanting to scale.",
    image: "/images/marketing.jpeg",
    price: 249,
    features: [
      { icon: <Trophy className="w-5 h-5" />, text: "Lifetime Access" },
      { icon: <Users className="w-5 h-5" />, text: "120+ Students" },
      { icon: <Clock className="w-5 h-5" />, text: "Course Duration: 12 Hours" },
      { icon: <GraduationCap className="w-5 h-5" />, text: "30-Day Money Back Guarantee" },
    ],
    reviews: [
      { user: "Daniel", text: "Helped me land my first marketing client!", rating: 5 },
      { user: "Emma", text: "Great SEO section, very clear.", rating: 4 },
    ],
  },
  {
    id: 3,
    title: "Web Development Fundamentals",
    description:
      "Learn HTML, CSS, and JavaScript from scratch, with hands-on projects that allow you to build and launch your very own website by the end of the course.",
    longDescription:
      "This course takes you from absolute beginner to building and deploying your first website. We cover the essentials of HTML, CSS, and JavaScript with practical examples and a guided project that results in a portfolio-ready website.",
    image: "/images/webdev.jpeg",
    price: 199,
    features: [
      { icon: <Trophy className="w-5 h-5" />, text: "6 Months Access" },
      { icon: <Users className="w-5 h-5" />, text: "89 Students" },
      { icon: <Clock className="w-5 h-5" />, text: "Course Duration: 20 Hours" },
      { icon: <GraduationCap className="w-5 h-5" />, text: "30-Day Money Back Guarantee" },
    ],
    reviews: [
      { user: "Lucas", text: "I built my first website thanks to this course!", rating: 5 },
      { user: "Nina", text: "Super beginner-friendly.", rating: 5 },
    ],
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export default function Courses() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "reviews">("info");
  const { addToCart } = useCart();

  return (
    <section
      id="courses"  // 👈 anchor target for HeroSection button
      className="min-h-screen w-full py-24 px-6 backdrop-blur-sm"
    >
      <h1 className="text-5xl font-extrabold mb-16 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
        Courses
      </h1>

      <div className="flex flex-col gap-12 max-w-5xl mx-auto">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl"
            onMouseEnter={() => {
              setHoveredId(course.id);
              setActiveTab("info");
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Main Row */}
            <div className="flex flex-col md:flex-row items-stretch">
              <img
                src={course.image}
                alt={course.title}
                className="w-full md:w-1/3 h-56 object-cover md:rounded-l-2xl"
              />
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-3">{course.title}</h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                    {course.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {f.icon}
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drop-down Section */}
            <AnimatePresence>
              {hoveredId === course.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  {/* Tabs */}
                  <div className="flex justify-start border-b border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => setActiveTab("info")}
                      className={`px-6 py-3 font-medium transition ${
                        activeTab === "info"
                          ? "border-b-2 border-blue-500 text-blue-500"
                          : "text-gray-600 dark:text-gray-300 hover:text-blue-500"
                      }`}
                    >
                      INFO
                    </button>
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className={`px-6 py-3 font-medium transition ${
                        activeTab === "reviews"
                          ? "border-b-2 border-blue-500 text-blue-500"
                          : "text-gray-600 dark:text-gray-300 hover:text-blue-500"
                      }`}
                    >
                      REVIEWS
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === "info" ? (
                      <div>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{course.longDescription}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">£{course.price}</span>
                          <button
                            onClick={() =>
                              addToCart({
                                id: course.id,
                                title: course.title,
                                price: course.price,
                                image: course.image,
                              })
                            }
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:opacity-90 transition"
                          >
                            BUY NOW
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {course.reviews.map((r, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{r.user}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{r.text}</p>
                            <Stars rating={r.rating} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
