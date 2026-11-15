import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const {id}=await params;const order=await prisma.order.findUnique({where:{id},include:{payment:true}});
 if(!order||!order.payment)return NextResponse.json({error:"Order payment not found."},{status:404});
 if(order.payment.status==="REFUNDED"||order.payment.refundStatus==="processed")return NextResponse.json({error:"This payment is already refunded."},{status:409});
 if(order.payment.refundStatus==="pending")return NextResponse.json({error:"A refund is already being processed by Razorpay."},{status:409});
 if(order.payment.status!=="CAPTURED"||!order.payment.providerPaymentId)return NextResponse.json({error:"Only captured payments can be refunded."},{status:409});
 const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!secret)return NextResponse.json({error:"Razorpay is not configured."},{status:503});
 const auth=Buffer.from(keyId+":"+secret).toString("base64");
 const response=await fetch("https://api.razorpay.com/v1/payments/"+order.payment.providerPaymentId+"/refund",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:order.payment.amountPaise,receipt:"refund-"+order.orderNumber,notes:{orderNumber:order.orderNumber}}),cache:"no-store"});
 const data=await response.json();if(!response.ok)return NextResponse.json({error:"Razorpay refund failed. Check the payment dashboard before retrying."},{status:502});
 const processed=data.status==="processed";
 await prisma.$transaction([prisma.payment.update({where:{id:order.payment.id},data:{refundId:data.id,refundStatus:data.status,refundAmountPaise:data.amount,status:processed?"REFUNDED":"CAPTURED"}}),...(processed?[prisma.order.update({where:{id},data:{status:"REFUNDED"}})]:[])]);
 return NextResponse.json({refundInitiated:true,processed,refundId:data.id,status:data.status});
}
