/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ["exceljs"],
  },
  // OneDrive / chemins synchronisés : évite chunks incomplets en dev
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    if (isServer) {
      const extra = { exceljs: "commonjs exceljs" };
      if (Array.isArray(config.externals)) {
        config.externals.push(extra);
      }
    }
    return config;
  },
};

export default nextConfig;
