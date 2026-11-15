import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminProductRow } from "@/components/admin-product-row";
export const dynamic="force-dynamic";
export default async function AdminProducts(){const admin=await requireAdmin();if(!admin)redirect("/login");const products=await prisma.product.findMany({include:{category:true},orderBy:{updatedAt:"desc"},take:200});return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Products</div><header className="commerce-heading"><p className="eyebrow">CATALOGUE MANAGEMENT</p><h1>Products,<br/><em>beautifully presented.</em></h1><p>Review product visibility, pricing and inventory.</p></header><div className="admin-product-list">{products.map(p=><article key={p.id}><div><h2>{p.name}</h2><p>{p.sku} · {p.category?.name??"Uncategorised"}</p></div><div><strong>{formatINR(p.pricePaise)}</strong><p>{p.inventoryQty} in stock</p></div><div><span className={p.isActive?"active-state":"inactive-state"}>{p.isActive?"Published":"Draft"}</span><AdminProductRow id={p.id} initiallyActive={p.isActive} initialStock={p.inventoryQty}/></div></article>)}</div></main>}
