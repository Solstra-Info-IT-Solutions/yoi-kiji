import { randomBytes } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema=z.object({orderId:z.string().min(1),reason:z.enum(["DAMAGED","WRONG_ITEM","QUALITY_ISSUE","OTHER"]),note:z.string().max(1500).optional()});
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to view return requests."},{status:401});
 const returns=await prisma.returnRequest.findMany({where:{userId:user.id},include:{order:{select:{orderNumber:true,totalPaise:true,status:true,createdAt:true,items:{select:{productName:true,sku:true,quantity:true}}}}},orderBy:{createdAt:"desc"},take:100});
 return NextResponse.json({returns});
}
export async function POST(request:NextRequest){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to request a return."},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid return request.",details:parsed.error.flatten()},{status:400});
 const order=await prisma.order.findFirst({where:{id:parsed.data.orderId,userId:user.id},include:{items:true,payment:true}});
 if(!order)return NextResponse.json({error:"Order not found."},{status:404});
 if(order.status!=="DELIVERED")return NextResponse.json({error:"Only delivered orders can be returned."},{status:409});
 if(order.payment?.status!=="CAPTURED")return NextResponse.json({error:"Only paid orders can be returned."},{status:409});
 if(Date.now()-order.updatedAt.getTime()>30*24*60*60*1000)return NextResponse.json({error:"The 30-day return window has closed."},{status:409});
 const existing=await prisma.returnRequest.findUnique({where:{orderId:order.id},select:{id:true}});
 if(existing)return NextResponse.json({error:"A return request already exists for this order."},{status:409});
 const requestNumber="RTN-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+randomBytes(3).toString("hex").toUpperCase();
 try{
  const created=await prisma.returnRequest.create({data:{requestNumber,orderId:order.id,userId:user.id,reason:parsed.data.reason,note:parsed.data.note||null,refundAmountPaise:order.totalPaise,items:order.items.map(item=>({productName:item.productName,sku:item.sku,quantity:item.quantity,unitPricePaise:item.unitPricePaise}))}});
  return NextResponse.json({returnRequest:created},{status:201});
 }catch{return NextResponse.json({error:"A return request may already exist for this order."},{status:409});}
}
