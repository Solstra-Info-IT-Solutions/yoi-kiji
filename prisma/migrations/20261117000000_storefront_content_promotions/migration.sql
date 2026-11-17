CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;

CREATE TABLE "HomepageSection" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "eyebrow" TEXT,
  "title" TEXT,
  "body" TEXT,
  "imageUrl" TEXT,
  "imageAlt" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_isActive_position_idx" ON "HomepageSection"("isActive", "position");

CREATE TABLE "StoreCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreCollection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreCollection_slug_key" ON "StoreCollection"("slug");
CREATE INDEX "StoreCollection_isActive_sortOrder_idx" ON "StoreCollection"("isActive", "sortOrder");

CREATE TABLE "StoreCollectionProduct" (
  "collectionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StoreCollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId")
);
CREATE INDEX "StoreCollectionProduct_productId_idx" ON "StoreCollectionProduct"("productId");
ALTER TABLE "StoreCollectionProduct" ADD CONSTRAINT "StoreCollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "StoreCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreCollectionProduct" ADD CONSTRAINT "StoreCollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountType" "CouponDiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "minimumSubtotalPaise" INTEGER NOT NULL DEFAULT 0,
  "maximumDiscountPaise" INTEGER,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_startsAt_endsAt_idx" ON "Coupon"("isActive", "startsAt", "endsAt");

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "discountPaise" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponRedemption_couponId_orderId_key" ON "CouponRedemption"("couponId", "orderId");
CREATE INDEX "CouponRedemption_userId_createdAt_idx" ON "CouponRedemption"("userId", "createdAt");
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
