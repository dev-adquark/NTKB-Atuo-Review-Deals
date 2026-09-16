import { randomUUID } from "node:crypto";
import type { GenerationRequest, GeneratedContentResult, GeneratedContentSection } from "./types";
import type { RegionCode } from "@/app/generated/prisma/client";

const MOCK_NOTICE =
  "MOCK CONTENT — produced by the NTKB development mock provider, not the external Content Generation Engine. Never treat as production content.";

/**
 * Picks a variant using a keyword-derived base index plus a random offset.
 * The keyword-derived base spreads different keywords across different variants
 * (so two unrelated topics in the same region are unlikely to share phrasing),
 * while the random offset means regenerating the SAME keyword can still land on
 * a different variant — otherwise "Regenerate" would be pointless, since a
 * rejected page's retry would deterministically reproduce the exact same score.
 */
function pickVariant<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const jitter = Math.floor(Math.random() * items.length);
  return items[(hash + jitter) % items.length];
}

// Region-specific, substantially different prose (not just a swapped noun) so the
// same keyword generated for four different regions doesn't produce near-duplicate
// boilerplate — a real content engine's per-region output would differ this much
// too, and the uniqueness gate (lib/validation/uniqueness.ts) correctly rejects
// near-duplicate cross-region pages otherwise.
//
// Each field is a small pool of interchangeable phrasings, picked randomly per
// call. Without this, two generations of the same keyword+region would be
// byte-identical (aside from requestId) — the uniqueness gate would correctly
// treat that as a duplicate, and "Regenerate" would be pointless, since a
// rejected page's retry would always fail with the exact same score. A real
// content engine's output naturally varies call-to-call even for the same input.
const REGION_VOICE: Record<
  RegionCode,
  { overview: string[]; features: string[]; whoFor: string[]; considerations: string[]; buyerNote: string }
> = {
  US: {
    overview: [
      "Most US buyers start by comparing free-trial length and how quickly a support ticket gets a human reply, since return windows here are typically short.",
      "US shoppers usually narrow the field first by checking return policy length and whether support is reachable by phone, not just chat.",
      "In the US market, buyers tend to filter options by trial length and support responsiveness before comparing anything else.",
    ],
    features: [
      "Look for tight integration with common US payment rails and retailer loyalty programs before anything else.",
      "US buyers should prioritize compatibility with familiar payment methods and any retailer loyalty perks on offer.",
      "Check first for smooth support of mainstream US payment options and loyalty-program tie-ins.",
    ],
    whoFor: [
      "A good match for US households that want a set-it-and-forget-it option backed by responsive phone or chat support.",
      "Well suited to US buyers who'd rather pay for reliable, easy-to-reach support than tinker with settings themselves.",
      "Fits US households looking for something low-maintenance with support they can actually reach when needed.",
    ],
    considerations: [
      "sales-tax display at checkout, US business-hours support coverage, and standard 3-5 day shipping",
      "how sales tax is shown at checkout, US-hours support availability, and typical 3-5 day shipping",
      "checkout sales-tax handling, US business-hours support, and standard shipping timelines",
    ],
    buyerNote: "US shoppers tend to weigh customer support hours and return policies heavily",
  },
  EU: {
    overview: [
      "Shoppers across the EU generally care most about where their data is stored and whether pricing already includes VAT, since cross-border rules vary by country.",
      "In the EU, buyers typically check data-residency terms and VAT-inclusive pricing before anything else, since rules differ by member state.",
      "EU shoppers commonly start by confirming where data is processed and whether the listed price already includes VAT.",
    ],
    features: [
      "Prioritize GDPR-aligned data handling and clear multi-currency pricing across EU member states.",
      "Look for explicit GDPR compliance and pricing that's clearly shown per currency across the EU.",
      "GDPR-aligned handling and transparent multi-currency pricing should be the first things EU buyers check.",
    ],
    whoFor: [
      "Well suited to EU buyers who want strong data-protection standards and straightforward cross-border returns.",
      "A good fit for EU households that prioritize data-protection standards and simple cross-border return rights.",
      "Fits EU buyers who care about data-protection standards as much as the product itself.",
    ],
    considerations: [
      "VAT-inclusive pricing, EU consumer-protection return rights, and delivery times that vary by member state",
      "whether pricing already includes VAT, your EU return rights, and delivery times that differ by country",
      "VAT display, cross-border return protections, and shipping times that vary across EU member states",
    ],
    buyerNote: "EU shoppers often prioritize data residency and cross-border return rights",
  },
  AU: {
    overview: [
      "In Australia, delivery distance from overseas warehouses and local warranty backing usually matter more to buyers than the sticker price alone.",
      "AU buyers often weigh shipping distance and local warranty support more heavily than the upfront price.",
      "For Australian shoppers, warranty backing and realistic delivery timeframes tend to matter more than price alone.",
    ],
    features: [
      "Check for local warehousing and compatibility with the payment providers most AU retailers already use.",
      "AU buyers should look for local stock and support for the payment providers common at Australian retailers.",
      "Local warehousing and familiar AU payment provider support are worth checking before anything else.",
    ],
    whoFor: [
      "Best for AU buyers who'd rather pay slightly more for a locally backed warranty than chase the cheapest import.",
      "Well suited to Australian households that value a locally backed warranty over chasing the lowest import price.",
      "A good fit for AU buyers prioritizing local warranty support over squeezing out the lowest price.",
    ],
    considerations: [
      "GST-inclusive pricing, AU-backed warranty terms, and realistic delivery windows from overseas stock",
      "whether GST is included, how the AU warranty is backed, and realistic delivery windows from overseas",
      "GST-inclusive pricing, local warranty backing, and shipping times from overseas warehouses",
    ],
    buyerNote: "AU shoppers frequently factor in shipping distance and local warranty coverage",
  },
  IN: {
    overview: [
      "Buyers in India typically compare EMI/installment options and whether support is available in a regional language before anything else.",
      "In India, shoppers often check EMI availability and regional-language support before comparing anything else.",
      "Indian buyers commonly start with EMI options and language support before looking at other factors.",
    ],
    features: [
      "Support for popular Indian payment methods and cash-on-delivery availability often decides the shortlist here.",
      "Indian buyers should check for common local payment methods and cash-on-delivery support early on.",
      "Local payment method coverage and cash-on-delivery availability are usually the deciding factors here.",
    ],
    whoFor: [
      "A strong fit for shoppers in India who value flexible payment options and local-language customer support.",
      "Well suited to Indian buyers who want flexible payment plans and support in their preferred language.",
      "Fits shoppers in India looking for flexible payment options paired with local-language support.",
    ],
    considerations: [
      "GST-inclusive pricing, cash-on-delivery availability, and India-based support channels",
      "whether GST is included, cash-on-delivery options, and support channels based in India",
      "GST-inclusive pricing, COD availability, and how easy it is to reach India-based support",
    ],
    buyerNote: "shoppers in India often compare EMI options and local customer support availability",
  },
};

