import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/lib/catalog";
import { ProductPurchase } from "@/components/product-purchase";

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
  const dynamicSpecs = product.attributeValues.map(entry => {\n    const value = entry.value;\n    const formatted = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);\n    return { name: entry.attribute.name, value: entry.attribute.unit ? `${formatted} ${entry.attribute.unit}` : formatted };\n  });\n  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span>{product.name}</div>
    <section className="product-detail">
      <div className="product-gallery">{product.images.length ? product.images.map(image=><img key={image.id} src={image.url} alt={image.alt}/>) : <div className="product-image-placeholder">YOI KIJI</div>}</div>
      <div className="product-detail-copy"><p className="eyebrow">{product.category?.name ?? "YOI KIJI COLLECTION"}</p><h1>{product.name}</h1><p className="product-description">{product.description}</p>
      {(product.material||product.color||product.careInstructions||product.lengthMm||product.widthMm||product.heightMm||dynamicSpecs.length>0)&&<dl className="product-specs">{product.material&&<div><dt>Material</dt><dd>{product.material}</dd></div>}{product.color&&<div><dt>Colour</dt><dd>{product.color}</dd></div>}{(product.lengthMm||product.widthMm||product.heightMm)&&<div><dt>Dimensions</dt><dd>{[product.lengthMm,product.widthMm,product.heightMm].filter(Boolean).join(" × ")} mm</dd></div>}{product.careInstructions&&<div><dt>Care</dt><dd>{product.careInstructions}</dd></div>}{dynamicSpecs.map(spec=><div key={spec.name}><dt>{spec.name}</dt><dd>{spec.value}</dd></div>)}</dl>}
      <ProductPurchase productId={product.id} variants={product.variants.map(v=>({id:v.id,label:v.label,inventoryQty:v.inventoryQty,pricePaise:v.pricePaise}))} hasVariants={product.hasVariants} inventoryQty={product.inventoryQty} basePricePaise={product.pricePaise}/>
      <p className="product-detail-note">Prices are shown in INR. Delivery availability and charges are confirmed during checkout.</p>
      </div>
    </section>
  </main>;
}
