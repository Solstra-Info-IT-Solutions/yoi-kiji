import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await getCurrentUser();
  return <main className="commerce-page account-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Account</div><section className="account-panel"><p className="eyebrow">YOUR YOI KIJI ACCOUNT</p><h1>{user ? `Welcome, ${user.name ?? "back"}.` : "A more personal way to shop."}</h1>{user ? <><p>You are signed in as {user.email}.</p><div className="account-actions"><Link className="primary-link" href="/account/orders">View your orders <span>↗</span></Link><Link className="text-link" href="/account/addresses">Saved addresses <span>↗</span></Link><LogoutButton/></div></> : <><p>Sign in or create an account to manage your details and orders.</p><div className="account-actions"><Link className="primary-link" href="/login">Sign in <span>↗</span></Link><Link className="text-link" href="/register">Create an account <span>↗</span></Link></div></>}</section></main>;
}
