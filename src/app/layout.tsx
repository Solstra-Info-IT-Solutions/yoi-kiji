import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
