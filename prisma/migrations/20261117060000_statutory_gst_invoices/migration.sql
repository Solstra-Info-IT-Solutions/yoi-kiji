-- Create immutable statutory invoice snapshots and transactional FY numbering.
CREATE TABLE "TaxInvoice" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "financialYear" TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sellerSnapshot" JSONB NOT NULL,
  "buyerSnapshot" JSONB NOT NULL,
  "lineItems" JSONB NOT NULL,
  "taxablePaise" INTEGER NOT NULL,
  "taxPaise" INTEGER NOT NULL,
  "shippingPaise" INTEGER NOT NULL,
  "discountPaise" INTEGER NOT NULL,
  "totalPaise" INTEGER NOT NULL,
  "placeOfSupplyCode" TEXT NOT NULL,
  "taxType" TEXT NOT NULL,
  CONSTRAINT "TaxInvoice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InvoiceSequence" (
  "financialYear" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("financialYear")
);
CREATE UNIQUE INDEX "TaxInvoice_orderId_key" ON "TaxInvoice"("orderId");
CREATE UNIQUE INDEX "TaxInvoice_invoiceNumber_key" ON "TaxInvoice"("invoiceNumber");
CREATE INDEX "TaxInvoice_financialYear_sequenceNumber_idx" ON "TaxInvoice"("financialYear", "sequenceNumber");
ALTER TABLE "TaxInvoice" ADD CONSTRAINT "TaxInvoice_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
