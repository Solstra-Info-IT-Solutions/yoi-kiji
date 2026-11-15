-- Dynamic catalog foundation: nested taxonomy, product types and typed attributes.
CREATE TYPE "ProductAttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE');

ALTER TABLE "Category"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Category_parentId_sortOrder_isActive_idx" ON "Category"("parentId", "sortOrder", "isActive");
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProductType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

CREATE TABLE "AttributeDefinition" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "type" "ProductAttributeType" NOT NULL,
  "description" TEXT,
  "unit" TEXT,
  "options" JSONB,
  "isFilterable" BOOLEAN NOT NULL DEFAULT false,
  "isVariantAxis" BOOLEAN NOT NULL DEFAULT false,
  "isLocalized" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttributeDefinition_key_key" ON "AttributeDefinition"("key");

ALTER TABLE "Product" ADD COLUMN "productTypeId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey"
  FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductTypeAttribute" (
  "id" TEXT NOT NULL,
  "productTypeId" TEXT NOT NULL,
  "attributeId" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "isFilterable" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductTypeAttribute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductTypeAttribute_productTypeId_attributeId_key" ON "ProductTypeAttribute"("productTypeId", "attributeId");
CREATE INDEX "ProductTypeAttribute_productTypeId_sortOrder_idx" ON "ProductTypeAttribute"("productTypeId", "sortOrder");
ALTER TABLE "ProductTypeAttribute" ADD CONSTRAINT "ProductTypeAttribute_productTypeId_fkey"
  FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTypeAttribute" ADD CONSTRAINT "ProductTypeAttribute_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProductAttributeValue" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "attributeId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "ProductAttributeValue"("productId", "attributeId");
CREATE INDEX "ProductAttributeValue_attributeId_idx" ON "ProductAttributeValue"("attributeId");
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProductCategory" (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
);
CREATE INDEX "ProductCategory_categoryId_sortOrder_idx" ON "ProductCategory"("categoryId", "sortOrder");
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
