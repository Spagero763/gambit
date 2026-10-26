import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games";

const SITE = "https://www.bestgambit.live";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "daily"),
    ...GAMES.map((g) => page(`/play/${g.slug}`, 0.9)),
    page("/lobby", 0.8, "daily"),
    page("/leaderboard", 0.7, "daily"),
    page("/events", 0.6, "daily"),
    page("/tournaments", 0.5),
    page("/how-to-play", 0.6, "monthly"),
    page("/about", 0.5, "monthly"),
    page("/stats", 0.4, "daily"),
    page("/terms", 0.2, "yearly"),
    page("/privacy", 0.2, "yearly"),
  ];
}
