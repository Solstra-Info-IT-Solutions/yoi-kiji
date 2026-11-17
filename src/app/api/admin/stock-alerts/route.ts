import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));}
export async function GET(){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const alerts=await prisma.stockAlert.findMany({include:{product:{select:{name:true,slug:true,sku:true,inventoryQty:true,hasVariants:true,variants:{where:{isActive:true},select:{inventoryQty:true}}}}},orderBy:{createdAt:"desc"},take:500});
 return NextResponse.json({alerts});
}
export async function POST(request:NextRequest){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=z.object({id:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Alert id is required."},{status:400});
 const alert=await prisma.stockAlert.findUnique({where:{id:parsed.data.id},include:{product:{select:{name:true,slug:true,inventoryQty:true,hasVariants:true,variants:{where:{isActive:true},select:{inventoryQty:true}}}}}});
 if(!alert)return NextResponse.json({error:"Stock alert not found."},{status:404});
 const available=alert.product.hasVariants?alert.product.variants.some(v=>v.inventoryQty>0):alert.product.inventoryQty>0;
 if(!available)return NextResponse.json({error:"Restock this product before sending the alert."},{status:409});
 const apiKey=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!apiKey||!from)return NextResponse.json({error:"Email provider is not configured. Add EMAIL_API_KEY and EMAIL_FROM."},{status:503});
 const claim=await prisma.stockAlert.updateMany({where:{id:alert.id,status:{in:["PENDING","FAILED"]}},data:{status:"SENDING",error:null}});
 if(claim.count!==1)return NextResponse.json({error:"This alert is already sent or being processed."},{status:409});
 try{
  const productUrl=(process.env.NEXT_PUBLIC_SITE_URL??"").replace(/\/$/,"")+"/products/"+alert.product.slug;
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[alert.email],subject:"A YOI KIJI favourite is back in stock",text:"The "+alert.product.name+" is back in stock. Explore it here: "+productUrl,html:"<div style='font-family:Arial,sans-serif;color:#0e300e;max-width:600px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><p>A piece you were waiting for is available again.</p><h2>"+escapeHtml(alert.product.name)+"</h2><p><a href='"+escapeHtml(productUrl)+"' style='display:inline-block;padding:12px 20px;background:#0e300e;color:#fff;text-decoration:none'>Shop the piece</a></p><p>With care,<br/>YOI KIJI</p></div>"}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.message==="string"?data.message:"Email provider rejected the message.");
  await prisma.stockAlert.update({where:{id:alert.id},data:{status:"SENT",providerId:data.id??null,sentAt:new Date(),error:null}});
  return NextResponse.json({sent:true});
 }catch(error){
  await prisma.stockAlert.update({where:{id:alert.id},data:{status:"FAILED",error:error instanceof Error?error.message:"Email delivery failed."}});
  return NextResponse.json({error:"Email delivery failed. The alert can be retried."},{status:502});
 }
}
