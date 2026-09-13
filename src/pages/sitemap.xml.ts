import type { APIRoute } from "astro";
import { games } from "../data/games";

export const prerender = true;

const siteURL = "https://eddiesgames.xyz";

const staticPages = [
  "/",
  "/about",
  "/updates",
  "/privacy",
  "/terms",
  "/cookies",
  "/disclaimer",
  "/contact",
];

export const GET: APIRoute = () => {
  const gamePages = games.map((game) => `/play/${game.slug}`);
  const pages = [...staticPages, ...gamePages];

  const urls = pages
    .map(
      (path) => `
  <url>
    <loc>${siteURL}${path}</loc>
  </url>`
    )
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
