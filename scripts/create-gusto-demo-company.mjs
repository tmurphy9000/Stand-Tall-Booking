#!/usr/bin/env node
// ONE-TIME TEST SCRIPT — create a Gusto demo company via the Partner API.
// Delete this file once the sandbox connection is verified.
//
// Usage:
//   GUSTO_CLIENT_SECRET=<secret> node scripts/create-gusto-demo-company.mjs
//
// VITE_GUSTO_CLIENT_ID is read from .env.local automatically (via dotenv).
// GUSTO_CLIENT_SECRET must be passed as an env var (never commit it).

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env.local parser (no dotenv dependency needed)
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local is optional
  }
}

loadEnvLocal();

const CLIENT_ID = process.env.VITE_GUSTO_CLIENT_ID;
const CLIENT_SECRET = process.env.GUSTO_CLIENT_SECRET;
const BASE = "https://api.gusto-demo.com";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing credentials.\n" +
    "  VITE_GUSTO_CLIENT_ID  — set in .env.local (found: " + (CLIENT_ID ? "yes" : "NO") + ")\n" +
    "  GUSTO_CLIENT_SECRET   — pass as env var   (found: " + (CLIENT_SECRET ? "yes" : "NO") + ")"
  );
  process.exit(1);
}

// ─── Step 1: Get a system access token ───────────────────────────────────────
console.log("Step 1: Requesting system access token…");

const tokenRes = await fetch(`${BASE}/oauth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "system_access",
  }),
});

const tokenData = await tokenRes.json();

if (!tokenRes.ok || tokenData.error) {
  console.error("Token exchange failed:", tokenData);
  process.exit(1);
}

const systemToken = tokenData.access_token;
console.log("  system access token obtained.\n");

// ─── Step 2: Create a partner-managed demo company ───────────────────────────
console.log("Step 2: Creating partner-managed company…");

const step2Url = `${BASE}/v1/partner_managed_companies`;
const step2Headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${systemToken}`,
};
const step2Body = JSON.stringify({
  user: {
    first_name: "Tanner",
    last_name: "Murphy",
    email: "tmurphy9000@gmail.com",
  },
  company: {
    name: "Stand Tall Barbering Co",
    ein: String(Math.floor(100000000 + Math.random() * 900000000)),
  },
});

console.log("  [DEBUG] URL:", step2Url);
console.log("  [DEBUG] Authorization header:", step2Headers.Authorization);
console.log("  [DEBUG] Request body:", step2Body);

const createRes = await fetch(step2Url, {
  method: "POST",
  headers: step2Headers,
  body: step2Body,
});

console.log("  HTTP", createRes.status, createRes.statusText);

const createRaw = await createRes.text();
console.log("  Raw response body:", createRaw || "(empty)");

if (!createRes.ok) {
  console.error("Company creation failed (HTTP " + createRes.status + ").");
  process.exit(1);
}

if (!createRaw) {
  console.error("Company creation returned an empty body with status", createRes.status);
  process.exit(1);
}

const createData = JSON.parse(createRaw);

// ─── Step 3: Print results ────────────────────────────────────────────────────
const { company_uuid, access_token, refresh_token } = createData;

console.log("\n=== Gusto Demo Company Created ===");
console.log("company_uuid: ", company_uuid ?? "(not returned — check createData below)");
console.log("access_token: ", access_token ?? "(not returned)");
console.log("refresh_token:", refresh_token ?? "(not returned)");
console.log("\nFull response:");
console.log(JSON.stringify(createData, null, 2));
