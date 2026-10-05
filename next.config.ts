import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { defaultLocale } from "./src/i18n/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root; a stray lockfile in the home directory otherwise confuses detection.
  turbopack: { root: __dirname },
  experimental: {
    // Root layout lives under app/[lang], so unmatched URLs need a global 404.
    globalNotFound: true,
  },
  async redirects() {
    return [{ source: "/", destination: `/${defaultLocale}`, permanent: false }];
  },
};

export default nextConfig;

// Exposes Cloudflare bindings (getCloudflareContext) during `next dev`.
initOpenNextCloudflareForDev();
