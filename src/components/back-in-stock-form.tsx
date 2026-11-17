"use client";
import { useState } from "react";
import type { FormEvent } from "react";
export function BackInStockForm({productId}:{productId:string}){
 const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/stock-alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,email})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Your alert could not be saved.");setMessage(data.message??"We'll email you when it is available.");setEmail("");}catch(error){setMessage(error instanceof Error?error.message:"Your alert could not be saved.");}finally{setBusy(false);}}
 return <form className="back-in-stock-form" onSubmit={submit}><p className="eyebrow">A NOTE WHEN IT RETURNS</p><h3>Waiting for this piece?</h3><p>Leave your email and we'll let you know when it is available again.</p><label htmlFor="stock-alert-email">Email address</label><div><input id="stock-alert-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><button disabled={busy}>{busy?"Saving…":"Notify me"}</button></div>{message&&<small role="status">{message}</small>}</form>;
}
