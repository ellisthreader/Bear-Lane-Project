"use client";

import React, { useEffect, useState, useRef } from "react";
import { ShieldCheck, Lock, Users } from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";

// Animated number that counts up once in view
function AnimatedNumber({ target, duration = 1 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      controls.start({ value: target });
    }
  }, [inView, controls, target]);

  return (
    <motion.span
      ref={ref}
      initial={{ value: 0 }}
      animate={controls}
      transition={{ duration, ease: "easeOut" }}
      onUpdate={(latest) => setCount(Math.floor(latest.value))}
    >
      {count}
    </motion.span>
  );
}

export default function TrustSignals() {
  // fade + slide animation for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, duration: 0.6, ease: "easeOut" },
    }),
  };

  return (
    <section
      className="py-16 px-6 backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(219,234,254,0.05), rgba(236,72,153,0.05))",
      }}
    >
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12 text-center">
        {[
          {
            icon: <ShieldCheck className="w-10 h-10 mx-auto text-blue-500 mb-4" />,
            title: "30-Day Guarantee",
            text: "Full refund if you’re not satisfied.",
          },
          {
            icon: <Lock className="w-10 h-10 mx-auto text-purple-500 mb-4" />,
            title: "Secure Checkout",
            text: "Pay safely with Stripe & PayPal.",
          },
          {
            icon: <Users className="w-10 h-10 mx-auto text-pink-500 mb-4" />,
            title: (
              <>
                <AnimatedNumber target={1000} duration={1} />+ Students
              </>
            ),
            text: "Trusted by learners worldwide.",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={i}
          >
            {card.icon}
            <h3 className="font-semibold text-lg">{card.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{card.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
