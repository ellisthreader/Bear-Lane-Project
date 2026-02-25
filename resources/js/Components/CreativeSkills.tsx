"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useRef } from "react";
import { FaEye, FaUserFriends, FaHeart, FaDollarSign } from "react-icons/fa";

const stats = [
  { label: "Views", value: "1.2M", icon: FaEye, color: "text-blue-500" },
  { label: "Followers", value: "85K", icon: FaUserFriends, color: "text-green-500" },
  { label: "Likes", value: "340K", icon: FaHeart, color: "text-pink-500" },
  { label: "Revenue", value: "$25K", icon: FaDollarSign, color: "text-yellow-500" },
];

const skills = [
  {
    title: "Adobe Photoshop",
    image: "/images/Photoshop.png",
    glowClass:
      "shadow-[0_0_20px_#31A8FF,0_0_40px_#31A8FF,0_0_60px_#31A8FF,inset_0_0_15px_#31A8FF80]",
    experience: "8+ Years",
    description:
      "Expert in creating graphics, photo manipulation, and branding assets. Strong in compositing and advanced retouching.",
    rating: 5,
  },
  {
    title: "Adobe Premiere Pro",
    image: "/images/PremierePro.png",
    glowClass:
      "shadow-[0_0_20px_#7976DD,0_0_40px_#7976DD,0_0_60px_#7976DD,inset_0_0_15px_#7976DD80]",
    experience: "8+ Years",
    description:
      "Experienced video editor with strong storytelling skills. Skilled in YouTube, social media, and client video production.",
    rating: 4,
  },
  {
    title: "Adobe After Effects",
    image: "/images/AfterEffects.png",
    glowClass:
      "shadow-[0_0_20px_#B660E9,0_0_40px_#B660E9,0_0_60px_#B660E9,inset_0_0_15px_#B660E980]",
    experience: "2+ Years",
    description:
      "Growing skills in motion graphics and animation. Able to create intros, transitions, and simple VFX while developing expertise.",
    rating: 3,
  },
];

export default function CreativeSkills() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  return (
    <div className="w-full flex flex-col items-center relative py-20 gap-16">
      {/* Stats Section */}
      <div ref={containerRef} className="relative w-full max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            // Faster reveal ranges
            const start = index * 0.1;
            const end = start + 0.15;
            const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
            const y = useTransform(scrollYProgress, [start, end], [40, 0]);

            return (
              <motion.div
                key={index}
                style={{ opacity, y }}
                className="flex flex-col items-center bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md"
              >
                <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                <p className="text-xl font-semibold">{stat.value}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Skills Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl w-full">
        {skills.map((skill, index) => (
          <SkillCard key={index} skill={skill} index={index} />
        ))}
      </div>
    </div>
  );
}

function SkillCard({ skill, index }: { skill: any; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  const infoVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="relative w-full cursor-pointer flex flex-col"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      viewport={{ once: false, amount: 0.3 }} // 👈 triggers every scroll
      transition={{ duration: 0.5, delay: index * 0.15 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow */}
      <motion.div
        className={`absolute inset-0 rounded-2xl pointer-events-none z-0 ${skill.glowClass}`}
        animate={isHovered ? { opacity: [0.4, 1, 0.4] } : { opacity: 0 }}
        transition={
          isHovered
            ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      />

      {/* Card */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="relative w-full h-64 rounded-2xl overflow-hidden shadow-lg z-10"
      >
        <img
          src={skill.image}
          alt={skill.title}
          className="w-full h-full object-cover rounded-2xl"
        />

        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl"
        >
          <span className="text-white text-xl font-semibold tracking-wide">
            {skill.title}
          </span>
        </motion.div>
      </motion.div>

      {/* Info */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden bg-white dark:bg-gray-900 rounded-b-2xl shadow-md p-4 mt-2 text-sm text-gray-800 dark:text-gray-200"
          >
            <motion.p
              variants={infoVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.05, duration: 0.3 }}
              className="font-semibold"
            >
              {skill.title}
            </motion.p>
            <motion.p
              variants={infoVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-sm"
            >
              Experience: {skill.experience}
            </motion.p>
            <motion.p
              variants={infoVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.25, duration: 0.3 }}
              className="mt-1"
            >
              {skill.description}
            </motion.p>
            <motion.p
              variants={infoVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.35, duration: 0.3 }}
              className="mt-2 font-medium"
            >
              Skill Rating:{" "}
              <span className="text-yellow-400">
                {"⭐".repeat(skill.rating) + "☆".repeat(5 - skill.rating)}
              </span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
