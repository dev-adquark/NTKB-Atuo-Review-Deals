import { Reveal } from "@/components/motion/reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <Reveal className={`mx-auto flex max-w-2xl flex-col ${alignment} ${align === "center" ? "" : "mx-0"}`}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p> : null}
      <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base text-muted">{description}</p> : null}
    </Reveal>
  );
}
