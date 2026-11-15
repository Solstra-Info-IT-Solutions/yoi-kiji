import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const schema=z.object({provider:z.enum(["DELHIVERY","ATS","MANUAL"]),trackingNumber:z.string().max(120).optional(),trackingUrl:z.string().url().optional(),fulfillmentOrderId:z.string().max(120).optional()});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const admin=await requireAdmin();if(!admin)return NextResponse.json({error:"Forbidden"},{status:403});const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid fulfillment details."},{status:400});try{const order=await prisma.order.update({where:{id},data:{fulfillmentProvider:parsed.data.provider,trackingNumber:parsed.data.trackingNumber,trackingUrl:parsed.data.trackingUrl,fulfillmentOrderId:parsed.data.fulfillmentOrderId}});return NextResponse.json({order});}catch{return NextResponse.json({error:"Order or fulfillment reference not found."},{status:404});}}
