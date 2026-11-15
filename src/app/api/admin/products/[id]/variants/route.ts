import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const schema=z.object({sku:z.string().min(2).max(80),label:z.string().min(1).max(80),pricePaise:z.number().int().positive().optional(),inventoryQty:z.number().int().min(0),isActive:z.boolean().default(true),attributes:z.record(z.string(),z.string()).optional()});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid variant."},{status:400});try{const variant=await prisma.productVariant.create({data:{...parsed.data,productId:id}});await prisma.product.update({where:{id},data:{hasVariants:true}});return NextResponse.json({variant},{status:201});}catch{return NextResponse.json({error:"Variant could not be created. Check product, SKU and option label."},{status:409});}}
