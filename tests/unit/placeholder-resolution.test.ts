import { describe, expect, it } from "vitest";
import { resolvePlaceholders } from "@/lib/affiliate/resolver";

describe("resolvePlaceholders", () => {
  it("substitutes known variables", () => {
    const { text, unresolved } = resolvePlaceholders("Visit {brand_name} for {region} deals.", {
      brand_name: "ExampleGuard",
      region: "US",
    });
    expect(text).toBe("Visit ExampleGuard for US deals.");
    expect(unresolved).toEqual([]);
  });

  it("leaves unknown placeholders untouched and reports them", () => {
    const { text, unresolved } = resolvePlaceholders('<a href="{brand_aff_url}">Buy</a>', { region: "US" });
    expect(text).toBe('<a href="{brand_aff_url}">Buy</a>');
    expect(unresolved).toEqual(["{brand_aff_url}"]);
  });

  it("never publishes a raw brand_aff_url placeholder once the URL is known", () => {
    const { text, unresolved } = resolvePlaceholders("{brand_aff_url}", { brand_aff_url: "https://affiliate.example/x" });
    expect(text).toBe("https://affiliate.example/x");
    expect(unresolved).toEqual([]);
  });
});
