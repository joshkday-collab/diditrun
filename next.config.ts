import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth cookies + live check state are request-time. Do not prerender a shell
  // that fights the dashboard. Landing still streams fine as a Server Component.
  cacheComponents: false,
};

export default nextConfig;
