import type { NextConfig } from "next";

/**
 * The browser only ever talks to this app's origin: /api/* is passed on to the backend, so the
 * session cookie is first-party everywhere, Safari included (ADR 0003, GAPS G-B02).
 * BACKEND_URL is the backend's address: http://localhost:4000 locally, the Render service online.
 */
// On Vercel (which sets VERCEL) a missing BACKEND_URL stops the build instead of deploying a broken proxy.
const backendUrl = process.env.BACKEND_URL ?? (process.env.VERCEL ? undefined : "http://localhost:4000");
if (!backendUrl) {
  throw new Error("Set BACKEND_URL in the Vercel project to the backend's address (for example https://awards-api.onrender.com).");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl.replace(/\/$/, "")}/api/:path*` }];
  },
};

export default nextConfig;
