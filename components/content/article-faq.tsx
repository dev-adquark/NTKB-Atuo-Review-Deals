"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Markdown } from "@/components/content/markdown";

const MARKDOWN_CLASS =
  "prose-content text-sm text-muted [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_p+p]:mt-3";

export function ArticleFaq({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-surface">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-foreground">{item.question}</span>
              <span aria-hidden className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-45" : ""}`}>
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
                  <div className="px-5 pb-4">
                    <Markdown className={MARKDOWN_CLASS}>{item.answer}</Markdown>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
