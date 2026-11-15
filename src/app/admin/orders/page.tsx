import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminFulfillmentForm } from "@/components/admin-fulfillment-form";
export const dynamic="force-dynamic";
export default async function AdminOrders(){const admin=await requireAdmin();if(!admin)redirect("/login");const orders=await prisma.order.findMany({include:{user:{select:{name:true,email:true}},items:true,payment:true},orderBy:{createdAt:"desc"},take:100});return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Orders</div><header className="commerce-heading"><p className="eyebrow">STORE OPERATIONS</p><h1>Every order,<br/><em>in good hands.</em></h1></header><section className="orders-list">{orders.map(o=><article className="order-card" key={o.id}><div><p className="order-number">{o.orderNumber}</p><p>{o.user.name??o.user.email}</p><p>{o.items.length} item(s) · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(o.createdAt)}</p></div><div><strong>{formatINR(o.totalPaise)}</strong><p>Payment: {o.payment?.status.toLowerCase()??"unavailable"}</p></div><div><span className="order-status">{o.status.toLowerCase()}</span><AdminOrderActions id={o.id} status={o.status} paymentStatus={o.payment?.status.toLowerCase()??"none"}/><AdminFulfillmentForm id={o.id} initialProvider={o.fulfillmentProvider} initialTracking={o.trackingNumber}/></div></article>)}</section></main>}
