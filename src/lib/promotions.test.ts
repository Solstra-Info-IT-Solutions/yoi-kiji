import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "./promotions";

describe("coupon discount calculation", () => {
  it("calculates a percentage discount from basis points", () => {
    expect(calculateCouponDiscount(10000, "PERCENTAGE", 1000, null)).toBe(1000);
  });

  it("caps percentage discounts at the configured maximum", () => {
    expect(calculateCouponDiscount(100000, "PERCENTAGE", 2500, 5000)).toBe(5000);
  });

  it("caps fixed discounts at the merchandise subtotal", () => {
    expect(calculateCouponDiscount(2500, "FIXED_AMOUNT", 5000, null)).toBe(2500);
  });

  it("uses exact arithmetic for large percentage discounts", () => {
    const subtotal = Number.MAX_SAFE_INTEGER;
    const expected = Number((BigInt(subtotal) * 9999n) / 10000n);
    expect(calculateCouponDiscount(subtotal, "PERCENTAGE", 9999, null)).toBe(expected);
  });

  it("rejects percentage values above 100 percent", () => {
    expect(() => calculateCouponDiscount(10000, "PERCENTAGE", 10001, null)).toThrow(RangeError);
  });

  it("rejects negative or fractional subtotals", () => {
    expect(() => calculateCouponDiscount(-1, "FIXED_AMOUNT", 100, null)).toThrow(RangeError);
    expect(() => calculateCouponDiscount(100.5, "FIXED_AMOUNT", 100, null)).toThrow(RangeError);
  });
});
