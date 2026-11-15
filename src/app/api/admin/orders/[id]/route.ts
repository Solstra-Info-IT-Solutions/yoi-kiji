import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const schema=z.object({status:z.enum(["PROCESSING","SHIPPED","DELIVERED","CANCELLED"])});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const admin=await requireAdmin();if(!admin)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid status."},{status:400});
 const order=await prisma.order.findUnique({where:{id},include:{items:true,payment:true}});if(!order)return NextResponse.json({error:"Order not found."},{status:404});
 const allowed:Record<string,string[]>={CONFIRMED:["PROCESSING"],PROCESSING:["SHIPPED"],SHIPPED:["DELIVERED"],PENDING:["CANCELLED"]};
 if(parsed.data.status==="CANCELLED"&&order.status==="PROCESSING")allowed.PROCESSING=["SHIPPED"];
 if(!allowed[order.status]?.includes(parsed.data.status))return NextResponse.json({error:`Cannot change order from ${order.status} to ${parsed.data.status}.`},{status:409});
 if(parsed.data.status==="CANCELLED"&&order.payment?.status==="CAPTURED")return NextResponse.json({error:"This order has been paid. Issue a Razorpay refund before cancelling it."},{status:409});
 const updated=await prisma.$transaction(async tx=>{
  if(parsed.data.status==="CANCELLED"){
   for(const item of order.items){if(item.variantId)await tx.productVariant.update({where:{id:item.variantId},data:{inventoryQty:{increment:item.quantity}}});else await tx.product.update({where:{id:item.productId},data:{inventoryQty:{increment:item.quantity}}});await tx.inventoryMovement.create({data:{productId:item.productId,variantId:item.variantId,quantityDelta:item.quantity,reason:"ORDER_CANCELLED",reference:order.orderNumber,createdBy:admin.id}});}
  }
  return tx.order.update({where:{id},data:{status:parsed.data.status,...(parsed.data.status==="CANCELLED"?{checkoutKey:null}:{})}});
 });
 return NextResponse.json({order:updated});
}
