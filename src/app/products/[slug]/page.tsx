import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/lib/catalog";
import { ProductDetailInteractive } from "@/components/product-detail-interactive";
import { WishlistButton } from "@/components/wishlist-button";
import { ProductReviewSection } from "@/components/product-review-section";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  return product ? { title: product.name, description: product.description.slice(0, 155) } : {};
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const user=await getCurrentUser();
  const [reviews,reviewSummary,eligiblePurchase]=await Promise.all([
    prisma.review.findMany({where:{productId:product.id,status:"APPROVED"},include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:50}),
    prisma.review.aggregate({where:{productId:product.id,status:"APPROVED"},_avg:{rating:true},_count:{_all:true}}),
    user?prisma.orderItem.findFirst({where:{productId:product.id,order:{userId:user.id,status:"DELIVERED",payment:{is:{status:"CAPTURED"}}}},select:{id:true}}):Promise.resolve(null),
  ]);
  const dynamicSpecs = product.attributeValues.map(entry => {
    const value = entry.value;
    const formatted = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
    return { name: entry.attribute.name, value: entry.attribute.unit ? `${formatted} ${entry.attribute.unit}` : formatted };
  });

  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span>{product.name}</div>
    <ProductDetailInteractive
      productId={product.id}
      images={product.images.map(image => ({ id: image.id, url: image.url, alt: image.alt, isPrimary: image.isPrimary, position: image.position }))}
      variants={product.variants.map(variant => ({
        id: variant.id, label: variant.label, inventoryQty: variant.inventoryQty,
        pricePaise: variant.pricePaise, swatchHex: variant.swatchHex,
        images: variant.images.map(image => ({ id: image.id, url: image.url, alt: image.alt, isPrimary: image.isPrimary, position: image.position })),
      }))}
      hasVariants={product.hasVariants}
      inventoryQty={product.inventoryQty}
      basePricePaise={product.pricePaise}
    >
      <p className="eyebrow">{product.category?.name ?? "YOI KIJI COLLECTION"}</p>
      <h1>{product.name}</h1>\n      <WishlistButton productId={product.id}/>
      <p className="product-description">{product.description}</p>
      {(product.material || product.color || product.careInstructions || product.lengthMm || product.widthMm || product.heightMm || dynamicSpecs.length > 0) && <dl className="product-specs">
        {product.material && <div><dt>Material</dt><dd>{product.material}</dd></div>}
        {product.color && <div><dt>Colour</dt><dd>{product.color}</dd></div>}
        {(product.lengthMm || product.widthMm || product.heightMm) && <div><dt>Dimensions</dt><dd>{[product.lengthMm, product.widthMm, product.heightMm].filter(Boolean).join(" × ")} mm</dd></div>}
        {product.careInstructions && <div><dt>Care</dt><dd>{product.careInstructions}</dd></div>}
        {dynamicSpecs.map(spec => <div key={spec.name}><dt>{spec.name}</dt><dd>{spec.value}</dd></div>)}
      </dl>}
    </ProductDetailInteractive>
  </main>;
}
