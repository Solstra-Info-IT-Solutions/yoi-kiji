import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTaxInclusive } from "@/lib/money";
import { checkDelhiveryServiceability } from "@/lib/shipping/delhivery";

const schema=z.object({
 checkoutKey:z.string().uuid(),
 couponCode:z.string().trim().min(3).max(32).optional(),
 items:z.array(z.object({productId:z.string().min(1),variantId:z.string().optional(),quantity:z.number().int().min(1).max(10)})).min(1).max(30),
 shippingAddress:z.object({fullName:z.string().min(2).max(100),phone:z.string().min(8).max(20),line1:z.string().min(4).max(180),line2:z.string().max(180).optional(),city:z.string().min(2).max(80),state:z.string().min(2).max(80),postalCode:z.string().min(5).max(10),countryCode:z.string().length(2).default("IN")})
});
function fail(message:string,status=400){return NextResponse.json({error:message},{status});}
export async function POST(request:NextRequest){
 const user=await getCurrentUser();if(!user)return fail("Please sign in before checkout.",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail("Please check your delivery details and bag.");
 if(parsed.data.shippingAddress.countryCode!=="IN")return fail("International delivery is not enabled yet.",400);
 if(!/^\d{6}$/.test(parsed.data.shippingAddress.postalCode))return fail("Enter a valid 6-digit Indian PIN code.",400);
 const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
 if(!keyId||!secret)return fail("Online checkout is not activated yet. Please contact the store.",503);
 if(process.env.GST_PRICES_INCLUDE_TAX!=="true")return fail("Tax configuration is pending confirmation. Checkout will open once the seller tax treatment is approved.",503);
 const shippingRaw=process.env.SHIPPING_FLAT_RATE_PAISE;
 if(!shippingRaw||!/^\d+$/.test(shippingRaw))return fail("Delivery pricing is being configured. Checkout will open shortly.",503);
 const shippingPaise=Number(shippingRaw);if(!Number.isSafeInteger(shippingPaise))return fail("Delivery pricing is not configured correctly.",503);
 const shippingTaxRaw=process.env.SHIPPING_TAX_RATE_BPS;
 if(!shippingTaxRaw||!/^\d+$/.test(shippingTaxRaw)||Number(shippingTaxRaw)>10000)return fail("Shipping tax treatment is awaiting seller confirmation.",503);
 const shippingTaxRateBps=Number(shippingTaxRaw);
 if(!process.env.SELLER_GSTIN&&shippingTaxRateBps>0)return fail("Shipping GST requires the seller GST registration details.",503);
  if(process.env.SHIPPING_DEFAULT_PROVIDER==="ATS")return fail("Amazon Shipping integration is awaiting the seller's official API credentials.",503);
  if(process.env.SHIPPING_DEFAULT_PROVIDER==="DELHIVERY"){
   try{const service=await checkDelhiveryServiceability(parsed.data.shippingAddress.postalCode);if(!service.serviceable)return fail("Delhivery does not currently service this PIN code.",400);}
   catch{return fail("We could not confirm delivery serviceability. Please try again later.",503);}
  }
 const existing=await prisma.order.findFirst({where:{checkoutKey:parsed.data.checkoutKey,userId:user.id},include:{payment:true}});
 if(existing?.payment?.providerOrderId){if(existing.payment.status==="CAPTURED")return fail("This checkout has already been paid.",409);return NextResponse.json({orderId:existing.id,orderNumber:existing.orderNumber,razorpayOrderId:existing.payment.providerOrderId,amount:existing.totalPaise,currency:existing.currency,keyId});}
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
  if(process.env.SELLER_GSTIN&&lineItems.some(l=>!l.product.hsnCode))return fail("A product HSN code is missing. Please contact the store.",503);
  if(!process.env.SELLER_GSTIN&&lineItems.some(l=>l.product.gstRateBps>0))return fail("Product GST rates require the seller GST registration details.",503);
  const subtotalPaise=lineItems.reduce((s,l)=>s+l.price*l.quantity,0);
  const productTaxPaise=lineItems.reduce((s,l)=>s+calculateTaxInclusive(l.price*l.quantity,l.product.gstRateBps),0);
  let coupon: { id: string; code: string; discountType: "PERCENTAGE" | "FIXED_AMOUNT"; discountValue: number; maximumDiscountPaise: number | null; usageLimit: number | null; usageCount: number; minimumSubtotalPaise: number; startsAt: Date | null; endsAt: Date | null; isActive: boolean } | null = null;
  let discountPaise=0;
  const couponCode=parsed.data.couponCode?.trim().toUpperCase();
  if(couponCode){
   coupon=await prisma.coupon.findUnique({where:{code:couponCode}});
   const now=new Date();
   if(!coupon||!coupon.isActive||(coupon.startsAt&&coupon.startsAt>now)||(coupon.endsAt&&coupon.endsAt<now)||(coupon.usageLimit!==null&&coupon.usageCount>=coupon.usageLimit))return fail("This promotion code is invalid, expired or no longer available.",400);
   if(subtotalPaise<coupon.minimumSubtotalPaise)return fail("Your bag does not meet the minimum order value for this promotion.",400);
   discountPaise=coupon.discountType==="PERCENTAGE"?Math.floor(subtotalPaise*coupon.discountValue/10000):coupon.discountValue;
   if(coupon.maximumDiscountPaise!==null)discountPaise=Math.min(discountPaise,coupon.maximumDiscountPaise);
   discountPaise=Math.min(discountPaise,subtotalPaise);
  }
  const appliedCoupon=coupon;
  const customerId=user.id;
  const discountTaxPaise=subtotalPaise>0?Math.round(productTaxPaise*discountPaise/subtotalPaise):0;
  const taxPaise=productTaxPaise-discountTaxPaise+calculateTaxInclusive(shippingPaise,shippingTaxRateBps);
  const totalPaise=subtotalPaise+shippingPaise-discountPaise;
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
     await tx.inventoryMovement.create({data:{productId:line.product.id,variantId:line.variant?.id,quantityDelta:-line.quantity,reason:"ORDER_RESERVATION",reference:orderNumber,createdBy:customerId}});
    }
    const existingAddress=await tx.address.findFirst({where:{userId:customerId,line1:parsed.data.shippingAddress.line1,postalCode:parsed.data.shippingAddress.postalCode,phone:parsed.data.shippingAddress.phone}});
    if(!existingAddress)await tx.address.create({data:{userId:user.id,...parsed.data.shippingAddress,isDefault:!(await tx.address.count({where:{userId:customerId}}))}});
    const createdOrder=await tx.order.create({data:{
     orderNumber,checkoutKey:parsed.data.checkoutKey,couponCode:appliedCoupon?.code??null,discountPaise,reservationExpiresAt:new Date(Date.now()+30*60*1000),userId:customerId,status:"PENDING",subtotalPaise,taxPaise,shippingPaise,totalPaise,
     shippingAddress:parsed.data.shippingAddress,billingAddress:parsed.data.shippingAddress,
     items:{create:lineItems.map(l=>({productId:l.product.id,variantId:l.variant?.id,productName:l.product.name,variantLabel:l.label,sku:l.sku,hsnCode:l.product.hsnCode,quantity:l.quantity,unitPricePaise:l.price,gstRateBps:l.product.gstRateBps}))},
     payment:{create:{provider:"RAZORPAY",providerOrderId:gateway.id,amountPaise:totalPaise,currency:"INR",status:"CREATED"}}
    }});
    if(appliedCoupon){
     const usageLimit=appliedCoupon.usageLimit;
     const reserved=await tx.coupon.updateMany({where:{id:appliedCoupon.id,isActive:true,...(usageLimit!==null?{usageCount:{lt:usageLimit}}:{})},data:{usageCount:{increment:1}}});
     if(reserved.count!==1)throw new Error("This promotion has just reached its usage limit.");
     await tx.couponRedemption.create({data:{couponId:appliedCoupon.id,orderId:createdOrder.id,userId:customerId,discountPaise}});
    }
    return createdOrder;
   });
   return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,razorpayOrderId:gateway.id,amount:totalPaise,currency:"INR",keyId});
  }catch(error){
   const existingAfterRace=await prisma.order.findFirst({where:{checkoutKey:parsed.data.checkoutKey,userId:user.id},include:{payment:true}});
   if(existingAfterRace?.payment?.providerOrderId)return NextResponse.json({orderId:existingAfterRace.id,orderNumber:existingAfterRace.orderNumber,razorpayOrderId:existingAfterRace.payment.providerOrderId,amount:existingAfterRace.totalPaise,currency:existingAfterRace.currency,keyId});
   await fetch(`https://api.razorpay.com/v1/orders/${gateway.id}`,{method:"GET",headers:{"Authorization":`Basic ${basic}`},cache:"no-store"}).catch(()=>null);
   return fail(error instanceof Error?error.message:"Could not reserve your items.",409);
  }
 }catch(error){return fail(error instanceof Error?error.message:"Checkout could not be started.",400);}
}
