import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // undici: loaded natively so its connection pool (and our SSRF-safe DNS lookup) works.
  serverExternalPackages: ["undici"],
  experimental: {
    serverActions: {
      // Uploads carry the photo plus its transparent WebP cutout.
      bodySizeLimit: "10mb",
    },
  },
  // Cross-origin isolation lets in-browser background removal (WebAssembly) use multiple
  // threads. "credentialless" still allows cross-origin images (Supabase, search
  // thumbnails) without them sending CORP headers. Browsers without credentialless support
  // (Safari) simply stay non-isolated and run single-threaded.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  images: {
    // AVIF is ~20% smaller than WebP for photos; browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
