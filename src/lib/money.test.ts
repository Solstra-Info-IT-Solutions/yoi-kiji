import { describe, expect, it } from "vitest";
import { calculateTaxInclusive, formatINR } from "./money";

describe("money utilities", () => {
  it("formats integer paise as INR", () => {
    expect(formatINR(123456)).toContain("1,234.56");
  });

  it("formats the largest safe paise value without losing the paise remainder", () => {
    const formatted = formatINR(Number.MAX_SAFE_INTEGER);
    expect(formatted).toContain("9,00,71,99,25,47,409");
    expect(formatted.endsWith(".91")).toBe(true);
  });

  it("extracts GST from a tax-inclusive amount using basis points", () => {
    expect(calculateTaxInclusive(11800, 1800)).toBe(1800);
  });

  it("rounds large tax calculations using exact integer arithmetic", () => {
    expect(calculateTaxInclusive(Number.MAX_SAFE_INTEGER, 10000)).toBe(4503599627370496);
  });

  it("rejects negative or fractional money values", () => {
    expect(() => formatINR(-1)).toThrow(RangeError);
    expect(() => formatINR(10.5)).toThrow(RangeError);
  });

  it("rejects invalid tax rates", () => {
    expect(() => calculateTaxInclusive(1000, 10001)).toThrow(RangeError);
  });
});
