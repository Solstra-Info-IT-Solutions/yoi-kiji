import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
export const metadata = { title: "Reset password" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const validToken = /^[a-f0-9]{64}$/i.test(token) ? token : "";
  return <main className="commerce-page"><section className="password-recovery-panel"><p className="eyebrow">ACCOUNT SECURITY</p><h1>A fresh<br/><em>start.</em></h1><p>Choose a new password for your YOI KIJI account. Reset links can only be used once and expire after 30 minutes.</p><PasswordRecoveryForm mode="reset" token={validToken} />{!validToken && <p className="form-error" role="alert">This reset link is missing or malformed. Request a new link to continue.</p>}<Link className="password-recovery-back" href="/login">Back to sign in</Link></section></main>;
}
