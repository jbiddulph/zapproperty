import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Property photos are streamed through /api/properties/[id]/photos/[photoId]
  // with the ZapTask bearer token attached server-side, so no remote image
  // hosts need to be allow-listed here.
};

export default nextConfig;
