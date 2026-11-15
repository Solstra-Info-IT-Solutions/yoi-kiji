import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account" };
export default function RegisterPage() { return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Create account</div><section className="auth-panel"><p className="eyebrow">JOIN YOI KIJI</p><h1>Make yourself<br/><em>at home.</em></h1><AuthForm mode="register"/><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></section></main>; }
