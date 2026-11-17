import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to view your wishlist."},{status:401});
 const items=await prisma.wishlistItem.findMany({where:{userId:user.id,product:{isActive:true}},include:{product:{include:{images:{where:{variantId:null},orderBy:{isPrimary:"desc"},take:1},category:true}}},orderBy:{createdAt:"desc"},take:500});
 return NextResponse.json({items});
}
export async function POST(request:NextRequest){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to save wishlist items."},{status:401});
 const parsed=z.object({productId:z.string().min(1)}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Product id is required."},{status:400});
 const product=await prisma.product.findFirst({where:{id:parsed.data.productId,isActive:true},select:{id:true}});if(!product)return NextResponse.json({error:"Product not found."},{status:404});
 const item=await prisma.wishlistItem.upsert({where:{userId_productId:{userId:user.id,productId:product.id}},create:{userId:user.id,productId:product.id},update:{}});
 return NextResponse.json({item},{status:201});
}
export async function DELETE(request:NextRequest){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to manage your wishlist."},{status:401});
 const productId=request.nextUrl.searchParams.get("productId");if(!productId)return NextResponse.json({error:"Product id is required."},{status:400});
 await prisma.wishlistItem.deleteMany({where:{userId:user.id,productId}});
 return NextResponse.json({removed:true});
}
