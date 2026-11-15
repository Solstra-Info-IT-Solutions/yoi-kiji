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

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "productId", "variantId"
    ORDER BY "position" ASC, "id" ASC
  ) AS rank
  FROM "ProductImage"
)
UPDATE "ProductImage" AS image
SET "isPrimary" = true
FROM ranked
WHERE ranked."id" = image."id" AND ranked.rank = 1;
