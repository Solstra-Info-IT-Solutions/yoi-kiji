import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema=z.object({razorpay_order_id:z.string(),razorpay_payment_id:z.string(),razorpay_signature:z.string()});
export async function POST(request:NextRequest){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid payment response."},{status:400});
 const secret=process.env.RAZORPAY_KEY_SECRET;if(!secret)return NextResponse.json({error:"Payment verification is unavailable."},{status:503});
 const expected=createHmac("sha256",secret).update(`${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`).digest("hex");
 const a=Buffer.from(expected),b=Buffer.from(parsed.data.razorpay_signature);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Payment signature could not be verified."},{status:400});
 const payment=await prisma.payment.findUnique({where:{providerOrderId:parsed.data.razorpay_order_id},include:{order:true}});
 if(!payment||payment.order.userId!==user.id)return NextResponse.json({error:"Order not found."},{status:404});
 await prisma.$transaction([
  prisma.payment.update({where:{id:payment.id},data:{status:"CAPTURED",providerPaymentId:parsed.data.razorpay_payment_id}}),
  prisma.order.update({where:{id:payment.orderId},data:{status:"CONFIRMED"}})
 ]);
 return NextResponse.json({verified:true,orderNumber:payment.order.orderNumber});
}
