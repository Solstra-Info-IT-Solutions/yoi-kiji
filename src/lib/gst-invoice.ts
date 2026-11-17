import { Prisma } from "@prisma/client";
import { calculateTaxInclusive } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const STATE_CODES: Record<string,string> = {
 "andhra pradesh":"37","arunachal pradesh":"12","assam":"18","bihar":"10","chhattisgarh":"22",
 "goa":"30","gujarat":"24","haryana":"06","himachal pradesh":"02","jharkhand":"20",
 "karnataka":"29","kerala":"32","madhya pradesh":"23","maharashtra":"27","manipur":"14",
 "meghalaya":"17","mizoram":"15","nagaland":"13","odisha":"21","punjab":"03",
 "rajasthan":"08","sikkim":"11","tamil nadu":"33","telangana":"36","tripura":"16",
 "uttar pradesh":"09","uttarakhand":"05","west bengal":"19","delhi":"07",
 "andaman and nicobar islands":"35","chandigarh":"04","dadra and nagar haveli and daman and diu":"26",
 "jammu and kashmir":"01","ladakh":"38","lakshadweep":"31","puducherry":"34"
};

export type GstLine = {
 description:string; code:string; quantity:number; grossPaise:number; discountPaise:number;
 taxablePaise:number; gstRateBps:number; taxPaise:number; cgstPaise:number; sgstPaise:number; igstPaise:number;
};

export function getIndianStateCode(state:string):string|null {
 return STATE_CODES[state.trim().toLowerCase()]??null;
}

export function getFinancialYear(date:Date):string {
 const year=date.getFullYear(),month=date.getMonth();
 const start=month>=3?year:year-1;
 return String(start).slice(-2)+"-"+String(start+1).slice(-2);
}

export function buildGstLines(input:{
 items:Array<{productName:string;variantLabel:string|null;hsnCode:string|null;quantity:number;unitPricePaise:number;gstRateBps:number}>;
 subtotalPaise:number;discountPaise:number;shippingPaise:number;shippingTaxRateBps:number;
 intraState:boolean;shippingSacCode:string;
}):GstLine[] {
 const grossTotal=input.items.reduce((sum,item)=>sum+item.unitPricePaise*item.quantity,0);
 if(grossTotal!==input.subtotalPaise)throw new Error("Order item subtotal does not match the recorded order subtotal.");
 let discountRemaining=input.discountPaise;
 const lines:GstLine[]=[];
 input.items.forEach((item,index)=>{
  const grossPaise=item.unitPricePaise*item.quantity;
  const discountPaise=index===input.items.length-1?discountRemaining:Math.floor(input.discountPaise*grossPaise/Math.max(1,grossTotal));
  discountRemaining-=discountPaise;
  const discountedGross=grossPaise-discountPaise;
  const taxPaise=calculateTaxInclusive(discountedGross,item.gstRateBps);
  const cgstPaise=input.intraState?Math.floor(taxPaise/2):0;
  const sgstPaise=input.intraState?taxPaise-cgstPaise:0;
  lines.push({description:item.productName+(item.variantLabel?" — "+item.variantLabel:""),code:item.hsnCode??"",quantity:item.quantity,grossPaise,discountPaise,taxablePaise:discountedGross-taxPaise,gstRateBps:item.gstRateBps,taxPaise,cgstPaise,sgstPaise,igstPaise:input.intraState?0:taxPaise});
 });
 if(input.shippingPaise>0){
  const taxPaise=calculateTaxInclusive(input.shippingPaise,input.shippingTaxRateBps);
  const cgstPaise=input.intraState?Math.floor(taxPaise/2):0;
  const sgstPaise=input.intraState?taxPaise-cgstPaise:0;
  lines.push({description:"Shipping and handling",code:input.shippingSacCode,quantity:1,grossPaise:input.shippingPaise,discountPaise:0,taxablePaise:input.shippingPaise-taxPaise,gstRateBps:input.shippingTaxRateBps,taxPaise,cgstPaise,sgstPaise,igstPaise:input.intraState?0:taxPaise});
 }
 return lines;
}

function requiredEnv(name:string):string {
 const value=process.env[name]?.trim();
 if(!value)throw new Error("GST invoice configuration is incomplete: "+name+" is required.");
 return value;
}

