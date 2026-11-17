CREATE TYPE "StockAlertStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TABLE "StockAlert" (
 "id" TEXT NOT NULL,
 "productId" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "status" "StockAlertStatus" NOT NULL DEFAULT 'PENDING',
 "providerId" TEXT,
 "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3),
 CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StockAlert_productId_email_key" ON "StockAlert"("productId","email");
CREATE INDEX "StockAlert_status_createdAt_idx" ON "StockAlert"("status","createdAt");
CREATE INDEX "StockAlert_productId_status_idx" ON "StockAlert"("productId","status");
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;