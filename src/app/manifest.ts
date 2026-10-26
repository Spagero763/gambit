import type { MetadataRoute } from "next";

/** PWA manifest: makes Gambit installable to the home screen on phones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gambit: Whot, chess and more for real money",
    short_name: "Gambit",
    description: "Classic skill games on Celo. Play free, or play a real person for USDT, USDC or USDm. Winner takes 95%.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070c",
    theme_color: "#05070c",
    categories: ["games", "entertainment"],
    icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
