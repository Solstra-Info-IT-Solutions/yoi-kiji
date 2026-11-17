import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
type Params={params:Promise<{slug:string}>};
const schema=z.object({rating:z.number().int().min(1).max(5),title:z.string().max(120).optional(),body:z.string().trim().min(20).max(2000)});
export async function GET(_request:NextRequest,{params}:Params){
 const {slug}=await params;const product=await prisma.product.findFirst({where:{slug,isActive:true},select:{id:true}});
 if(!product)return NextResponse.json({error:"Product not found."},{status:404});
 const [reviews,summary]=await Promise.all([
  prisma.review.findMany({where:{productId:product.id,status:"APPROVED"},include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:50}),
  prisma.review.aggregate({where:{productId:product.id,status:"APPROVED"},_avg:{rating:true},_count:{_all:true}})
 ]);
 return NextResponse.json({reviews:reviews.map(r=>({id:r.id,rating:r.rating,title:r.title,body:r.body,verifiedPurchase:r.verifiedPurchase,createdAt:r.createdAt,userName:r.user.name??"YOI KIJI customer"})),summary:{averageRating:summary._avg.rating??0,count:summary._count._all}});
}
export async function POST(request:NextRequest,{params}:Params){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to write a review."},{status:401});
 const {slug}=await params;const product=await prisma.product.findFirst({where:{slug,isActive:true},select:{id:true}});
 if(!product)return NextResponse.json({error:"Product not found."},{status:404});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Review must include a rating and at least 20 characters.",details:parsed.error.flatten()},{status:400});
 const purchase=await prisma.orderItem.findFirst({where:{productId:product.id,order:{userId:user.id,status:"DELIVERED",payment:{is:{status:"CAPTURED"}}}},select:{id:true}});
 if(!purchase)return NextResponse.json({error:"Only customers with a delivered, paid order can review this product."},{status:403});
 const review=await prisma.review.upsert({where:{productId_userId:{productId:product.id,userId:user.id}},create:{productId:product.id,userId:user.id,rating:parsed.data.rating,title:parsed.data.title||null,body:parsed.data.body,status:"PENDING",verifiedPurchase:true},update:{rating:parsed.data.rating,title:parsed.data.title||null,body:parsed.data.body,status:"PENDING",verifiedPurchase:true,adminNote:null}});
 return NextResponse.json({review:{id:review.id,status:review.status},message:"Your verified review was submitted for moderation."},{status:201});
}
