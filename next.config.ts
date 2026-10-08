import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { site } from "./src/data/site";
import { defaultLocale } from "./src/i18n/config";

// The website is thesweetspotlb.com; www redirects to it. The admin lives at
// admin.thesweetspotlb.com/admin/… (admin.localhost:3000 in development;
// plain localhost:3000/admin works too). The admin host serves only the
// admin, and the live website sends /admin there.
const host = (value: string) => [{ type: "host" as const, value }];
const adminHost = host("admin\\..*");
const liveSite = host(new URL(site.url).hostname.replaceAll(".", "\\."));
const wwwSite = host(`www\\.${new URL(site.url).hostname.replaceAll(".", "\\.")}`);

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root; a stray lockfile in the home directory otherwise confuses detection.
  turbopack: { root: __dirname },
  experimental: {
    // Root layouts live under app/[lang] and app/admin, so unmatched URLs need a global 404.
    globalNotFound: true,
  },
  images: {
    // Menu photos uploaded in the admin (Supabase Storage).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/menu/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/", has: adminHost, destination: "/admin", permanent: false },
      // On the admin host, anything that isn't the admin (or its assets) goes to it.
      {
        source: "/:path((?!admin|_next|api)[^.]*)",
        has: adminHost,
        destination: "/admin",
        permanent: false,
      },
      { source: "/:path*", has: wwwSite, destination: `${site.url}/:path*`, permanent: true },
      { source: "/admin", has: liveSite, destination: `${site.adminUrl}/admin`, permanent: false },
      {
        source: "/admin/:path*",
        has: liveSite,
        destination: `${site.adminUrl}/admin/:path*`,
        permanent: false,
      },
      { source: "/", missing: adminHost, destination: `/${defaultLocale}`, permanent: false },
    ];
  },
};

export default nextConfig;

// Exposes Cloudflare bindings (getCloudflareContext) during `next dev`.
initOpenNextCloudflareForDev();
