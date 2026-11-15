ALTER TABLE "Payment" ADD COLUMN "refundId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundAmountPaise" INTEGER;
CREATE UNIQUE INDEX "Payment_refundId_key" ON "Payment"("refundId");
