import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export async function GET(){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const reviews=await prisma.review.findMany({include:{user:{select:{name:true,email:true}},product:{select:{name:true,slug:true,sku:true}}},orderBy:{createdAt:"desc"},take:500});
 return NextResponse.json({reviews});
}
export async function PATCH(request:NextRequest){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=z.object({id:z.string().min(1),status:z.enum(["APPROVED","REJECTED"]),adminNote:z.string().max(1000).optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid review moderation update."},{status:400});
 const current=await prisma.review.findUnique({where:{id:parsed.data.id}});
 if(!current)return NextResponse.json({error:"Review not found."},{status:404});
 const review=await prisma.review.update({where:{id:current.id},data:{status:parsed.data.status,adminNote:parsed.data.adminNote??null}});
 return NextResponse.json({review});
}
