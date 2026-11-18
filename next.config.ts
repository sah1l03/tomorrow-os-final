import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is standalone, even if the parent folder also contains a lockfile.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
