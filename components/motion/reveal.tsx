"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section";
}

/** Scroll-triggered fade/slide-up reveal, used throughout the marketing pages
 * (spec section 9). Fires once, and collapses to a plain opacity fade — no
 * translation — when the visitor has requested reduced motion. */
export function Reveal({ children, className, delay = 0, y = 24, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0.2 : 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const Component = as === "section" ? motion.section : motion.div;

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={variants}
    >
      {children}
    </Component>
  );
}
