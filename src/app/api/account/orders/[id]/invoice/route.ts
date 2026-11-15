import PDFDocument from "pdfkit";
import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
export const runtime="nodejs";
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;const order=await prisma.order.findFirst({where:{id,userId:user.id},include:{items:true}});
 if(!order)return NextResponse.json({error:"Order not found."},{status:404});
 const buffer=await new Promise<Buffer>((resolve,reject)=>{
  const doc=new PDFDocument({size:"A4",margin:48});const chunks:Buffer[]=[];
  doc.on("data",(chunk:Buffer)=>chunks.push(Buffer.from(chunk)));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
  doc.fillColor("#0e300e").font("Helvetica-Bold").fontSize(21).text("YOI KIJI");
  doc.fillColor("#555555").font("Helvetica").fontSize(9).text("Textiles for the way you live.");
  doc.moveDown(1.5);doc.fillColor("#0e300e").font("Helvetica-Bold").fontSize(15).text("ORDER SUMMARY");
  doc.fillColor("#333333").font("Helvetica").fontSize(9).text("Order: "+order.orderNumber).text("Date: "+new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(order.createdAt)).text("Status: "+order.status);
  doc.moveDown();doc.font("Helvetica-Bold").text("DELIVERY ADDRESS");doc.font("Helvetica").text(Object.values(order.shippingAddress as Record<string,string>).filter(Boolean).join(", "));
  doc.moveDown();doc.font("Helvetica-Bold").text("ITEMS");
  doc.moveDown(.5);
  for(const item of order.items){doc.font("Helvetica-Bold").fontSize(10).text(item.productName+(item.variantLabel?" — "+item.variantLabel:""));doc.font("Helvetica").fontSize(8).fillColor("#555555").text("SKU: "+item.sku+"   HSN: "+(item.hsnCode??"—")+"   Qty: "+item.quantity);doc.text(formatINR(item.unitPricePaise)+" each     "+formatINR(item.unitPricePaise*item.quantity));doc.moveDown(.7);doc.fillColor("#333333");}
  doc.moveDown();doc.font("Helvetica").fontSize(9).text("Items subtotal: "+formatINR(order.subtotalPaise),{align:"right"}).text("GST included in product and delivery amounts (estimated): "+formatINR(order.taxPaise),{align:"right"}).text("Shipping: "+formatINR(order.shippingPaise),{align:"right"});
  doc.moveDown(.5).font("Helvetica-Bold").fontSize(13).fillColor("#0e300e").text("Order total: "+formatINR(order.totalPaise),{align:"right"});
  doc.moveDown(2).font("Helvetica").fontSize(8).fillColor("#777777").text("This document is an order summary, not a statutory GST tax invoice. The seller's legal, GST and invoice particulars must be confirmed before issuing a tax invoice.",{align:"left"});
  doc.end();
 });
 return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="YOI-KIJI-${order.orderNumber}.pdf"`,"Cache-Control":"private, no-store"}});
}
