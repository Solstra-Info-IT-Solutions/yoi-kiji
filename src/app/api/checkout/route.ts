import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTaxInclusive } from "@/lib/money";

const schema=z.object({
 items:z.array(z.object({productId:z.string().min(1),variantId:z.string().optional(),quantity:z.number().int().min(1).max(10)})).min(1).max(30),
 shippingAddress:z.object({fullName:z.string().min(2).max(100),phone:z.string().min(8).max(20),line1:z.string().min(4).max(180),line2:z.string().max(180).optional(),city:z.string().min(2).max(80),state:z.string().min(2).max(80),postalCode:z.string().min(5).max(10),countryCode:z.string().length(2).default("IN")})
});
function fail(message:string,status=400){return NextResponse.json({error:message},{status});}
export async function POST(request:NextRequest){
 const user=await getCurrentUser();if(!user)return fail("Please sign in before checkout.",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail("Please check your delivery details and bag.");
 const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
 if(!keyId||!secret)return fail("Online checkout is not activated yet. Please contact the store.",503);
 const shippingRaw=process.env.SHIPPING_FLAT_RATE_PAISE;
 if(!shippingRaw||!/^\d+$/.test(shippingRaw))return fail("Delivery pricing is being configured. Checkout will open shortly.",503);
 const shippingPaise=Number(shippingRaw);if(!Number.isSafeInteger(shippingPaise))return fail("Delivery pricing is not configured correctly.",503);
 const orderNumber=`YK-${randomUUID().replace(/-/g,"").slice(0,12).toUpperCase()}`;
 try{
  const products=await prisma.product.findMany({where:{id:{in:parsed.data.items.map(i=>i.productId)},isActive:true},include:{variants:{where:{isActive:true}}}});
  if(products.length!==new Set(parsed.data.items.map(i=>i.productId)).size)return fail("One or more products are unavailable.",409);
  const lineItems=parsed.data.items.map(item=>{
   const product=products.find(p=>p.id===item.productId)!;const variant=item.variantId?product.variants.find(v=>v.id===item.variantId):null;
   if(item.variantId&&!variant)throw new Error("Selected product option is unavailable.");
   if(product.hasVariants&&!variant)throw new Error("Please select an option for each product.");
   return {product,variant,quantity:item.quantity,price:variant?.pricePaise??product.pricePaise,sku:variant?.sku??product.sku,label:variant?.label??null};
  });
  const subtotalPaise=lineItems.reduce((s,l)=>s+l.price*l.quantity,0);
  const taxPaise=lineItems.reduce((s,l)=>s+calculateTaxInclusive(l.price*l.quantity,l.product.gstRateBps),0);
  const totalPaise=subtotalPaise+shippingPaise;
  if(!Number.isSafeInteger(totalPaise)||totalPaise<100)return fail("The order total is invalid.");
  const basic=Buffer.from(`${keyId}:${secret}`).toString("base64");
  const gatewayResponse=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{"Authorization":`Basic ${basic}`,"Content-Type":"application/json"},body:JSON.stringify({amount:totalPaise,currency:"INR",receipt:orderNumber,notes:{customerId:user.id}}),cache:"no-store"});
  const gateway=await gatewayResponse.json();
  if(!gatewayResponse.ok||!gateway.id)return fail("Payment service could not create an order. Please try again.",502);
  try{
   const order=await prisma.$transaction(async tx=>{
    for(const line of lineItems){
     const result=line.variant
      ? await tx.productVariant.updateMany({where:{id:line.variant.id,inventoryQty:{gte:line.quantity},isActive:true},data:{inventoryQty:{decrement:line.quantity}}})
      : await tx.product.updateMany({where:{id:line.product.id,inventoryQty:{gte:line.quantity},isActive:true},data:{inventoryQty:{decrement:line.quantity}}});
     if(result.count!==1)throw new Error(`Insufficient stock for ${line.product.name}.`);
    }
    return tx.order.create({data:{
     orderNumber,userId:user.id,status:"PENDING",subtotalPaise,taxPaise,shippingPaise,totalPaise,
     shippingAddress:parsed.data.shippingAddress,billingAddress:parsed.data.shippingAddress,
     items:{create:lineItems.map(l=>({productId:l.product.id,variantId:l.variant?.id,productName:l.product.name,variantLabel:l.label,sku:l.sku,quantity:l.quantity,unitPricePaise:l.price,gstRateBps:l.product.gstRateBps}))},
     payment:{create:{provider:"RAZORPAY",providerOrderId:gateway.id,amountPaise:totalPaise,currency:"INR",status:"CREATED"}}
    }});
   });
   return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,razorpayOrderId:gateway.id,amount:totalPaise,currency:"INR",keyId});
  }catch(error){
   await fetch(`https://api.razorpay.com/v1/orders/${gateway.id}`,{method:"GET",headers:{"Authorization":`Basic ${basic}`},cache:"no-store"}).catch(()=>null);
   return fail(error instanceof Error?error.message:"Could not reserve your items.",409);
  }
 }catch(error){return fail(error instanceof Error?error.message:"Checkout could not be started.",400);}
}
