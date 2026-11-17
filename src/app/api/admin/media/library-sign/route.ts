import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const schema=z.object({resourceType:z.enum(["IMAGE","VIDEO","RAW"]).default("IMAGE"),folderId:z.string().min(1).nullable().optional()});
function signUpload(params:Record<string,string>,secret:string){const canonical=Object.keys(params).sort().map(key=>`${key}=${params[key]}`).join("&");return createHash("sha1").update(canonical+secret).digest("hex");}
export async function POST(request:NextRequest){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid upload request."},{status:400});
 if(parsed.data.folderId&&!await prisma.mediaFolder.findUnique({where:{id:parsed.data.folderId},select:{id:true}}))return NextResponse.json({error:"Media folder not found."},{status:404});
 const cloudName=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET;
 if(!cloudName||!apiKey||!apiSecret)return NextResponse.json({error:"Media storage is not configured. Set the Cloudinary server credentials."},{status:503});
 const timestamp=Math.floor(Date.now()/1000).toString(),folder="yoi-kiji/library",publicId=randomUUID();
 const formats=parsed.data.resourceType==="IMAGE"?"jpg,jpeg,png,webp,avif,gif":parsed.data.resourceType==="VIDEO"?"mp4,webm,mov,m4v,mp3,wav,m4a,aac,ogg":"mp3,wav,m4a,aac,ogg,pdf";
 const params={allowed_formats:formats,folder,overwrite:"false",public_id:publicId,timestamp};
 return NextResponse.json({cloudName,apiKey,timestamp,folder,publicId,resourceType:parsed.data.resourceType.toLowerCase(),folderId:parsed.data.folderId??null,allowedFormats:formats,signature:signUpload(params,apiSecret)});
}
