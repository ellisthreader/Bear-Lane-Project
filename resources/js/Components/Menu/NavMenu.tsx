"use client";

import React, { useState } from "react";
import { useDarkMode } from "@/Context/DarkModeContext";
import { useCart } from "@/Context/CartContext";
import { Link } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { DarkModeSwitch } from "react-toggle-dark-mode";
import { ShoppingCart, Search, User, Heart } from "lucide-react";

// SIDEBAR COMPONENTS
import WomenSidebar from "@/Components/Menu/WomenSidebar/WomenSidebar";
import MenSidebar from "@/Components/Menu/MenSidebar/MenSidebar";
import KidsSidebar from "@/Components/Menu/KidsSidebar/KidsSidebar";
import SaleSidebar from "@/Components/Menu/SaleSidebar/SaleSidebar";

export default function NavMenu() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { toggleCart } = useCart();

  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [logoGlow, setLogoGlow] = useState(false);

  const categories = ["Women", "Men", "Kids", "Sale"];

  const sidebarVariants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  const renderSidebar = () => {
    switch (activeSidebar?.toLowerCase()) {
      case "women":
        return <WomenSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "men":
        return <MenSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "kids":
        return <KidsSidebar closeSidebar={() => setActiveSidebar(null)} />;
      case "sale":
        return <SaleSidebar closeSidebar={() => setActiveSidebar(null)} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="relative"
      onMouseLeave={() => setActiveSidebar(null)} // CLOSE ONLY when leaving entire area
    >
      <motion.nav
        className="
          relative z-30 w-full
          bg-white dark:bg-gray-900
          backdrop-blur-xl
          flex items-center
          pl-3 pr-10 py-4
          border-b border-gray-200 dark:border-gray-700
        "
      >
        {/* LEFT */}
        <div className="flex items-center gap-1">
          {/* LOGO */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setLogoGlow(true);
              setTimeout(() => setLogoGlow(false), 600);
            }}
            className="flex items-center"
          >
            <div
              className={`
                relative h-[50px] w-[220px]
                transition-all duration-300
                ${logoGlow ? "logo-neon-glow" : ""}
              `}
            >
              <img
                src="/images/BLText.png"
                alt="Bear Lane"
                className="w-full h-full object-contain select-none"
              />
            </div>
          </Link>

          {/* NAV LINKS */}
          <div
            className="
              flex items-center gap-12
              text-[17px] uppercase tracking-wide
              text-black dark:text-gray-200
            "
          >
            {categories.map((cat) => (
              <div
                key={cat}
                onMouseEnter={() => setActiveSidebar(cat)} // OPEN on hover
                className="
                  cursor-pointer px-4 py-2
                  transition-all duration-300
                  hover:text-[#D4AF37]
                  relative
                  after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0
                  after:w-0 after:h-[2px]
                  after:bg-[#D4AF37]
                  after:transition-all after:duration-300
                  hover:after:w-full
                "
              >
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="ml-auto flex items-center gap-6">
          <Search className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          <Heart className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          <Link href="/profile">
            <User className="w-5 h-5 cursor-pointer hover:text-[#D4AF37] transition" />
          </Link>
          <div
            onClick={toggleCart}
            className="cursor-pointer hover:text-[#D4AF37] transition"
          >
            <ShoppingCart className="w-5 h-5" />
          </div>
          <DarkModeSwitch
            checked={darkMode}
            onChange={toggleDarkMode}
            size={20}
          />
        </div>
      </motion.nav>

      {/* SIDEBAR */}
      <AnimatePresence>
        {activeSidebar && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute top-full left-0 w-full h-screen bg-black z-20"
            />

            {/* SIDEBAR PANEL */}
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="
                absolute top-full left-0
                w-[35%] h-screen
                bg-white dark:bg-gray-900
                shadow-2xl z-30
                p-7 overflow-y-auto
              "
            >
              {renderSidebar()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
