import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export async function GET(){const admin=await requireAdmin();if(!admin)return NextResponse.json({error:"Forbidden"},{status:403});const movements=await prisma.inventoryMovement.findMany({include:{product:{select:{name:true,sku:true}},variant:{select:{label:true,sku:true}}},orderBy:{createdAt:"desc"},take:200});return NextResponse.json({movements});}
