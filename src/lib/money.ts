const MAX_SAFE_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export function assertMinorUnits(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SAFE_MINOR_UNITS) {
    throw new RangeError("Money must be a non-negative safe integer in minor units.");
  }
  return value;
}

export function formatINR(paise: number): string {
  assertMinorUnits(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function calculateTaxInclusive(amountPaise: number, rateBps: number): number {
  assertMinorUnits(amountPaise);
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new RangeError("Tax rate must be an integer between 0 and 10000 basis points.");
  }
  return Math.round((amountPaise * rateBps) / (10000 + rateBps));
}
