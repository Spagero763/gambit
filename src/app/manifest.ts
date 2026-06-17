import type { MetadataRoute } from "next";

/** PWA manifest — makes Gambit installable to the home screen on phones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gambit — play classic games, stake USDm",
    short_name: "Gambit",
    description:
      "Classic skill games on Celo. Play free, or stake USDm head to head — winner takes the pot.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
