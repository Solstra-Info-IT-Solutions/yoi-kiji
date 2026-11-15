CREATE TABLE "InventoryMovement" (
 "id" TEXT NOT NULL,
 "productId" TEXT NOT NULL,
 "variantId" TEXT,
 "quantityDelta" INTEGER NOT NULL,
 "reason" TEXT NOT NULL,
 "reference" TEXT,
 "createdBy" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId","createdAt");
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId","createdAt");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
