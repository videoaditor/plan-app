import { execSync } from "child_process";

// Auto-generate version from git
let gitHash = "dev";
let buildDate = new Date().toISOString().slice(0, 10);
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch { }

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: gitHash,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  transpilePackages: ["@tldraw/tldraw", "@tldraw/assets", "@tldraw/editor", "@tldraw/store", "@tldraw/tlschema"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.aditor.ai",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

export default nextConfig;
