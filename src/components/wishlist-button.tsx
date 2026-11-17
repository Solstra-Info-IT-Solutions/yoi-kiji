"use client";
import { useEffect,useState } from "react";
export function WishlistButton({productId}:{productId:string}){
 const [saved,setSaved]=useState(false),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/account/wishlist",{cache:"no-store"}).then(async r=>{if(!r.ok)return;setSignedIn(true);const data=await r.json();setSaved(data.items.some((item:{productId:string})=>item.productId===productId));}).catch(()=>{});},[productId]);
 async function toggle(){setBusy(true);setMessage("");try{const response=saved?await fetch("/api/account/wishlist?productId="+productId,{method:"DELETE"}):await fetch("/api/account/wishlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Wishlist update failed.");setSaved(!saved);setSignedIn(true);setMessage(saved?"Removed from your wishlist.":"Saved to your wishlist.");}catch(e){setMessage(e instanceof Error?e.message:"Wishlist update failed.");}finally{setBusy(false);}}
 return <div className="wishlist-control"><button type="button" disabled={busy} aria-pressed={saved} onClick={toggle}>{busy?"Saving…":saved?"♥ Saved to wishlist":"♡ Save to wishlist"}</button>{message&&<small role="status">{message}</small>}</div>;
}
