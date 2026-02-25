"use client";

import React from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import GuestLayout from "@/Layouts/GuestLayout";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

type User = {
  id: number;
  name: string;
  email: string;
};

type PageProps = {
  auth: {
    user?: User;
  };
};

export default function Company() {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const Layout = user ? AuthenticatedLayout : GuestLayout;

  const handleGoBack = () => window.history.back();

  /* Framer Motion variants (Option A: Elegant & Minimal) */
  const pageVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { when: "beforeChildren", staggerChildren: 0.12, duration: 0.6 },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
  };

  const subtleFloat = {
    visible: {
      y: [0, -6, 0],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] },
    }),
  };

  return (
    <Layout>
      <Head title="Company" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageVariants}
        className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900
                   text-black dark:text-gray-100 transition-colors duration-500"
      >
        {/* HEADER SECTION */}
        <div className="relative w-full px-6 pt-40 pb-10">
          {/* Back Button */}
          <motion.button
            onClick={handleGoBack}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute left-11 top-24 inline-flex items-center gap-2
              text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
              border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-xl
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </motion.button>

          {/* Title + subtitle container */}
          <motion.div
            className="mx-auto max-w-4xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {},
            }}
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-extrabold tracking-wide text-center
                         bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-200 dark:to-gray-400
                         bg-clip-text text-transparent"
            >
              About Our Company
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-center text-gray-500 dark:text-gray-400 mt-4 text-lg max-w-2xl mx-auto"
            >
              A modern house of luxury — redefining designer fashion for the digital era.
            </motion.p>
          </motion.div>
        </div>

        {/* CONTENT SECTION */}
        <div className="px-8 pb-24 max-w-4xl mx-auto space-y-12">
          {/* Decorative subtle floating shimmer behind cards (very subtle) */}
          <motion.div
            variants={subtleFloat}
            animate="visible"
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ mixBlendMode: "overlay", opacity: 0.03 }}
          />

          {/* Card 1 - Who we are */}
          <motion.section
            custom={0}
            variants={cardVariants}
            className="bg-white dark:bg-gray-800/60 backdrop-blur-md shadow-2xl rounded-2xl p-10
                       border border-gray-200 dark:border-gray-700"
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-semibold mb-4">
              Who We Are
            </motion.h2>

            <motion.p variants={fadeUp} className="text-lg leading-8 text-gray-700 dark:text-gray-300">
              We are a luxury fashion house dedicated to curating the world’s finest designer
              clothing, handbags, coats, accessories, and footwear. Each collection is selected
              with uncompromising taste — where craftsmanship, heritage, and contemporary vision meet.
              <br />
              <br />
              Our mission is to elevate the modern wardrobe with pieces that last — in style and in quality —
              designed for people who value artistry, provenance, and exceptional detail.
            </motion.p>
          </motion.section>

          {/* Card 2 - Our promise */}
          <motion.section
            custom={1}
            variants={cardVariants}
            className="bg-white dark:bg-gray-800/60 backdrop-blur-md shadow-2xl rounded-2xl p-10
                       border border-gray-200 dark:border-gray-700"
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-semibold mb-4">
              Our Promise
            </motion.h2>

            <motion.p variants={fadeUp} className="text-lg leading-8 text-gray-700 dark:text-gray-300">
              Every piece we offer embodies excellence. From the hand-finished stitching on a signature coat
              to the artisanship of a leather handbag, we collaborate with designers and ateliers who share
              our standards for authenticity and longevity.
              <br />
              <br />
              We guarantee genuine products, transparent sourcing, and an elevated customer experience that reflects the
              prestige of the collections we present.
            </motion.p>
          </motion.section>

          {/* Card 3 - Sustainability */}
          <motion.section
            custom={2}
            variants={cardVariants}
            className="bg-white dark:bg-gray-800/60 backdrop-blur-md shadow-2xl rounded-2xl p-10
                       border border-gray-200 dark:border-gray-700"
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-semibold mb-4">
              Sustainability
            </motion.h2>

            <motion.p variants={fadeUp} className="text-lg leading-8 text-gray-700 dark:text-gray-300">
              Luxury should be responsible. We partner with designers who prioritize ethical production,
              durable materials, and measured craftsmanship. By celebrating slow fashion and repairability,
              we aim to reduce waste while preserving the beauty and integrity of the pieces we curate.
              <br />
              <br />
              Practical initiatives include recyclable packaging, supply-chain transparency, and partnerships
              with vetted, conscientious manufacturers.
            </motion.p>
          </motion.section>

          {/* Card 4 - Vision */}
          <motion.section
            custom={3}
            variants={cardVariants}
            className="bg-white dark:bg-gray-800/60 backdrop-blur-md shadow-2xl rounded-2xl p-10
                       border border-gray-200 dark:border-gray-700"
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-semibold mb-4">
              Our Vision
            </motion.h2>

            <motion.p variants={fadeUp} className="text-lg leading-8 text-gray-700 dark:text-gray-300">
              To be the definitive destination for modern designer fashion — where innovation meets refinement.
              We build an immersive and personal shopping experience that connects customers with exceptional
              brands and timeless design, empowering self-expression through thoughtful curation.
            </motion.p>
          </motion.section>
        </div>
      </motion.div>
    </Layout>
  );
}
