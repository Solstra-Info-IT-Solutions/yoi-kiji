import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET;if(!secret)return NextResponse.json({error:"Cron endpoint is not configured."},{status:503});
 const supplied=request.headers.get("authorization")??"";const expected="Bearer "+secret;const a=Buffer.from(supplied),b=Buffer.from(expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Unauthorized."},{status:401});
 const expired=await prisma.order.findMany({where:{status:"PENDING",reservationExpiresAt:{lte:new Date()}},include:{items:true,payment:true},orderBy:{reservationExpiresAt:"asc"},take:100});
 let count=0;
 for(const order of expired){
  await prisma.$transaction(async tx=>{
   const current=await tx.order.findUnique({where:{id:order.id},include:{payment:true,items:true}});
   if(!current||current.status!=="PENDING"||!current.reservationExpiresAt||current.reservationExpiresAt>new Date()||current.payment?.status==="CAPTURED")return;
   for(const item of current.items){
    if(item.variantId)await tx.productVariant.update({where:{id:item.variantId},data:{inventoryQty:{increment:item.quantity}}});
    else await tx.product.update({where:{id:item.productId},data:{inventoryQty:{increment:item.quantity}}});
    await tx.inventoryMovement.create({data:{productId:item.productId,variantId:item.variantId,quantityDelta:item.quantity,reason:"RESERVATION_EXPIRED",reference:current.orderNumber}});
   }
   await tx.order.update({where:{id:current.id},data:{status:"CANCELLED",checkoutKey:null}});
   count++;
  });
 }
 return NextResponse.json({expired:count,checked:expired.length});
}
