import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
export const metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  return <main className="commerce-page"><section className="password-recovery-panel"><p className="eyebrow">ACCOUNT SECURITY</p><h1>Find your way<br/><em>back in.</em></h1><p>Enter the email address linked to your YOI KIJI account. If an account exists, we will send a secure reset link that expires after 30 minutes.</p><PasswordRecoveryForm mode="request" /><Link className="password-recovery-back" href="/login">Back to sign in</Link></section></main>;
}
