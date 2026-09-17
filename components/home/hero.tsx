"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MattressVisual } from "./mattress-visual";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Ambient background depth — gradients only, never competes with content (spec section 32) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-glow-a/25 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-glow-b/20 blur-[110px]" />
        <div className="absolute -left-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-glow-c/15 blur-[110px]" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-16 sm:pt-24 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-28">
        <motion.div
          initial={reduce ? undefined : "hidden"}
          animate="visible"
          variants={container}
          className="text-center lg:text-left"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur-sm"
          >
            Independent mattress reviews for US · EU · AU · IN
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 font-display text-[2.75rem] leading-[1.05] font-medium tracking-tight text-foreground sm:text-6xl lg:text-[3.75rem]"
          >
            Discover Better Sleep.
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-lg text-lg text-muted lg:mx-0">
            Compare mattresses, explore trusted reviews, and find the right deal for your region — backed by clear
            affiliate disclosure, never fabricated claims.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="#discover"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-10px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-0.5"
            >
              Explore Mattress Reviews
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              href="#compare"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised"
            >
              Compare Mattresses
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduce ? undefined : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <MattressVisual />
        </motion.div>
      </div>
    </section>
  );
}
