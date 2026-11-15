"use client";

import { useState, type ReactNode } from "react";
import { ProductPurchase } from "@/components/product-purchase";

type MediaImage = { id: string; url: string; alt: string; isPrimary?: boolean; position?: number };
type PurchaseVariant = {
  id: string;
  label: string;
  inventoryQty: number;
  pricePaise: number | null;
  swatchHex: string | null;
  images: MediaImage[];
};

export function ProductDetailInteractive({
  productId, images, variants, hasVariants, inventoryQty, basePricePaise, children,
}: {
  productId: string;
  images: MediaImage[];
  variants: PurchaseVariant[];
  hasVariants: boolean;
  inventoryQty: number;
  basePricePaise: number;
  children: ReactNode;
}) {
  const [activeVariantId, setActiveVariantId] = useState("");
  const activeVariant = variants.find(variant => variant.id === activeVariantId);
  const variantImages = activeVariant?.images ?? [];
  const gallery = variantImages.length
    ? [...variantImages, ...images.filter(image => !variantImages.some(variantImage => variantImage.url === image.url))]
    : images;

  return <section className="product-detail">
    <div className="product-gallery">
      {gallery.length
        ? gallery.map(image => <img key={image.id} src={image.url} alt={image.alt}/>)
        : <div className="product-image-placeholder">YOI KIJI</div>}
    </div>
    <div className="product-detail-copy">
      {children}
      <ProductPurchase
        productId={productId}
        variants={variants.map(({ id, label, inventoryQty, pricePaise, swatchHex }) => ({ id, label, inventoryQty, pricePaise, swatchHex }))}
        hasVariants={hasVariants}
        inventoryQty={inventoryQty}
        basePricePaise={basePricePaise}
        onVariantChange={setActiveVariantId}
      />
      <p className="product-detail-note">Prices are shown in INR. Delivery availability and charges are confirmed during checkout.</p>
    </div>
  </section>;
}
