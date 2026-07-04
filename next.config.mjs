/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // tree-shake icon imports. NOTE: framer-motion is deliberately NOT here —
    // optimizing its barrel import can subtly break animations (e.g. the
    // ambient background / spotlight), and the bundle win isn't worth it.
    optimizePackageImports: ["lucide-react"],
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
