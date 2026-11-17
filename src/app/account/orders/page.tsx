import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { RetryPaymentButton } from "@/components/retry-payment-button";
export const dynamic="force-dynamic";
export const metadata={title:"Your orders"};
export default async function OrdersPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");
 const orders=await prisma.order.findMany({where:{userId:user.id},include:{items:true,payment:true},orderBy:{createdAt:"desc"},take:50});
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/account">Account</Link><span>/</span> Orders</div><header className="commerce-heading"><p className="eyebrow">YOUR YOI KIJI ACCOUNT</p><h1>Orders,<br/><em>thoughtfully kept.</em></h1></header>{orders.length?<section className="orders-list">{orders.map(order=><article key={order.id} className="order-card"><div><p className="order-number">{order.orderNumber}</p><p>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(order.createdAt)}</p></div><div><strong>{formatINR(order.totalPaise)}</strong><p>{order.items.length} item(s)</p></div><div className="order-actions"><span className="order-status">{order.status.toLowerCase()}</span><Link href={"/account/orders/"+order.id}>Track order ↗</Link><Link href={"/account/orders/"+order.id+"/invoice"}>View summary ↗</Link><a href={"/api/account/orders/"+order.id+"/invoice"}>Download PDF ↗</a>{order.status==="PENDING"&&(order.payment?.status==="FAILED"||order.payment?.status==="CREATED")&&<RetryPaymentButton orderId={order.id}/>}</div></article>)}</section>:<section className="catalogue-empty"><h2>Your story with us starts here.</h2><p>You have not placed an order yet.</p><Link className="primary-link" href="/shop">Explore collections <span>↗</span></Link></section>}</main>;
}
