import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

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
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span>{product.name}</div>
    <section className="product-detail">
      <div className="product-gallery">{product.images.length ? product.images.map(image=><img key={image.id} src={image.url} alt={image.alt}/>) : <div className="product-image-placeholder">YOI KIJI</div>}</div>
      <div className="product-detail-copy"><p className="eyebrow">{product.category?.name ?? "YOI KIJI COLLECTION"}</p><h1>{product.name}</h1><p className="product-detail-price">{formatINR(product.pricePaise)}</p><p className="product-description">{product.description}</p>
      {product.variants.length>0 && <fieldset className="variant-options"><legend>Choose an option</legend><div>{product.variants.map(v=><span key={v.id}>{v.label}</span>)}</div></fieldset>}
      <p className="stock-note">{product.inventoryQty>0 ? "Available to order" : "Currently unavailable"}</p>
      <button className="primary-link add-to-bag" type="button" disabled>Online ordering opening soon <span>↗</span></button>
      <p className="product-detail-note">Secure checkout and delivery options will appear here once the store's ordering services are activated.</p>
      </div>
    </section>
  </main>;
}
