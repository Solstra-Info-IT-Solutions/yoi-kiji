"use client";
import Script from "next/script";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
declare global { interface Window { Razorpay?: new (options:Record<string,unknown>)=>{open:()=>void}; } }
type CartLine={productId:string;variantId?:string;quantity:number};
export function CheckoutForm(){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const [form,setForm]=useState({fullName:"",phone:"",line1:"",line2:"",city:"",state:"",postalCode:"",countryCode:"IN"});
 function change(key:keyof typeof form,value:string){setForm(old=>({...old,[key]:value}));}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const items:CartLine[]=JSON.parse(localStorage.getItem("yoikiji_cart")??"[]");
   if(!items.length)throw new Error("Your bag is empty.");
   let checkoutKey=localStorage.getItem("yoikiji_checkout_key");
   if(!checkoutKey){checkoutKey=crypto.randomUUID();localStorage.setItem("yoikiji_checkout_key",checkoutKey);}
   const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({checkoutKey,items,shippingAddress:form})});
   const data=await response.json();if(!response.ok)throw new Error(data.error??"Checkout could not start.");
   if(!window.Razorpay)throw new Error("Payment window is still loading. Please try again.");
   const payment=new window.Razorpay({key:data.keyId,amount:data.amount,currency:data.currency,name:"YOI KIJI",description:"Order "+data.orderNumber,order_id:data.razorpayOrderId,prefill:{name:form.fullName,contact:form.phone},theme:{color:"#0e300e"},handler:async(result:Record<string,string>)=>{
    const verified=await fetch("/api/payments/razorpay/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)});
    const resultData=await verified.json();if(!verified.ok||resultData.verified!==true){setError(resultData.error??resultData.message??"Payment is awaiting capture confirmation. Check your order history shortly.");return;}
    localStorage.removeItem("yoikiji_cart");localStorage.removeItem("yoikiji_checkout_key");router.push("/account/orders?placed="+encodeURIComponent(resultData.orderNumber));router.refresh();
   }});
   payment.open();
  }catch(err){setError(err instanceof Error?err.message:"Unable to start checkout.");}
  finally{setBusy(false);}
 }
 return <><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/><form className="checkout-form" onSubmit={submit}><div className="checkout-fields"><label>Full name<input required minLength={2} value={form.fullName} onChange={e=>change("fullName",e.target.value)} autoComplete="name"/></label><label>Phone number<input required minLength={8} maxLength={20} value={form.phone} onChange={e=>change("phone",e.target.value)} autoComplete="tel"/></label><label className="wide">Address line 1<input required value={form.line1} onChange={e=>change("line1",e.target.value)} autoComplete="address-line1"/></label><label className="wide">Address line 2 (optional)<input value={form.line2} onChange={e=>change("line2",e.target.value)} autoComplete="address-line2"/></label><label>City<input required value={form.city} onChange={e=>change("city",e.target.value)} autoComplete="address-level2"/></label><label>State<input required value={form.state} onChange={e=>change("state",e.target.value)} autoComplete="address-level1"/></label><label>PIN code<input required minLength={5} maxLength={10} value={form.postalCode} onChange={e=>change("postalCode",e.target.value)} autoComplete="postal-code"/></label></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-link checkout-submit" disabled={busy}>{busy?"Preparing secure payment…":"Continue to secure payment"} <span>↗</span></button><p className="checkout-disclaimer">Payments are securely processed by Razorpay. Your order is confirmed only after payment verification.</p></form></>;
}
