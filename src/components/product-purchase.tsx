"use client";
import { useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
type Variant={id:string;label:string;inventoryQty:number;pricePaise:number|null};
export function ProductPurchase({productId,variants,hasVariants,inventoryQty}:{productId:string;variants:Variant[];hasVariants:boolean;inventoryQty:number}){
 const [selected,setSelected]=useState("");
 const active=variants.find(v=>v.id===selected);
 const unavailable=hasVariants?(!active||active.inventoryQty<1):inventoryQty<1;
 return <><p className="stock-note">{unavailable?"Currently unavailable":"Available to order"}</p>{hasVariants&&<label className="purchase-variant">Select size / option<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose an option</option>{variants.map(v=><option key={v.id} value={v.id} disabled={v.inventoryQty<1}>{v.label}{v.inventoryQty<1?" — out of stock":""}</option>)}</select></label>}<AddToCartButton productId={productId} variantId={selected||undefined} disabled={unavailable}/></>;
}
