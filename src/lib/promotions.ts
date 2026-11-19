import { assertMinorUnits } from "./money";

export type CouponDiscount = "PERCENTAGE" | "FIXED_AMOUNT";

/** Calculates a coupon discount in paise. Percentage values are basis points (100 = 1%). */
export function calculateCouponDiscount(subtotalPaise: number, discountType: CouponDiscount, discountValue: number, maximumDiscountPaise: number | null): number {
  assertMinorUnits(subtotalPaise);
  if (!Number.isSafeInteger(discountValue) || discountValue <= 0) throw new RangeError("Discount value must be a positive safe integer.");
  if (discountType === "PERCENTAGE" && discountValue > 10000) throw new RangeError("Percentage discount cannot exceed 100%.");

  // Use integer arithmetic so large subtotals cannot lose paise to IEEE-754 rounding.
  let discount = discountType === "PERCENTAGE"
    ? Number((BigInt(subtotalPaise) * BigInt(discountValue)) / 10000n)
    : discountValue;

  if (maximumDiscountPaise !== null) {
    assertMinorUnits(maximumDiscountPaise);
    discount = Math.min(discount, maximumDiscountPaise);
  }
  return Math.min(discount, subtotalPaise);
}
