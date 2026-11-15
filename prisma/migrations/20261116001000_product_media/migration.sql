ALTER TABLE "ProductVariant"
ADD COLUMN "swatchHex" TEXT;

ALTER TABLE "ProductImage"
ADD COLUMN "variantId" TEXT,
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProductImage_productId_variantId_position_idx"
ON "ProductImage"("productId", "variantId", "position");

CREATE INDEX "ProductImage_productId_isPrimary_idx"
ON "ProductImage"("productId", "isPrimary");

UPDATE "ProductImage" AS image
SET "isPrimary" = true
WHERE image."position" = (
  SELECT MIN(candidate."position")
  FROM "ProductImage" AS candidate
  WHERE candidate."productId" = image."productId"
    AND candidate."variantId" IS NULL
);
