"use client";
import { useState } from "react";
export function AdminProductRow({id,initiallyActive,initialStock}:{id:string;initiallyActive:boolean;initialStock:number}){
 const [active,setActive]=useState(initiallyActive);const [stock,setStock]=useState(String(initialStock));const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function save(data:Record<string,unknown>){setBusy(true);setMessage("");try{const r=await fetch("/api/admin/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage("Saved");}catch(e){setMessage(e instanceof Error?e.message:"Unable to save.");}finally{setBusy(false);}}
 return <div className="admin-row-controls"><button type="button" disabled={busy} onClick={()=>{const next=!active;setActive(next);void save({isActive:next});}}>{active?"Unpublish":"Publish"}</button><label>Stock <input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)}/></label><button type="button" disabled={busy} onClick={()=>void save({inventoryQty:Number(stock)})}>Update stock</button>{message&&<small>{message}</small>}</div>;
}
