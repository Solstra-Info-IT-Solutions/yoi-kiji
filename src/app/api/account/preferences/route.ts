import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function PATCH(request:NextRequest){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});const parsed=z.object({whatsappOptIn:z.boolean()}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid preference."},{status:400});const updated=await prisma.user.update({where:{id:user.id},data:{whatsappOptIn:parsed.data.whatsappOptIn},select:{whatsappOptIn:true}});return NextResponse.json(updated);}
