"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const LAYERS = [
  { key: "comfort", label: "Comfort Layer", blurb: "The top layer that cradles pressure points on first contact.", color: "from-glow-a/70 to-glow-a/30" },
  { key: "cooling", label: "Cooling Layer", blurb: "Helps pull heat away so the surface sleeps cooler through the night.", color: "from-glow-b/70 to-glow-b/30" },
  { key: "support", label: "Support Core", blurb: "Keeps the spine aligned and stops the middle from sagging over time.", color: "from-glow-c/70 to-glow-c/30" },
  { key: "base", label: "Base Foundation", blurb: "A dense bottom layer that anchors every layer above it.", color: "from-primary/60 to-primary/20" },
] as const;

/**
 * A CSS/SVG-built layered mattress cross-section (no product photography or
 * WebGL) — angled with a perspective transform for a pseudo-3D feel, and
 * interactive: hovering/tapping a layer reveals what it does (spec section 30).
 */
export function MattressVisual() {
  const [activeLayer, setActiveLayer] = useState<(typeof LAYERS)[number]["key"] | null>(null);
  const reduce = useReducedMotion();
  const active = LAYERS.find((l) => l.key === activeLayer);

  return (
    <div className="relative mx-auto w-full max-w-md select-none" style={{ perspective: 1400 }}>
      <motion.div
        initial={reduce ? undefined : { opacity: 0, rotateX: 18, y: 30 }}
        animate={{ opacity: 1, rotateX: 10, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as const }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div className="space-y-1.5 rounded-[28px] bg-surface-raised/60 p-3 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border-default backdrop-blur-sm">
          {LAYERS.map((layer) => (
            <button
              key={layer.key}
              type="button"
              onMouseEnter={() => setActiveLayer(layer.key)}
              onFocus={() => setActiveLayer(layer.key)}
              onMouseLeave={() => setActiveLayer(null)}
              onBlur={() => setActiveLayer(null)}
              onClick={() => setActiveLayer((cur) => (cur === layer.key ? null : layer.key))}
              className={`group relative block w-full rounded-2xl bg-gradient-to-br ${layer.color} px-5 py-4 text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              style={{ transform: activeLayer === layer.key ? "translateZ(20px)" : undefined }}
            >
              <span className="text-sm font-medium text-white drop-shadow-sm">{layer.label}</span>
            </button>
          ))}
        </div>

        {/* Floating info badges around the composition (spec sections 5, 31) */}
        <FloatingBadge className="-left-8 top-2 sm:-left-14" delay={0.15}>
          4.8 ★ Rated
        </FloatingBadge>
        <FloatingBadge className="-right-6 top-14 sm:-right-12" delay={0.3}>
          Hybrid · Cooling
        </FloatingBadge>
        <FloatingBadge className="-left-6 bottom-16 sm:-left-16" delay={0.45}>
          Best Value
        </FloatingBadge>
        <FloatingBadge className="-right-4 bottom-2 sm:-right-10" delay={0.6}>
          Deal Available
        </FloatingBadge>
      </motion.div>

      <div className="mt-6 min-h-[3.5rem] px-2 text-center text-sm text-muted transition-opacity duration-200" aria-live="polite">
        {active ? (
          <>
            <span className="font-medium text-foreground">{active.label}:</span> {active.blurb}
          </>
        ) : (
          "Hover or tap a layer to see what it does."
        )}
      </div>
    </div>
  );
}

function FloatingBadge({ children, className, delay }: { children: React.ReactNode; className: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1, y: reduce ? 0 : [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 4.5, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute z-10 hidden rounded-full border border-border-default bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-md sm:block ${className}`}
    >
      {children}
    </motion.div>
  );
}
