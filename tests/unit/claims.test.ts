import { describe, expect, it } from "vitest";
import { scanForProhibitedClaims } from "@/lib/validation/claims";

describe("scanForProhibitedClaims", () => {
  it("flags guarantee language", () => {
    const flags = scanForProhibitedClaims("This product is guaranteed to work.");
    expect(flags.some((f) => f.label === "guarantee claim")).toBe(true);
  });

  it("flags unverified price figures", () => {
    const flags = scanForProhibitedClaims("It costs $49.99 per month.");
    expect(flags.some((f) => f.label === "unverified price figure")).toBe(true);
  });

  it("flags unverified discount percentages", () => {
    const flags = scanForProhibitedClaims("Save 50% off today only.");
    expect(flags.some((f) => f.label === "unverified discount percentage")).toBe(true);
  });

  it("flags ranking superlatives", () => {
    const flags = scanForProhibitedClaims("This is the #1 password manager.");
    expect(flags.some((f) => f.label === "unverified ranking/superlative claim")).toBe(true);
  });

  it("flags medical cure claims", () => {
    const flags = scanForProhibitedClaims("Clinically proven to cure headaches.");
    expect(flags.some((f) => f.label === "medical cure claim")).toBe(true);
    expect(flags.some((f) => f.label === "unverified clinical claim")).toBe(true);
  });

  it("returns no flags for safe, neutral copy", () => {
    const flags = scanForProhibitedClaims("Check the current price before purchasing.");
    expect(flags).toHaveLength(0);
  });
});
