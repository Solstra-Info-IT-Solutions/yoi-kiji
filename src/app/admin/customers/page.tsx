import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer directory · YOI KIJI" };

export default async function AdminCustomersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");
  if (admin.role !== "ADMIN") redirect("/admin");

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true, name: true, email: true, whatsappOptIn: true, createdAt: true,
      _count: { select: { orders: true } },
      orders: { select: { totalPaise: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Customers</div>
    <header className="commerce-heading">
      <p className="eyebrow">CUSTOMER RELATIONSHIPS</p>
      <h1>People make<br/><em>the store.</em></h1>
      <p>{customers.length} most recently registered customer accounts.</p>
    </header>
    <section className="admin-customer-list">
      {customers.map(customer => {
        const lastOrder = customer.orders[0];
        return <article className="order-card" key={customer.id}>
          <div><strong>{customer.name || "Customer"}</strong><p>{customer.email}</p><small>Joined {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(customer.createdAt)}</small></div>
          <div><strong>{customer._count.orders} order(s)</strong><p>{lastOrder ? `Latest: ${formatINR(lastOrder.totalPaise)} · ${lastOrder.status.toLowerCase()}` : "No orders yet"}</p></div>
          <span className="order-status">{customer.whatsappOptIn ? "WhatsApp opted in" : "No WhatsApp consent"}</span>
        </article>;
      })}
      {customers.length === 0 && <p>No customer accounts have registered yet.</p>}
    </section>
  </main>;
}
