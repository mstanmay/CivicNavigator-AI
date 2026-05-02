import type { NextConfig } from "next";

const CLOUD_RUN_URL = "https://election-assistant-383943922335.asia-south1.run.app";

const nextConfig: NextConfig = {
  // Embed public env vars so they resolve at Vercel build time even if not set in dashboard
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || CLOUD_RUN_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
      "AIzaSyCh3qh1Iqc1o1Xg2Ydr7CNV_EUKLV7nlII",
  },

  // Proxy /backend/* → Cloud Run (avoids CORS issues)
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || CLOUD_RUN_URL;
    return [
      {
        source: "/backend/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
