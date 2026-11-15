import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutForm } from "@/components/checkout-form";
export const metadata={title:"Secure checkout"};
export const dynamic="force-dynamic";
export default async function CheckoutPage(){const user=await getCurrentUser();if(!user)redirect("/login?next=/checkout");return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/cart">Bag</Link><span>/</span> Checkout</div><header className="commerce-heading"><p className="eyebrow">A THOUGHTFUL DELIVERY STARTS HERE</p><h1>Delivery<br/><em>details.</em></h1><p>Signed in as {user.email}</p></header><section className="checkout-panel"><CheckoutForm/></section></main>}
