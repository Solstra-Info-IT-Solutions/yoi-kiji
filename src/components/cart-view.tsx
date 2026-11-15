"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
type Line={productId:string;variantId?:string;quantity:number};
type Quoted={productId:string;variantId:string|null;name:string;variantLabel:string|null;sku:string;quantity:number;unitPricePaise:number;lineTotalPaise:number;image:string|null;availableQty:number};
export function CartView(){
 const [cart,setCart]=useState<Line[]>([]);const [lines,setLines]=useState<Quoted[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 async function refresh(next?:Line[]){
  const items=next??cart;setLoading(true);
  try{const r=await fetch("/api/cart/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items})});const data=await r.json();if(!r.ok)throw new Error(data.error);setLines(data.items);setError("");}
  catch(e){setLines([]);setError(e instanceof Error?e.message:"Unable to load your bag.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{try{const saved=localStorage.getItem("yoikiji_cart");const initial:Line[]=saved?JSON.parse(saved):[];setCart(initial);void refresh(initial);}catch{setLoading(false)}},[]);
 function update(next:Line[]){setCart(next);localStorage.setItem("yoikiji_cart",JSON.stringify(next));void refresh(next);}
 const subtotal=lines.reduce((s,l)=>s+l.lineTotalPaise,0);
 return <section className="cart-layout">{loading&&<p>Preparing your bag…</p>}{error&&<p className="form-error" role="alert">{error}</p>}{!loading&&!error&&lines.length===0&&<div className="catalogue-empty"><h2>Your bag is waiting.</h2><p>Explore the collections and find something that feels like home.</p><Link className="primary-link" href="/shop">Explore collections <span>↗</span></Link></div>}{lines.map(line=><article className="cart-line" key={line.productId+line.variantId}><div className="cart-thumb">{line.image?<img src={line.image} alt=""/>:"YOI KIJI"}</div><div className="cart-line-info"><h2>{line.name}</h2><p>{line.variantLabel??"Home textile"} · {line.sku}</p><p>₹{(line.unitPricePaise/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</p><div className="quantity-control"><button onClick={()=>update(cart.map(x=>x.productId===line.productId&&x.variantId===line.variantId?{...x,quantity:Math.max(1,x.quantity-1)}:x))}>−</button><span>{line.quantity}</span><button onClick={()=>update(cart.map(x=>x.productId===line.productId&&x.variantId===line.variantId?{...x,quantity:Math.min(10,x.quantity+1)}:x))}>+</button><button className="remove-line" onClick={()=>update(cart.filter(x=>!(x.productId===line.productId&&x.variantId===line.variantId)))}>Remove</button></div></div></article>)}{lines.length>0&&<aside className="cart-summary"><p>Subtotal <strong>₹{(subtotal/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</strong></p><small>Shipping and applicable taxes are confirmed at checkout.</small><Link className="primary-link" href="/checkout">Continue to checkout <span>↗</span></Link></aside>}</section>
}
