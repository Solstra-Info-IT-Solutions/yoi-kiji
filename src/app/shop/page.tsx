import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Shop the collections",description:"Explore the YOI KIJI home textile collections."};
export default async function ShopPage({searchParams}:{searchParams:Promise<{collection?:string}>}){
 const [{collection:slug},allProducts,categories]=await Promise.all([searchParams,getActiveProducts(),getActiveCategories()]);
 const selected=slug?await prisma.storeCollection.findUnique({where:{slug,isActive:true},include:{products:{orderBy:{sortOrder:"asc"},include:{product:{include:{images:true,category:true}}}}}}):null;
 const products=selected?selected.products.map(link=>link.product).filter(product=>product.isActive):allProducts;
 const roots=categories.filter(c=>c.parentId===null);
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> {selected?.name??"Shop all"}</div>
  <header className="commerce-heading"><p className="eyebrow">{selected?"CURATED BY YOI KIJI":"THE YOI KIJI COLLECTIONS"}</p><h1>{selected?selected.name:<>Considered comfort,<br/><em>for every room.</em></>}</h1><p>{selected?.description??"Explore textiles chosen for the everyday moments that make a home."}</p></header>
  <nav className="category-pills" aria-label="Shop by category"><Link href="/shop">All products</Link>{roots.map(c=><Link key={c.id} href={`/shop/${c.slug}`}>{c.name}</Link>)}</nav>
  {products.length?<section className="product-grid">{products.map(p=><Link className="product-card" href={`/products/${p.slug}`} key={p.id}><div className="product-card-image">{p.images[0]?<img src={p.images[0].url} alt={p.images[0].alt}/>:<span>YOI KIJI</span>}</div><p className="product-card-category">{p.category?.name??"YOI KIJI"}</p><h2>{p.name}</h2><p className="product-card-price">{formatINR(p.pricePaise)}</p></Link>)}</section>:<section className="catalogue-empty"><span className="empty-mark">✳</span><h2>{selected?"This collection is being curated.":"The collection is taking shape."}</h2><p>{selected?"New pieces will be added here shortly.":"Our first pieces are being prepared. Please check back soon."}</p><Link className="primary-link" href="/">Return to YOI KIJI <span>↗</span></Link></section>}
 </main>;
}
