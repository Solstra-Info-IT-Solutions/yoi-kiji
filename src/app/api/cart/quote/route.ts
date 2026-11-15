import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

const schema=z.object({items:z.array(z.object({productId:z.string().min(1),variantId:z.string().optional(),quantity:z.number().int().min(1).max(10)})).max(30)});
export async function POST(request:NextRequest){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid cart."},{status:400});
 const ids=[...new Set(parsed.data.items.map(i=>i.productId))];
 const products=await prisma.product.findMany({where:{id:{in:ids},isActive:true},include:{images:{orderBy:{position:"asc"},take:1},variants:{where:{isActive:true}}}});
 const lines=[];
 for(const item of parsed.data.items){
  const p=products.find(x=>x.id===item.productId);if(!p)return NextResponse.json({error:"A product in your bag is no longer available."},{status:409});
  const v=item.variantId?p.variants.find(x=>x.id===item.variantId):null;
  if(item.variantId&&!v)return NextResponse.json({error:"A selected option is no longer available."},{status:409});
  if(p.hasVariants&&!v)return NextResponse.json({error:"Please select a product option."},{status:400});
  const price=v?.pricePaise??p.pricePaise;
  lines.push({productId:p.id,variantId:v?.id??null,name:p.name,variantLabel:v?.label??null,sku:v?.sku??p.sku,quantity:item.quantity,unitPricePaise:price,lineTotalPaise:price*item.quantity,image:p.images[0]?.url??null,availableQty:v?.inventoryQty??p.inventoryQty});
 }
 const subtotal=lines.reduce((s,l)=>s+l.lineTotalPaise,0);
 return NextResponse.json({items:lines,subtotalPaise:subtotal,subtotal:formatINR(subtotal)});
}
