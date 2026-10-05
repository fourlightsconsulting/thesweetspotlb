import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root; a stray lockfile in the home directory otherwise confuses detection.
  turbopack: { root: __dirname },
};

export default nextConfig;
