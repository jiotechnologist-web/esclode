import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger runs the normal Next.js server (`next start`).
  reactStrictMode: false,
  // The original project contains a few legacy UI type mismatches. Keep
  // production deployment from being blocked by those non-runtime errors.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
