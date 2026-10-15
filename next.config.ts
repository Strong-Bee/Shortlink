import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not publish browser source maps in production deployments.
  // This raises the effort required to inspect bundled client code, but is not encryption.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
