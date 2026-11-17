import "../../returns.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminReturnsManager } from "@/components/admin-returns-manager";
export const dynamic="force-dynamic";
export default async function AdminReturnsPage(){
 const admin=await requireAdmin();if(!admin)redirect("/login");if(admin.role!=="ADMIN")redirect("/admin");
 const returns=await prisma.returnRequest.findMany({include:{user:{select:{name:true,email:true}},order:{select:{id:true,orderNumber:true,status:true,totalPaise:true,items:{select:{productName:true,sku:true,quantity:true,unitPricePaise:true}},payment:{select:{status:true,refundStatus:true}}}}},orderBy:{createdAt:"desc"},take:300});
 const serialised=returns.map(item=>({...item,createdAt:item.createdAt.toISOString(),items:Array.isArray(item.items)?item.items:[]}));
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Returns & refunds</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER CARE / REVERSE LOGISTICS</p><h1>Bring it back<br/><em>with care.</em></h1><p>Review full-order return requests, record inspection notes and issue refunds through Razorpay. Refunds are confirmed by the payment webhook.</p></header><AdminReturnsManager initialReturns={serialised}/></main>;
}
