"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const FAQS = [
  {
    q: "How does NTKB choose which products to review?",
    a: "Reviews are generated from keyword and brand configurations set by our editorial team, then validated for required content, uniqueness, and factual claims before anything is published.",
  },
  {
    q: "Are the deals and prices on NTKB real?",
    a: "We never fabricate prices, discounts, or availability. Where a verified affiliate offer exists we link to it directly; otherwise we tell you to check the current price before purchasing.",
  },
  {
    q: "Does NTKB earn money from the links on this site?",
    a: "Yes — some links are affiliate links, and we may earn a commission if you purchase through them. This never changes which brands we cover or what a review says. See our affiliate disclosure for details.",
  },
  {
    q: "Why do recommendations differ by region?",
    a: "Availability, pricing, warranty terms, and shipping realities differ meaningfully between the US and Europe, so each region gets its own affiliate mappings and region-specific guidance rather than a one-size-fits-all list.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-10 max-w-2xl divide-y divide-border-default overflow-hidden rounded-3xl border border-border-default bg-surface">
      {FAQS.map((faq, i) => {
        const open = openIndex === i;
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-medium text-foreground">{faq.q}</span>
              <span
                aria-hidden
                className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm text-muted">{faq.a}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
