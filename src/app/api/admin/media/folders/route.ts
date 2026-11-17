import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const slugify=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
export async function GET(){const a=await requireAdmin();if(!a||a.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});const folders=await prisma.mediaFolder.findMany({orderBy:{name:"asc"},include:{_count:{select:{assets:true}}}});return NextResponse.json({folders});}
export async function POST(request:NextRequest){const a=await requireAdmin();if(!a||a.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});const p=z.object({name:z.string().trim().min(2).max(60)}).safeParse(await request.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Folder name must be between 2 and 60 characters."},{status:400});const slug=slugify(p.data.name);if(!slug)return NextResponse.json({error:"Enter a valid folder name."},{status:400});try{const folder=await prisma.mediaFolder.create({data:{name:p.data.name,slug}});return NextResponse.json({folder},{status:201});}catch(e){if((e as {code?:string})?.code==="P2002")return NextResponse.json({error:"A folder with this name already exists."},{status:409});throw e;}}
