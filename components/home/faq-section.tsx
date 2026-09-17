import { SectionHeading } from "./section-heading";
import { FaqAccordion } from "./faq-accordion";

export function FaqSection() {
  return (
    <section id="faq" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <FaqAccordion />
      </div>
    </section>
  );
}
