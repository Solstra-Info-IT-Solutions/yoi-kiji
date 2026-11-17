import "../../returns.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { CustomerReturnForm } from "@/components/customer-return-form";
export const dynamic="force-dynamic";
export const metadata={title:"Returns & requests"};
export default async function CustomerReturnsPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");
 const since=new Date(Date.now()-30*24*60*60*1000);
 const [orders,returns]=await Promise.all([
  prisma.order.findMany({where:{userId:user.id,status:"DELIVERED",updatedAt:{gte:since},payment:{is:{status:"CAPTURED"}},returnRequest:null},select:{id:true,orderNumber:true,totalPaise:true,updatedAt:true},orderBy:{updatedAt:"desc"}}),
  prisma.returnRequest.findMany({where:{userId:user.id},include:{order:{select:{orderNumber:true,totalPaise:true}}},orderBy:{createdAt:"desc"}})
 ]);
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/account">Account</Link><span>/</span> Returns</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER CARE</p><h1>Here when<br/><em>you need us.</em></h1><p>Request a return for an eligible delivered order and follow its progress.</p></header>
  <CustomerReturnForm orders={orders.map(o=>({...o,updatedAt:o.updatedAt.toISOString()}))}/>
  <section className="account-return-history"><div className="admin-section-heading"><h2>Your return requests</h2><span>{returns.length} request(s)</span></div>{returns.length?returns.map(item=><article key={item.id}><div><strong>{item.requestNumber}</strong><p>{item.order.orderNumber} · {formatINR(item.order.totalPaise)}</p><small>{item.reason.replaceAll("_"," ").toLowerCase()} · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(item.createdAt)}</small></div><span className="order-status">{item.status.toLowerCase().replaceAll("_"," ")}</span></article>):<p>No return requests yet.</p>}</section>
 </main>;
}
