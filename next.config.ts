import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Project 3030 only: `NEXT_DIST_DIR=.next-3030` via `npm run dev:3030`. Canonical dev (:3031) uses `.next`. */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: {
    /** Client-safe signal that CLERK_SECRET_KEY is set (value never exposed). */
    NEXT_PUBLIC_CLERK_KEYS_PAIRED: process.env.CLERK_SECRET_KEY?.trim() ? "1" : "",
  },
  async headers() {
    return [
      {
        source: "/book/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
