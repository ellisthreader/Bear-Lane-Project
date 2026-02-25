"use client";

import React from "react";
import { useCart } from "@/Context/CartContext";

const products = [
  {
    id: 4,
    title: "Web Dev Fundamentals (Paperback)",
    description: "A beginner-friendly paperback covering HTML, CSS, and JavaScript basics.",
    details: [
      "Full paperback book",
      "Covers HTML, CSS, JS basics",
      "Great offline reference guide",
    ],
    image: "/images/webdev-book.jpeg",
    price: 15,
    oldPrice: 25,
  },
  {
    id: 5,
    title: "TikTok Creator Starter Pack",
    description:
      "Everything you need to start creating professional-quality TikToks and Reels.",
    details: [
      "Portable Ring Light",
      "Clip-on Microphone",
      "Adjustable Tripod / Phone Stand",
      "Content Idea Card Deck (100+ prompts)",
    ],
    image: "/images/tiktok-starter-pack.jpeg",
    price: 39.99,
    oldPrice: 70,
  },
  {
    id: 6,
    title: "Marketing Productivity Pack",
    description:
      "Organize, plan, and stay motivated while building your brand and campaigns.",
    details: [
      "Content Planning Whiteboard",
      "Goal-setting Journal",
      "Social Media Planner",
      "Motivational Desk Poster",
      "Stationery Pack",
    ],
    image: "/images/marketing-pack.jpeg",
    price: 9.99,
    oldPrice: 20,
  },
];

export default function Products() {
  const { addToCart } = useCart();

  return (
    <section
      id="products"
      className="min-h-screen py-24 px-6 backdrop-blur-sm scroll-mt-20"
    >
      <h2 className="text-4xl font-extrabold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500">
        Creator Tools & Merch
      </h2>

      <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {products.map((product) => {
          const savings = product.oldPrice
            ? (product.oldPrice - product.price).toFixed(2)
            : null;

          return (
            <div
              key={product.id}
              className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl"
            >
              {/* Image */}
              <div className="w-full flex items-center justify-center p-4">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-56 object-contain rounded-xl"
                />
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {product.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {product.description}
                  </p>

                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-400 space-y-1 mb-4">
                    {product.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                {/* Price + CTA */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xl font-bold text-blue-600">
                        £{product.price}
                      </span>
                      {product.oldPrice && (
                        <span className="ml-2 text-sm line-through text-gray-500">
                          £{product.oldPrice}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        addToCart({
                          id: product.id,
                          title: product.title,
                          price: product.price,
                          image: product.image,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white font-semibold hover:opacity-90 transition"
                    >
                      ADD TO CART
                    </button>
                  </div>
                  {savings && (
                    <p className="text-green-600 text-sm font-medium">
                      Save £{savings} today!
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
