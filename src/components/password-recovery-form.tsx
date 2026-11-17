"use client";
import { FormEvent, useState } from "react";

export function PasswordRecoveryForm({ mode, token = "" }: { mode: "request" | "reset"; token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (mode === "reset" && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(mode === "request" ? "/api/auth/forgot-password" : "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "request" ? { email } : { token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to continue.");
      setMessage(data.message ?? "Your password has been updated.");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="password-recovery-form" onSubmit={submit}>
    {mode === "request" ? <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label> : <>
      <label>New password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /><small>Use at least 12 characters.</small></label>
      <label>Confirm new password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="password-recovery-feedback" role="status">{message}</p>}
    <button type="submit" disabled={busy || (mode === "reset" && !token)}>{busy ? "Please wait…" : mode === "request" ? "Send reset link" : "Update password"}</button>
  </form>;
}
