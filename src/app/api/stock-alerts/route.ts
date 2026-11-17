import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const schema=z.object({productId:z.string().min(1),email:z.string().trim().email().max(254)});
export async function POST(request:NextRequest){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Enter a valid email address."},{status:400});
 const product=await prisma.product.findFirst({where:{id:parsed.data.productId,isActive:true},include:{variants:{where:{isActive:true},select:{inventoryQty:true}}}});
 if(!product)return NextResponse.json({error:"Product not found."},{status:404});
 const available=product.hasVariants?product.variants.some(v=>v.inventoryQty>0):product.inventoryQty>0;
 if(available)return NextResponse.json({error:"This product is currently in stock."},{status:409});
 const email=parsed.data.email.toLowerCase();
 const alert=await prisma.stockAlert.upsert({
  where:{productId_email:{productId:product.id,email}},
  create:{productId:product.id,email,status:"PENDING"},
  update:{status:"PENDING",error:null,providerId:null,sentAt:null},
  select:{id:true}
 });
 return NextResponse.json({subscribed:true,alertId:alert.id,message:"We'll email you when this piece is back in stock."},{status:201});
}
