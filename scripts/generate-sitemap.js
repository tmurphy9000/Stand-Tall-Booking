#!/usr/bin/env node
// Runs before vite build (see package.json "build" script).
// Queries Supabase for all shops and writes public/sitemap.xml.
// Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from the build environment —
// these are already present in Vercel since they're baked into the browser bundle.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://standtallbooking.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const STATIC_PAGES = [
  { url: "/",           priority: "1.0", changefreq: "weekly" },
  { url: "/pricing",    priority: "0.9", changefreq: "monthly" },
  { url: "/affiliates", priority: "0.8", changefreq: "monthly" },
  { url: "/terms",      priority: "0.3", changefreq: "yearly" },
  { url: "/privacy",    priority: "0.3", changefreq: "yearly" },
];

async function getShopSlugs() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[sitemap] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — skipping shop pages");
    return [];
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("shops")
    .select("url_slug, updated_at");
  if (error) {
    console.warn("[sitemap] Failed to fetch shop slugs:", error.message);
    return [];
  }
  return data ?? [];
}

function urlTag({ url, priority, changefreq, lastmod }) {
  return [
    "  <url>",
    `    <loc>${BASE_URL}${url}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

async function main() {
  const shops = await getShopSlugs();
  const today = new Date().toISOString().split("T")[0];

  const allUrls = [
    ...STATIC_PAGES.map(p => urlTag({ ...p, lastmod: today })),
    ...shops.map(s => urlTag({
      url: `/book/${s.url_slug}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: s.updated_at ? s.updated_at.split("T")[0] : today,
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allUrls,
    "</urlset>",
  ].join("\n");

  const outPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, xml, "utf8");
  console.log(`[sitemap] Written ${allUrls.length} URLs to ${outPath}`);
}

main().catch(err => {
  console.error("[sitemap] Error:", err);
  process.exit(1);
});
