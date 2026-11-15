import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { default: "YOI KIJI — Textiles for the Way You Live", template: "%s | YOI KIJI" },
  description: "Thoughtfully chosen bedsheets, curtains, upholstery, bath linen and kitchen linen. Comfort, considered.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "YOI KIJI — Textiles for the Way You Live",
    description: "Thoughtfully chosen home textiles. Comfort, considered.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><div className="announcement"><span>TEXTILES FOR THE WAY YOU LIVE</span><i>✳</i><span>COMFORT, CONSIDERED</span></div><SiteHeader/>{children}<SiteFooter/></body>
    </html>
  );
}
