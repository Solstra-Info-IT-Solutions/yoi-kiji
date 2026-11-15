import type { Metadata } from "next";
import Link from "next/link";
import { getActiveProducts, storefrontCategories } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop the collections", description: "Explore the YOI KIJI home textile collections." };

export default async function ShopPage() {
  const products = await getActiveProducts();
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Shop all</div>
    <header className="commerce-heading"><p className="eyebrow">THE YOI KIJI COLLECTIONS</p><h1>Considered comfort,<br/><em>for every room.</em></h1><p>Explore textiles chosen for the everyday moments that make a home.</p></header>
    <nav className="category-pills" aria-label="Shop by category">{storefrontCategories.map(c=><Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}</Link>)}</nav>
    {products.length ? <section className="product-grid">{products.map(p=><Link className="product-card" href={`/products/${p.slug}`} key={p.id}><div className="product-card-image">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt}/> : <span>YOI KIJI</span>}</div><p className="product-card-category">{p.category?.name ?? "YOI KIJI"}</p><h2>{p.name}</h2><p className="product-card-price">{formatINR(p.pricePaise)}</p></Link>)}</section> : <section className="catalogue-empty"><span className="empty-mark">✳</span><h2>The collection is taking shape.</h2><p>Our first pieces are being prepared. Please check back soon.</p><Link className="primary-link" href="/">Return to YOI KIJI <span>↗</span></Link></section>}
  </main>;
}
