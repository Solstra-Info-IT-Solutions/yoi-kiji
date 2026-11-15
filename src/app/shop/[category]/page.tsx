import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProducts, storefrontCategories } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

type Props = { params: Promise<{ category: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const item = storefrontCategories.find(c => c.slug === category);
  return item ? { title: item.name, description: item.description } : {};
}
export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const item = storefrontCategories.find(c => c.slug === category);
  if (!item) notFound();
  const products = await getActiveProducts(category);
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span> {item.name}</div>
    <header className="commerce-heading"><p className="eyebrow">YOI KIJI / COLLECTION 0{storefrontCategories.findIndex(c=>c.slug===category)+1}</p><h1>{item.name}<br/><em>for living well.</em></h1><p>{item.description}</p></header>
    {item.slug === "bedsheets" && <div className="category-pills size-pills" aria-label="Bedsheet sizes">{item.sizes.map(size=><span key={size}>{size}</span>)}</div>}
    <nav className="category-pills" aria-label="Browse collections">{storefrontCategories.filter(c=>c.slug!==category).map(c=><Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}</Link>)}</nav>
    {products.length ? <section className="product-grid">{products.map(p=><Link className="product-card" href={`/products/${p.slug}`} key={p.id}><div className="product-card-image">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt}/> : <span>YOI KIJI</span>}</div><p className="product-card-category">{item.name}</p><h2>{p.name}</h2><p className="product-card-price">{formatINR(p.pricePaise)}</p></Link>)}</section> : <section className="catalogue-empty"><span className="empty-mark">✳</span><h2>Something thoughtful is on its way.</h2><p>We are preparing the {item.name.toLowerCase()} collection. In the meantime, explore the other collections.</p><Link className="primary-link" href="/shop">Explore all collections <span>↗</span></Link></section>}
  </main>;
}
