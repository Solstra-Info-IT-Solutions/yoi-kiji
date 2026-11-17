import PDFDocument from "pdfkit";
import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { getOrCreateTaxInvoice } from "@/lib/gst-invoice";

export const runtime="nodejs";
type Seller={legalName:string;gstin:string;address:string;stateCode:string};
type Buyer={name:string;address:string;state:string;stateCode:string;phone:string;gstin:string|null};
type Line={description:string;code:string;quantity:number;grossPaise:number;discountPaise:number;taxablePaise:number;gstRateBps:number;taxPaise:number;cgstPaise:number;sgstPaise:number;igstPaise:number};

export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 const order=await prisma.order.findFirst({where:{id,userId:user.id}});
 if(!order)return NextResponse.json({error:"Order not found."},{status:404});
 let invoice;
 try{invoice=await getOrCreateTaxInvoice(id);}
 catch(error){
  const message=error instanceof Error?error.message:"Tax invoice could not be issued.";
  const status=message==="Order not found."?404:message.includes("only after payment")?409:503;
  return NextResponse.json({error:message},{status});
 }
 const seller=invoice.sellerSnapshot as unknown as Seller;
 const buyer=invoice.buyerSnapshot as unknown as Buyer;
 const lines=invoice.lineItems as unknown as Line[];
 const buffer=await new Promise<Buffer>((resolve,reject)=>{
  const doc=new PDFDocument({size:"A4",margin:42});
  const chunks:Buffer[]=[];
  doc.on("data",(chunk:Buffer)=>chunks.push(Buffer.from(chunk)));
  doc.on("end",()=>resolve(Buffer.concat(chunks)));
  doc.on("error",reject);
  doc.fillColor("#0e300e").font("Helvetica-Bold").fontSize(20).text("YOI KIJI");
  doc.fillColor("#222222").font("Helvetica-Bold").fontSize(14).text("TAX INVOICE",{align:"right"});
  doc.font("Helvetica").fontSize(8).text("Invoice No: "+invoice.invoiceNumber,{align:"right"});
  doc.text("Invoice date: "+new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(invoice.issuedAt),{align:"right"});
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(10).text("SUPPLIER");
  doc.font("Helvetica").fontSize(9).text(seller.legalName).text(seller.address).text("GSTIN: "+seller.gstin).text("State code: "+seller.stateCode);
  doc.moveDown();
  doc.font("Helvetica-Bold").text("BILL TO");
  doc.font("Helvetica").text(buyer.name).text(buyer.address).text("State code / Place of supply: "+buyer.stateCode+" — "+buyer.state).text("Phone: "+buyer.phone);
  if(buyer.gstin)doc.text("Buyer GSTIN: "+buyer.gstin);
  doc.moveDown();
  doc.font("Helvetica-Bold").text("Order: "+order.orderNumber+"    Tax type: "+invoice.taxType);
  doc.moveDown(.5);
  for(const line of lines){
   doc.font("Helvetica-Bold").fontSize(9).fillColor("#0e300e").text(line.description);
   doc.font("Helvetica").fontSize(8).fillColor("#333333").text("HSN/SAC: "+line.code+" | Qty: "+line.quantity+" | GST: "+(line.gstRateBps/100)+"%");
   doc.text("Taxable: "+formatINR(line.taxablePaise)+" | CGST: "+formatINR(line.cgstPaise)+" | SGST: "+formatINR(line.sgstPaise)+" | IGST: "+formatINR(line.igstPaise));
   doc.text("Line total (incl. GST): "+formatINR(line.grossPaise-line.discountPaise));
   doc.moveDown(.7);
  }
  doc.moveDown();
  doc.font("Helvetica").fontSize(9).fillColor("#333333").text("Taxable value: "+formatINR(invoice.taxablePaise),{align:"right"});
  doc.text("Total GST: "+formatINR(invoice.taxPaise),{align:"right"});
  doc.text("Shipping (incl. GST): "+formatINR(invoice.shippingPaise),{align:"right"});
  doc.text("Discount: "+formatINR(invoice.discountPaise),{align:"right"});
  doc.moveDown(.5).font("Helvetica-Bold").fontSize(13).fillColor("#0e300e").text("Invoice total: "+formatINR(invoice.totalPaise),{align:"right"});
  doc.moveDown(1.5).font("Helvetica").fontSize(8).fillColor("#666666").text("This invoice is generated from the order and seller tax configuration recorded at issue time. Please retain it for your records.");
  doc.end();
 });
 return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="YOI-KIJI-${invoice.invoiceNumber.replaceAll("/","-")}.pdf"`,"Cache-Control":"private, no-store"}});
}
