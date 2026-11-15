"use client";
import { useState } from "react";
export function AdminOrderActions({id,status}:{id:string;status:string}){
 const [next,setNext]=useState(status==="CONFIRMED"?"PROCESSING":status==="PROCESSING"?"SHIPPED":status==="SHIPPED"?"DELIVERED":"");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function update(){if(!next)return;setBusy(true);setMessage("");try{const r=await fetch("/api/admin/orders/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage("Updated");window.location.reload();}catch(e){setMessage(e instanceof Error?e.message:"Unable to update.");}finally{setBusy(false);}}
 return <div className="admin-order-actions">{["CONFIRMED","PROCESSING","SHIPPED"].includes(status)&&<><select value={next} onChange={e=>setNext(e.target.value)}><option value="">Update status…</option>{(status==="CONFIRMED"?["PROCESSING","CANCELLED"]:status==="PROCESSING"?["SHIPPED","CANCELLED"]:["DELIVERED"]).map(s=><option key={s} value={s}>{s}</option>)}</select><button disabled={!next||busy} onClick={update}>Save</button></>}{message&&<small>{message}</small>}</div>;
}
