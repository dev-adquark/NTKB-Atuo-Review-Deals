import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/seo/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Best Password Managers")).toBe("best-password-managers");
  });
  it("strips accents", () => {
    expect(slugify("Café Déals")).toBe("cafe-deals");
  });
  it("collapses non-alphanumeric runs and trims edges", () => {
    expect(slugify("  Hello, World!! ")).toBe("hello-world");
  });
});
