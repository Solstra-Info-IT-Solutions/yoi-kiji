import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export async function GET(){const admin=await requireAdmin();if(!admin)return NextResponse.json({error:"Forbidden"},{status:403});const orders=await prisma.order.findMany({include:{user:{select:{name:true,email:true}},items:true,payment:true},orderBy:{createdAt:"desc"},take:100});return NextResponse.json({orders});}
