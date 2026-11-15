"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response=await fetch(`/api/auth/${mode==="register"?"register":"login"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error ?? "Unable to continue.");
      router.push("/account"); router.refresh();
    } catch(e) { setError(e instanceof Error?e.message:"Something went wrong."); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>{mode==="register"&&<label>Your name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input required type="password" minLength={mode==="register"?12:1} maxLength={128} autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/>{mode==="register"&&<small>Use at least 12 characters.</small>}</label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-link auth-submit" disabled={busy}>{busy?"Please wait…":mode==="register"?"Create account":"Sign in"} <span>↗</span></button></form>;
}
