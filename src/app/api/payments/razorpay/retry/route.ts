import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);const orderId=typeof body?.orderId==="string"?body.orderId:"";
 const order=await prisma.order.findFirst({where:{id:orderId,userId:user.id},include:{payment:true}});
 if(!order||!order.payment)return NextResponse.json({error:"Order not found."},{status:404});
 if(order.status!=="PENDING"||order.payment.status==="CAPTURED"||order.payment.status==="REFUNDED")return NextResponse.json({error:"This order is not eligible for payment retry."},{status:409});
 const keyId=process.env.RAZORPAY_KEY_ID;if(!keyId)return NextResponse.json({error:"Payment service is not configured."},{status:503});
 return NextResponse.json({keyId,razorpayOrderId:order.payment.providerOrderId,amount:order.payment.amountPaise,currency:order.payment.currency,orderNumber:order.orderNumber});
}
