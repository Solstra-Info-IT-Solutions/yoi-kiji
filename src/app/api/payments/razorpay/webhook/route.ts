import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});
 const raw=await request.text();const signature=request.headers.get("x-razorpay-signature")??"";
 const expected=createHmac("sha256",secret).update(raw).digest("hex");const a=Buffer.from(expected),b=Buffer.from(signature);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid signature."},{status:400});
 const eventId=request.headers.get("x-razorpay-event-id");let event:any;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:"Invalid payload."},{status:400})}
 const gatewayOrderId=event?.payload?.payment?.entity?.order_id??event?.payload?.order?.entity?.id;const paymentId=event?.payload?.payment?.entity?.id;
 if(!gatewayOrderId)return NextResponse.json({received:true});
 const payment=await prisma.payment.findUnique({where:{providerOrderId:gatewayOrderId},include:{order:{include:{items:true}}}});
 if(!payment)return NextResponse.json({received:true});
 if((eventId&&payment.webhookEventId===eventId)||payment.status==="CAPTURED")return NextResponse.json({received:true,duplicate:true});
 if(event.event==="payment.captured"||event.event==="order.paid"){
  await prisma.$transaction([prisma.payment.update({where:{id:payment.id},data:{status:"CAPTURED",providerPaymentId:paymentId??undefined,webhookEventId:eventId??undefined}}),prisma.order.update({where:{id:payment.orderId},data:{status:"CONFIRMED"}})]);
 }else if(event.event==="payment.failed"){
  // A failed attempt does not release reserved stock: the same Razorpay order may be retried.
  await prisma.payment.update({where:{id:payment.id},data:{status:"FAILED",providerPaymentId:paymentId??undefined,webhookEventId:eventId??undefined}});

 }
 return NextResponse.json({received:true});
}
