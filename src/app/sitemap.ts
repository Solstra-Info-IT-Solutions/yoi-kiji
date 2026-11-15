import type { MetadataRoute } from "next";
import { storefrontCategories } from "@/lib/catalog";
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";return [{url:base,lastModified:new Date(),changeFrequency:"weekly",priority:1},{url:base+"/shop",lastModified:new Date(),changeFrequency:"daily",priority:.9},...storefrontCategories.map(c=>({url:base+"/shop/"+c.slug,lastModified:new Date(),changeFrequency:"weekly" as const,priority:.8}))];}
