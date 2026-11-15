"use client";

import { useState } from "react";

type Axis = { id: string; key: string; name: string; type: string; unit: string | null; options: unknown };
type Variant = { id: string; sku: string; label: string; inventoryQty: number; pricePaise: number | null; isActive: boolean };

export function AdminVariantForm({ productId, axes = [], initialVariants = [] }: { productId: string; axes?: Axis[]; initialVariants?: Variant[] }) {
  const [open,setOpen]=useState(false);
  const [values,setValues]=useState<Record<string,string>>({});
  const [manualLabel,setManualLabel]=useState("");
  const [sku,setSku]=useState("");
  const [price,setPrice]=useState("");
  const [stock,setStock]=useState("0");
  const [variants,setVariants]=useState(initialVariants);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  function update(key:string,value:string){setValues(old=>({...old,[key]:value}));}
  const generatedLabel=axes.length?axes.map(axis=>`${axis.name}: ${values[axis.key]??""}`).join(" / "):manualLabel;
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      if(axes.some(axis=>!values[axis.key]))throw new Error("Choose a value for every variant option.");
      const attributes=Object.fromEntries(axes.map(axis=>[axis.key,values[axis.key]]));
      const response=await fetch(`/api/admin/products/${productId}/variants`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({label:generatedLabel,sku,pricePaise:price?Math.round(Number(price)*100):undefined,inventoryQty:Number(stock),isActive:true,attributes})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to create variant.");
      setVariants(old=>[...old,data.variant]);setMessage("Variant SKU created.");setValues({});setSku("");setPrice("");setStock("0");setManualLabel("");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to add variant.");}
    finally{setBusy(false);}
  }
  return <div className="admin-variant">
    <button type="button" onClick={()=>setOpen(v=>!v)}>{open?"Close variant manager −":"Manage variants / SKUs +"}</button>
    {variants.length>0&&<div className="admin-variant-list">{variants.map(v=><div key={v.id}><strong>{v.label}</strong><span>{v.sku}</span><span>{v.inventoryQty} in stock</span><span>{v.isActive?"Active":"Archived"}</span></div>)}</div>}
    {open&&<form onSubmit={submit}>
      {axes.length?axes.map(axis=>{
        const options=Array.isArray(axis.options)?axis.options.filter((v):v is string=>typeof v==="string"):[];
        return <label key={axis.id}>{axis.name}{axis.unit? ` (${axis.unit})`:""}<select required value={values[axis.key]??""} onChange={e=>update(axis.key,e.target.value)}><option value="">Choose…</option>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
      }):<label>Variant option label<input required value={manualLabel} onChange={e=>setManualLabel(e.target.value)} placeholder="e.g. Single / Sage" /></label>}
      <input required placeholder="Variant SKU" value={sku} onChange={e=>setSku(e.target.value)}/>
      <input placeholder="Price override (INR)" type="number" min="0" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/>
      <input required aria-label="Variant stock" type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)}/>
      <button disabled={busy}>{busy?"Saving…":"Create SKU"}</button>
      {message&&<small role="status">{message}</small>}
    </form>}
  </div>;
}
