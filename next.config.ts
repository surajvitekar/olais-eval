import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development safety
  reactStrictMode: true,

  // Skip type-check during builds (type-check is done separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configure logging for production
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Server configuration
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
