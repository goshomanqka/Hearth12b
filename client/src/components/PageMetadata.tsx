import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
const titles: Record<string, string> = {
  "/": "Hearth — Discover beautiful homes for sale and rent",
  "/properties": "Explore homes for sale and rent — Hearth",
  "/saved": "Your saved homes — Hearth",
  "/account": "Your account and property inbox — Hearth",
  "/publish": "List your property — Hearth",
  "/about": "A more thoughtful property marketplace — Hearth",
  "/help": "Help with property discovery and owner listings — Hearth",
  "/privacy": "Privacy and information handling — Hearth",
  "/terms": "Marketplace terms and responsible use — Hearth",
};
export default function PageMetadata() {
  const [location] = useLocation();
  const match = location.match(/^\/property\/(\d+)$/);
  const detail = trpc.marketplace.detail.useQuery(
    { id: Number(match?.[1] ?? 1) },
    { enabled: !!match, retry: false }
  );
  useEffect(() => {
    document.title =
      detail.data && match
        ? `${detail.data.title} — ${detail.data.location} | Hearth`
        : (titles[location] ??
          (location.startsWith("/publish/")
            ? "Edit your property — Hearth"
            : "Hearth — A better way home"));
    const description =
      detail.data && match
        ? `${detail.data.type} for ${detail.data.kind === "sale" ? "sale" : "rent"} in ${detail.data.location}. ${detail.data.beds} bedrooms, ${detail.data.baths} bathrooms, ${detail.data.size} sq ft.`
        : "Discover thoughtful homes for sale and rent, interactive 3D tours and a better way home on Hearth.";
    for (const [selector, content] of [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', document.title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', document.title],
      ['meta[name="twitter:description"]', description],
    ])
      document.querySelector(selector)?.setAttribute("content", content);
    const privatePage = /^\/(account|saved|publish)(\/|$)/.test(location);
    let robots = document.querySelector('meta[name="robots"]');
    if (privatePage) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex, nofollow");
    } else if (location !== "/404") robots?.remove();
  }, [location, detail.data]);
  return null;
}
