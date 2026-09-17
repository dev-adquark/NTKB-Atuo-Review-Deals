import { SectionHeading } from "./section-heading";
import { RegionCard } from "./region-card";

interface RegionData {
  id: string;
  code: string;
  name: string;
  urlPrefix: string;
}

export function RegionalDiscovery({ regions }: { regions: RegionData[] }) {
  return (
    <section id="regions" className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading
        eyebrow="Regional"
        title="Built for how each region actually shops"
        description="Affiliate offers, pricing, and guidance are mapped per region — not translated from a single US-centric list."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {regions.map((region) => (
          <RegionCard key={region.id} code={region.code} name={region.name} href={`/${region.urlPrefix}`} />
        ))}
      </div>
    </section>
  );
}
