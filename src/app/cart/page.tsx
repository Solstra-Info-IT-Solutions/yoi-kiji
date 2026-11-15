import Link from "next/link";
import { CartView } from "@/components/cart-view";
export const metadata={title:"Your bag"};
export default function CartPage(){return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Your bag</div><header className="commerce-heading"><p className="eyebrow">YOUR YOI KIJI SELECTION</p><h1>A little more<br/><em>comfort.</em></h1></header><CartView/></main>}
