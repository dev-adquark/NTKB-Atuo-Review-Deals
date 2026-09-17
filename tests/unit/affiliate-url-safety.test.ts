import { describe, expect, it } from "vitest";
import { isRealAffiliateDestination } from "@/lib/affiliate/url-safety";

describe("isRealAffiliateDestination", () => {
  it("rejects the reserved .example domain used by this project's own demo seed data", () => {
    expect(isRealAffiliateDestination("https://affiliate.example/pulsegear?region=US")).toBe(false);
  });

  it("rejects example.com/.org/.net/.edu", () => {
    expect(isRealAffiliateDestination("https://example.com/x")).toBe(false);
    expect(isRealAffiliateDestination("https://shop.example.org/x")).toBe(false);
    expect(isRealAffiliateDestination("https://example.net")).toBe(false);
  });

  it("rejects localhost and loopback addresses", () => {
    expect(isRealAffiliateDestination("http://localhost:3000/x")).toBe(false);
    expect(isRealAffiliateDestination("http://127.0.0.1/x")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isRealAffiliateDestination("javascript:alert(1)")).toBe(false);
    expect(isRealAffiliateDestination("data:text/html,hi")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isRealAffiliateDestination("not a url")).toBe(false);
    expect(isRealAffiliateDestination("")).toBe(false);
  });

  it("accepts a real-looking https destination", () => {
    expect(isRealAffiliateDestination("https://shop.real-brand.com/product/123?ref=ntkb")).toBe(true);
  });

  it("does not false-positive on a domain that merely contains the word example mid-string", () => {
    expect(isRealAffiliateDestination("https://exampleindustries.com/x")).toBe(true);
  });
});
