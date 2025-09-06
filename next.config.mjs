/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: process.env.ASSET_PREFIX || "",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    config.module.rules.push({
      test: /\.worker\.js$/,
      loader: "worker-loader",
      options: {
        filename: "static/chunks/[name].[contenthash].js",
        publicPath: "/_next/",
      },
    });
    config.module.rules.push({
      test: /\.wasm$/,
      type: "javascript/auto",
      loader: "file-loader",
      options: {
        publicPath: "/_next/static/chunks",
        outputPath: "static/chunks",
        name: "[name].[ext]",
      },
    });
    return config;
  },
};

export default nextConfig;
