import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/notifications";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});
 const raw=await request.text();const signature=request.headers.get("x-razorpay-signature")??"";
 const expected=createHmac("sha256",secret).update(raw).digest("hex");const a=Buffer.from(expected),b=Buffer.from(signature);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid signature."},{status:400});
 const eventId=request.headers.get("x-razorpay-event-id");let event:any;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:"Invalid payload."},{status:400})}
 if(event.event==="refund.processed"||event.event==="refund.failed"){
  const refund=event?.payload?.refund?.entity;const paymentRef=refund?.payment_id;
  if(paymentRef){
   const matched=await prisma.payment.findUnique({where:{providerPaymentId:paymentRef}});
   if(matched){
    const processed=event.event==="refund.processed";
    await prisma.$transaction([prisma.payment.update({where:{id:matched.id},data:{refundId:refund.id??matched.refundId,refundStatus:processed?"processed":"failed",status:processed?"REFUNDED":matched.status,webhookEventId:eventId??undefined}}),...(processed?[prisma.order.update({where:{id:matched.orderId},data:{status:"REFUNDED"}})]:[])]);
   }
  }
  return NextResponse.json({received:true});
 }
 const gatewayOrderId=event?.payload?.payment?.entity?.order_id??event?.payload?.order?.entity?.id;const paymentId=event?.payload?.payment?.entity?.id;
 if(!gatewayOrderId)return NextResponse.json({received:true});
 const payment=await prisma.payment.findUnique({where:{providerOrderId:gatewayOrderId},include:{order:{include:{items:true}}}});
 if(!payment)return NextResponse.json({received:true});
 if((eventId&&payment.webhookEventId===eventId)||payment.status==="CAPTURED"||payment.status==="REFUNDED")return NextResponse.json({received:true,duplicate:true});
 if(event.event==="payment.captured"||event.event==="order.paid"){
  if(payment.order.status==="CANCELLED"){
   const keyId=process.env.RAZORPAY_KEY_ID,apiSecret=process.env.RAZORPAY_KEY_SECRET;
   if(!keyId||!apiSecret||!paymentId)return NextResponse.json({error:"Late payment requires manual refund."},{status:503});
   const auth=Buffer.from(keyId+":"+apiSecret).toString("base64");
   const refundResponse=await fetch("https://api.razorpay.com/v1/payments/"+paymentId+"/refund",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:payment.amountPaise,receipt:"late-"+payment.order.orderNumber}),cache:"no-store"});
   if(!refundResponse.ok)return NextResponse.json({error:"Automatic refund of a late payment failed; reconciliation required."},{status:503});
   const refundData=await refundResponse.json();const processed=refundData.status==="processed";
   await prisma.$transaction([prisma.payment.update({where:{id:payment.id},data:{status:processed?"REFUNDED":"CAPTURED",providerPaymentId:paymentId,webhookEventId:eventId??undefined,refundId:refundData.id,refundStatus:refundData.status,refundAmountPaise:refundData.amount}}),...(processed?[prisma.order.update({where:{id:payment.orderId},data:{status:"REFUNDED"}})]:[])]);
  }else{
   await prisma.$transaction([prisma.payment.update({where:{id:payment.id},data:{status:"CAPTURED",providerPaymentId:paymentId??undefined,webhookEventId:eventId??undefined}}),prisma.order.update({where:{id:payment.orderId},data:{status:"CONFIRMED"}})]);
   await sendOrderConfirmation(payment.orderId);
  }
 }else if(event.event==="payment.failed"){
  // A failed attempt does not release reserved stock: the same Razorpay order may be retried.
  await prisma.payment.update({where:{id:payment.id},data:{status:"FAILED",providerPaymentId:paymentId??undefined,webhookEventId:eventId??undefined}});

 }
 return NextResponse.json({received:true});
}
