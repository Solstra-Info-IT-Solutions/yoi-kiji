import "../reviews-wishlist.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCategories,getActiveProducts,getCategoryBranchIds } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Shop the collections",description:"Explore the YOI KIJI home textile collections."};
type Filters={collection?:string;category?:string;q?:string;sort?:string;minPrice?:string;maxPrice?:string};
export default async function ShopPage({searchParams}:{searchParams:Promise<Filters>}){
 const params=await searchParams;
 const [allProducts,categories]=await Promise.all([getActiveProducts(params.category),getActiveCategories()]);
 const selected=params.collection
  ? await prisma.storeCollection.findFirst({
      where:{slug:params.collection,isActive:true},
      include:{
       products:{
        orderBy:{sortOrder:"asc"},
        include:{
         product:{
          include:{
           images:{where:{variantId:null},orderBy:{isPrimary:"desc"},take:1},
           category:true,
           categoryLinks:{include:{category:true}}
          }
         }
        }
       }
      }
     })
  : null;
 let products=selected?selected.products.map(link=>link.product).filter(product=>product.isActive):allProducts;
 if(selected&&params.category){const category=await prisma.category.findUnique({where:{slug:params.category},select:{id:true,isActive:true}});const ids=category?.isActive?await getCategoryBranchIds(category.id):[];products=products.filter(product=>(product.categoryId!==null&&ids.includes(product.categoryId))||product.categoryLinks.some(link=>ids.includes(link.categoryId)));}
 const query=params.q?.trim().toLowerCase();
 if(query)products=products.filter(p=>p.name.toLowerCase().includes(query)||p.description.toLowerCase().includes(query)||p.sku.toLowerCase().includes(query));
 const min=params.minPrice?Math.max(0,Math.round(Number(params.minPrice)*100)):null;
 const max=params.maxPrice?Math.max(0,Math.round(Number(params.maxPrice)*100)):null;
 if(min!==null&&Number.isFinite(min))products=products.filter(p=>p.pricePaise>=min);
 if(max!==null&&Number.isFinite(max))products=products.filter(p=>p.pricePaise<=max);
 if(params.sort==="price-asc")products=[...products].sort((a,b)=>a.pricePaise-b.pricePaise);
 else if(params.sort==="price-desc")products=[...products].sort((a,b)=>b.pricePaise-a.pricePaise);
 else if(params.sort==="name")products=[...products].sort((a,b)=>a.name.localeCompare(b.name));
 else products=[...products].sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
 const roots=categories.filter(c=>c.parentId===null);
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> {selected?.name??"Shop all"}</div>
  <header className="commerce-heading"><p className="eyebrow">{selected?"CURATED BY YOI KIJI":"THE YOI KIJI COLLECTIONS"}</p><h1>{selected?selected.name:<>Considered comfort,<br/><em>for every room.</em></>}</h1><p>{selected?.description??"Explore textiles chosen for the everyday moments that make a home."}</p></header>
  <form className="shop-filter-form" action="/shop" method="get">
   {selected&&<input type="hidden" name="collection" value={selected.slug}/>}
   <label>Search<input type="search" name="q" defaultValue={params.q??""} placeholder="Product name, detail or SKU"/></label>
   <label>Category<select name="category" defaultValue={params.category??""}><option value="">All categories</option>{roots.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
   <label>Minimum price (₹)<input type="number" min="0" step="1" name="minPrice" defaultValue={params.minPrice??""}/></label>
   <label>Maximum price (₹)<input type="number" min="0" step="1" name="maxPrice" defaultValue={params.maxPrice??""}/></label>
   <label>Sort by<select name="sort" defaultValue={params.sort??"newest"}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name A–Z</option></select></label>
   <button type="submit">Apply filters</button><Link href={selected?"/shop?collection="+selected.slug:"/shop"}>Clear filters</Link>
  </form>
  <p className="shop-results-count">{products.length} piece(s) to discover</p>
  {products.length?<section className="product-grid">{products.map(p=><Link className="product-card" href={"/products/"+p.slug} key={p.id}><div className="product-card-image">{p.images[0]?<img src={p.images[0].url} alt={p.images[0].alt}/>:<span>YOI KIJI</span>}</div><p className="product-card-category">{p.category?.name??"YOI KIJI"}</p><h2>{p.name}</h2><p className="product-card-price">{formatINR(p.pricePaise)}</p></Link>)}</section>:<section className="catalogue-empty"><span className="empty-mark">✳</span><h2>No pieces match those filters.</h2><p>Try a different search or clear a price range.</p><Link className="primary-link" href={selected?"/shop?collection="+selected.slug:"/shop"}>Clear filters <span>↗</span></Link></section>}
 </main>;
}
