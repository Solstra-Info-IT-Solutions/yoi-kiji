import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveCategories, getActiveCategoryBySlug, getActiveProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

type Props = { params: Promise<{ category: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const item = await getActiveCategoryBySlug(category);
  return item ? { title: item.seoTitle ?? item.name, description: item.seoDescription ?? item.description ?? undefined } : {};
}
export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const [item, categories] = await Promise.all([getActiveCategoryBySlug(category), getActiveCategories()]);
  if (!item) notFound();
  const products = await getActiveProducts(category);
  const children = categories.filter(c => c.parentId === item.id);
  const siblings = categories.filter(c => c.parentId === item.parentId && c.id !== item.id);
  const ancestors: { name: string; slug: string }[] = [];
  let parentId = item.parentId;
  while (parentId) {
    const parent = categories.find(c => c.id === parentId);
    if (!parent || ancestors.some(a => a.slug === parent.slug)) break;
    ancestors.unshift({ name: parent.name, slug: parent.slug });
    parentId = parent.parentId;
  }
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link>{ancestors.map(a=><span key={a.slug}>/ <Link href={`/shop/${a.slug}`}>{a.name}</Link></span>)}<span>/</span> {item.name}</div>
    <header className="commerce-heading"><p className="eyebrow">YOI KIJI / THE COLLECTION</p><h1>{item.name}<br/><em>for living well.</em></h1>{item.description&&<p>{item.description}</p>}</header>
    {children.length > 0 && <section className="category-subcollections"><p className="eyebrow">EXPLORE THIS COLLECTION</p><nav className="category-pills" aria-label={`Browse ${item.name} subcategories`}>{children.map(child=><Link key={child.id} href={`/shop/${child.slug}`}>{child.name}</Link>)}</nav></section>}
    {siblings.length > 0 && <nav className="category-pills" aria-label="Related categories">{siblings.map(c=><Link key={c.id} href={`/shop/${c.slug}`}>{c.name}</Link>)}</nav>}
    {products.length ? <section className="product-grid">{products.map(p=><Link className="product-card" href={`/products/${p.slug}`} key={p.id}><div className="product-card-image">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt}/> : <span>YOI KIJI</span>}</div><p className="product-card-category">{item.name}</p><h2>{p.name}</h2><p className="product-card-price">{formatINR(p.pricePaise)}</p></Link>)}</section> : <section className="catalogue-empty"><span className="empty-mark">✳</span><h2>Something thoughtful is on its way.</h2><p>We are preparing the {item.name.toLowerCase()} collection. In the meantime, explore the other collections.</p><Link className="primary-link" href="/shop">Explore all collections <span>↗</span></Link></section>}
  </main>;
}
