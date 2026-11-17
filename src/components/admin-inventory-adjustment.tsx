"use client";
import { useState } from "react";
type Product={id:string;name:string;sku:string;inventoryQty:number;variants:{id:string;label:string;sku:string;inventoryQty:number}[]};
export function AdminInventoryAdjustment({products}:{products:Product[]}){
 const [productId,setProductId]=useState(products[0]?.id??""),[variantId,setVariantId]=useState(""),[direction,setDirection]=useState("ADD"),[quantity,setQuantity]=useState("1"),[reason,setReason]=useState("PURCHASE_RECEIVED"),[reference,setReference]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const selected=products.find(p=>p.id===productId),variants=selected?.variants??[];
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const amount=Number(quantity);if(!Number.isSafeInteger(amount)||amount<1)throw new Error("Enter a whole quantity greater than zero.");const response=await fetch("/api/admin/inventory/adjust",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,...(variantId?{variantId}:{}),quantityDelta:direction==="ADD"?amount:-amount,reason,reference:reference||undefined})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Stock adjustment failed.");setMessage("Stock updated. Ledger entry recorded.");setQuantity("1");setReference("");window.location.reload();}catch(err){setMessage(err instanceof Error?err.message:"Stock adjustment failed.");}finally{setBusy(false);}}
 return <section className="admin-content-panel inventory-adjustment"><div className="admin-section-heading"><h2>Adjust stock</h2><span>Every change is recorded in the inventory ledger</span></div>
  <form className="admin-content-form" onSubmit={submit}>
   <label>Product<select required value={productId} onChange={e=>{setProductId(e.target.value);setVariantId("");}}>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku} · {p.inventoryQty} in stock</option>)}</select></label>
   {variants.length>0&&<label>Variant / SKU<select value={variantId} onChange={e=>setVariantId(e.target.value)}><option value="">Main product stock ({selected?.inventoryQty??0})</option>{variants.map(v=><option key={v.id} value={v.id}>{v.label} · {v.sku} · {v.inventoryQty} in stock</option>)}</select></label>}
   <label>Adjustment<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="ADD">Add stock</option><option value="REMOVE">Remove stock</option></select></label>
   <label>Quantity<input required type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
   <label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}><option value="PURCHASE_RECEIVED">Purchase received</option><option value="RETURN_RESTOCKED">Customer return restocked</option><option value="DAMAGED">Damaged / write-off</option><option value="CORRECTION">Stock count correction</option><option value="OTHER">Other</option></select></label>
   <label>Reference / note<input maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Supplier invoice, return number, note"/></label>
   <button disabled={busy||!products.length}>{busy?"Saving adjustment…":"Apply stock adjustment"}</button>
  </form>
  {message&&<p className="admin-feedback" role="status">{message}</p>}
 </section>;
}
