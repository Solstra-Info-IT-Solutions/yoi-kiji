import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Sign in" };
export default function LoginPage() { return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Sign in</div><section className="auth-panel"><p className="eyebrow">WELCOME BACK</p><h1>Good to have<br/><em>you here.</em></h1><AuthForm mode="login"/><p className="auth-switch">New to YOI KIJI? <Link href="/register">Create an account</Link></p></section></main>; }
