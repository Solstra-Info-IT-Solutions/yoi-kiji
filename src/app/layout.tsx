import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "YOI KIJI — A Quieter Way of Living", template: "%s | YOI KIJI" },
  description: "Considered objects for a quieter way of living.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { title: "YOI KIJI", description: "A Quieter Way of Living", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
