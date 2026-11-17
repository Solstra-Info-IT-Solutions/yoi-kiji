import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { PrintButton } from "@/components/print-button";
import { getOrCreateTaxInvoice } from "@/lib/gst-invoice";
export const dynamic="force-dynamic";

type Seller={legalName:string;gstin:string;address:string;stateCode:string};
type Buyer={name:string;address:string;state:string;stateCode:string;phone:string;gstin:string|null};
type Line={description:string;code:string;quantity:number;grossPaise:number;discountPaise:number;taxablePaise:number;gstRateBps:number;taxPaise:number;cgstPaise:number;sgstPaise:number;igstPaise:number};

export default async function InvoicePage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)redirect("/login");
 const {id}=await params;
 const order=await prisma.order.findFirst({where:{id,userId:user.id}});
 if(!order)notFound();
 let invoice=null;
 try{invoice=await getOrCreateTaxInvoice(id);}catch{/* Invoice remains unavailable until payment and seller tax setup are complete. */}
 const seller=invoice?.sellerSnapshot as unknown as Seller|undefined;
 const buyer=invoice?.buyerSnapshot as unknown as Buyer|undefined;
 const lines=invoice?.lineItems as unknown as Line[]|undefined;
 return <main className="invoice-page">
  <div className="invoice-actions"><Link href="/account/orders">← Back to orders</Link>{invoice?<><a href={`/api/account/orders/${id}/invoice`}>Download PDF</a><PrintButton/></>:null}</div>
  <article className="invoice-sheet">
   <header><div><h1>YOI KIJI</h1><p>Textiles for the way you live.</p></div><div className="invoice-title"><h2>{invoice?"TAX INVOICE":"INVOICE STATUS"}</h2><p>{invoice?.invoiceNumber??order.orderNumber}</p><p>{new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(invoice?.issuedAt??order.createdAt)}</p></div></header>
   {!invoice?<div className="invoice-notice">A statutory GST tax invoice is not available yet. It will be issued after payment is captured and the seller's verified GST registration and invoice settings are complete. This page is not a tax invoice.</div>:<>
    <section className="invoice-address">
     <div><h3>SUPPLIER</h3><p>{seller?.legalName}</p><p>{seller?.address}</p><p>GSTIN: {seller?.gstin}</p><p>State code: {seller?.stateCode}</p></div>
     <div><h3>BILL TO</h3><p>{buyer?.name}</p><p>{buyer?.address}</p><p>Place of supply: {buyer?.state} ({buyer?.stateCode})</p>{buyer?.gstin?<p>GSTIN: {buyer.gstin}</p>:null}<p>Tax type: {invoice.taxType}</p></div>
    </section>
    <p>Order: {order.orderNumber} · Invoice date: {new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(invoice.issuedAt)}</p>
    <table className="invoice-table"><thead><tr><th>DESCRIPTION</th><th>HSN/SAC</th><th>QTY</th><th>TAXABLE</th><th>GST RATE</th><th>GST</th><th>LINE TOTAL</th></tr></thead><tbody>{lines?.map((line,index)=><tr key={index}><td>{line.description}</td><td>{line.code}</td><td>{line.quantity}</td><td>{formatINR(line.taxablePaise)}</td><td>{line.gstRateBps/100}%</td><td>{formatINR(line.taxPaise)}</td><td>{formatINR(line.grossPaise-line.discountPaise)}</td></tr>)}</tbody></table>
    <section className="invoice-totals"><p>Taxable value <strong>{formatINR(invoice.taxablePaise)}</strong></p><p>CGST <strong>{formatINR(lines?.reduce((sum,line)=>sum+line.cgstPaise,0)??0)}</strong></p><p>SGST <strong>{formatINR(lines?.reduce((sum,line)=>sum+line.sgstPaise,0)??0)}</strong></p><p>IGST <strong>{formatINR(lines?.reduce((sum,line)=>sum+line.igstPaise,0)??0)}</strong></p><p>Total GST <strong>{formatINR(invoice.taxPaise)}</strong></p><p>Shipping (incl. GST) <strong>{formatINR(invoice.shippingPaise)}</strong></p><p>Discount <strong>{formatINR(invoice.discountPaise)}</strong></p><p className="invoice-grand-total">Invoice total <strong>{formatINR(invoice.totalPaise)}</strong></p></section>
   </>}
   <footer>Thank you for choosing YOI KIJI.</footer>
  </article>
 </main>;
}