/**
 * Development-only stand-in for the external Content Generation Engine, used when
 * CONTENT_ENGINE_MOCK_MODE=true. Output is deliberately generic and clearly labeled
 * so it can never be mistaken for real generated content (spec section 89/125).
 */
export function generateMockContent(request: GenerationRequest): GeneratedContentResult {
  const subject = request.brand ?? request.keyword;
  const requestId = `mock-${randomUUID()}`;
  const voice = REGION_VOICE[request.region];
  const keySeed = request.keyword.toLowerCase();
  const overview = pickVariant(voice.overview, `${keySeed}:overview`);
  const features = pickVariant(voice.features, `${keySeed}:features`);
  const whoFor = pickVariant(voice.whoFor, `${keySeed}:whofor`);
  const considerations = pickVariant(voice.considerations, `${keySeed}:considerations`);

  const intro = `${subject} is one of the options shoppers in ${request.region} consider for "${request.keyword}". ${overview}`;

  // Each sentence leads with the keyword/subject (a short, topic-specific clause,
  // so two different topics in the same region don't collide on shared boilerplate)
  // and then a region-flavored clause (so the same topic across regions still
  // reads differently) — see REGION_VOICE comment above. Kept short deliberately:
  // a long shared connector sentence would dwarf the keyword's contribution to the
  // token set that the uniqueness check compares.
  const sections: GeneratedContentSection[] = [
    {
      heading: "Overview",
      level: 2,
      content: `Looking into "${request.keyword}"? ${overview}`,
    },
    {
      heading: "Key Features",
      level: 2,
      content: `For "${request.keyword}", ${features}`,
    },
    {
      heading: "Who It's For",
      level: 2,
      content: `${capitalize(request.keyword)}: ${whoFor}`,
    },
    {
      heading: "Regional Considerations",
      level: 2,
      content: `In ${request.region}, pay attention to ${considerations} when comparing ${request.keyword} options — these can meaningfully change the total cost and experience.`,
    },
  ];

  const faq = request.configuration?.includeFaq
    ? [
        {
          question: `Is ${subject} available in ${request.region}?`,
          answer: `Availability can change in ${request.region}; check the current listing before purchasing.`,
        },
        {
          question: `What should ${request.region} shoppers compare first?`,
          answer: `${voice.buyerNote}. From there, compare total cost including ${considerations}.`,
        },
      ]
    : undefined;

  const pros = request.configuration?.includeProsCons
    ? ["Straightforward setup", "Broad feature coverage", "Responsive support"]
    : undefined;
  const cons = request.configuration?.includeProsCons
    ? [`Pricing varies within ${request.region}`, "Not every plan fits every use case"]
    : undefined;

  const comparison = request.configuration?.includeComparison
    ? [{ name: subject, summary: `See the sections above for a ${request.region}-specific breakdown.` }]
    : undefined;

  return {
    requestId,
    title: request.brand ? `${request.brand} Review (${request.region})` : `${capitalize(request.keyword)} — ${request.region} Guide`,
    slugSuggestion: undefined,
    metaDescription: `An overview of ${subject} for shoppers in ${request.region} researching ${request.keyword}.`,
    primaryKeyword: request.keyword,
    content: {
      intro,
      sections,
      pros,
      cons,
      comparison,
      faq,
      conclusion: `Check the current offer before purchasing from ${request.region}, since pricing and availability change.`,
    },
    seo: {
      title: request.brand ? `${request.brand} Review (${request.region})` : `${capitalize(request.keyword)} — ${request.region} Guide`,
      description: `An overview of ${subject} for shoppers in ${request.region} researching ${request.keyword}.`,
      keywords: [request.keyword],
    },
    coverageNotes: [MOCK_NOTICE],
    qualityStatus: "pass",
    qualityScore: 100,
    mock: true,
  };
}

function capitalize(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
