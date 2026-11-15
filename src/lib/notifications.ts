import { prisma } from "@/lib/prisma";

function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));}

export async function sendOrderConfirmation(orderId:string){
 const apiKey=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!apiKey||!from)return {sent:false,reason:"Email provider is not configured."};
 const order=await prisma.order.findUnique({where:{id:orderId},include:{user:true,items:true}});
 if(!order)return {sent:false,reason:"Order not found."};
 const event="ORDER_CONFIRMED";
 const log=await prisma.notificationLog.upsert({where:{orderId_channel_event:{orderId,channel:"EMAIL",event}},create:{orderId,channel:"EMAIL",event,status:"PENDING"},update:{}});
 if(log.status==="SENT"||log.status==="SENDING")return {sent:log.status==="SENT",reason:"Already processed."};
 const claim=await prisma.notificationLog.updateMany({where:{id:log.id,status:{in:["PENDING","FAILED"]}},data:{status:"SENDING",error:null}});
 if(claim.count!==1)return {sent:false,reason:"Notification is already being processed."};
 const lines=order.items.map(item=>item.productName+(item.variantLabel?" — "+item.variantLabel:"")+" × "+item.quantity).join("\n");
 const htmlLines=order.items.map(item=>"<li>"+escapeHtml(item.productName+(item.variantLabel?" — "+item.variantLabel:""))+" × "+item.quantity+"</li>").join("");
 try{
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[order.user.email],subject:"Your YOI KIJI order "+order.orderNumber+" is confirmed",text:"Thank you for choosing YOI KIJI. Your order "+order.orderNumber+" is confirmed.\n\n"+lines+"\n\nOrder total: INR "+(order.totalPaise/100).toFixed(2),html:"<div style='font-family:Arial,sans-serif;color:#0e300e;max-width:600px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><p>Thank you for choosing us. Your order is confirmed.</p><h2>"+escapeHtml(order.orderNumber)+"</h2><ul>"+htmlLines+"</ul><p><strong>Order total: INR "+(order.totalPaise/100).toFixed(2)+"</strong></p><p>With care,<br/>YOI KIJI</p></div>"}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.message==="string"?data.message:"Email provider rejected the message.");
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"SENT",providerId:data.id??null,error:null}});
  return {sent:true};
 }catch(error){
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"FAILED",error:error instanceof Error?error.message:"Delivery failed."}});
  return {sent:false,reason:"Email delivery failed."};
 }
}
