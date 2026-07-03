/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // import only the icons/primitives each page uses instead of whole packages
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    // Privy lazily references a couple of optional integrations it doesn't ship
    // (Stripe onramp, Farcaster-Solana). We don't use them; map them to empty so
    // webpack doesn't fail trying to resolve packages that aren't installed.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
