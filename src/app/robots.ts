import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { site } from "@/data/site";

// Cloudflare adds its own AI-crawler rules above these. The admin host keeps
// every crawler out; the website points them at the sitemap.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  if (host.startsWith("admin.")) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
