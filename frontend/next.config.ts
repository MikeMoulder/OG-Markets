import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable dev filesystem persistence to avoid SST/compaction write failures on Windows.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
