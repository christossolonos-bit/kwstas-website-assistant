import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // FlatCompat + eslint-config-next can throw circular JSON during build on some setups
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["@andresaya/edge-tts", "ws"],
  async headers() {
    return [
      {
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