export async function getOrCreateTaxInvoice(orderId:string) {
 const existing=await prisma.taxInvoice.findUnique({where:{orderId}});
 if(existing)return existing;
 const order=await prisma.order.findUnique({where:{id:orderId},include:{items:true,payment:true}});
 if(!order)throw new Error("Order not found.");
 if(order.payment?.status!=="CAPTURED")throw new Error("A GST tax invoice is available only after payment is captured.");
 if(order.status==="CANCELLED"||order.status==="REFUNDED")throw new Error("A cancelled or refunded order cannot receive a new tax invoice.");

 const sellerGstin=requiredEnv("SELLER_GSTIN").toUpperCase();
 const sellerStateCode=requiredEnv("SELLER_STATE_CODE");
 const sellerLegalName=requiredEnv("SELLER_LEGAL_NAME");
 const sellerAddress=requiredEnv("SELLER_ADDRESS");
 const gstinPattern=/^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
 if(!gstinPattern.test(sellerGstin)||sellerGstin.slice(0,2)!==sellerStateCode)throw new Error("Seller GSTIN and seller state code do not match.");
 if(!/^\\d{2}$/.test(sellerStateCode))throw new Error("SELLER_STATE_CODE must be a two-digit GST state code.");
 if(process.env.GST_PRICES_INCLUDE_TAX!=="true")throw new Error("GST-inclusive pricing must be confirmed before issuing tax invoices.");
 const shippingTaxRaw=requiredEnv("SHIPPING_TAX_RATE_BPS");
 if(!/^\\d+$/.test(shippingTaxRaw)||Number(shippingTaxRaw)>10000)throw new Error("Shipping GST rate configuration is invalid.");
 const shippingSacCode=order.shippingPaise>0?requiredEnv("SHIPPING_SAC_CODE"):"";
 if(order.items.some(item=>!item.hsnCode))throw new Error("Every invoiced product must have an HSN code.");
 const buyer=order.billingAddress as Record<string,string>;
 const buyerStateCode=getIndianStateCode(buyer.state??"");
 if(!buyerStateCode)throw new Error("The buyer's state could not be mapped to an Indian GST place-of-supply code.");
 const intraState=buyerStateCode===sellerStateCode;
 const lines=buildGstLines({items:order.items,subtotalPaise:order.subtotalPaise,discountPaise:order.discountPaise,shippingPaise:order.shippingPaise,shippingTaxRateBps:Number(shippingTaxRaw),intraState,shippingSacCode});
 const calculatedTax=lines.reduce((sum,line)=>sum+line.taxPaise,0);
 if(calculatedTax!==order.taxPaise)throw new Error("Calculated line-level GST does not reconcile with the recorded order tax. Invoice issuance has been blocked for review.");
 const issuedAt=new Date(),financialYear=getFinancialYear(issuedAt);
 const sellerSnapshot={legalName:sellerLegalName,gstin:sellerGstin,address:sellerAddress,stateCode:sellerStateCode};
 const buyerSnapshot={name:buyer.fullName??"",address:Object.values(buyer).filter(Boolean).join(", "),state:buyer.state??"",stateCode:buyerStateCode,phone:buyer.phone??"",gstin:buyer.gstin??null};
 const taxablePaise=lines.reduce((sum,line)=>sum+line.taxablePaise,0);
 try {
  return await prisma.$transaction(async tx=>{
   const sequence=await tx.invoiceSequence.upsert({
    where:{financialYear},
    create:{financialYear,lastNumber:1},
    update:{lastNumber:{increment:1}},
   });
   const invoiceNumber="YK/"+financialYear+"/"+String(sequence.lastNumber).padStart(5,"0");
   return tx.taxInvoice.create({data:{
    orderId:order.id,invoiceNumber,financialYear,sequenceNumber:sequence.lastNumber,issuedAt,
    sellerSnapshot:sellerSnapshot as Prisma.InputJsonValue,
    buyerSnapshot:buyerSnapshot as Prisma.InputJsonValue,
    lineItems:lines as unknown as Prisma.InputJsonValue,
    taxablePaise,taxPaise:calculatedTax,shippingPaise:order.shippingPaise,discountPaise:order.discountPaise,totalPaise:order.totalPaise,
    placeOfSupplyCode:buyerStateCode,taxType:intraState?"INTRASTATE":"INTERSTATE",
   }});
  });
 } catch(error) {
  const raced=await prisma.taxInvoice.findUnique({where:{orderId}});
  if(raced)return raced;
  throw error;
 }
}
