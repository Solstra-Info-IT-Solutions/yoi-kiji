import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const updateSchema=z.object({id:z.string().min(1),status:z.enum(["APPROVED","REJECTED","RECEIVED","REFUND_PENDING"]),adminNote:z.string().max(1500).optional()});
export async function GET(){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const returns=await prisma.returnRequest.findMany({include:{user:{select:{name:true,email:true}},order:{select:{id:true,orderNumber:true,status:true,totalPaise:true,items:{select:{productName:true,sku:true,quantity:true,unitPricePaise:true}},payment:{select:{status:true,refundStatus:true}}}}},orderBy:{createdAt:"desc"},take:300});
 return NextResponse.json({returns});
}
export async function PATCH(request:NextRequest){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=updateSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid return update.",details:parsed.error.flatten()},{status:400});
 const current=await prisma.returnRequest.findUnique({where:{id:parsed.data.id}});
 if(!current)return NextResponse.json({error:"Return request not found."},{status:404});
 const allowed:Record<string,string[]>={REQUESTED:["APPROVED","REJECTED"],APPROVED:["RECEIVED"],RECEIVED:["REFUND_PENDING"],REFUND_PENDING:[],REFUNDED:[],REJECTED:[]};
 if(!allowed[current.status].includes(parsed.data.status))return NextResponse.json({error:"This return status transition is not allowed."},{status:409});
 const updated=await prisma.returnRequest.update({where:{id:current.id},data:{status:parsed.data.status,adminNote:parsed.data.adminNote??current.adminNote}});
 return NextResponse.json({returnRequest:updated});
}
