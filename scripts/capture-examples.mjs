#!/usr/bin/env node
/*
 * Captures REAL responses from the live API — only calls that need no key —
 * into examples/, and records each one in examples/manifest.json.
 *
 *   node scripts/capture-examples.mjs
 *
 * Captured files are snapshots: dates and request ids change on every capture.
 * Run `npm run generate` afterwards (the Postman collection embeds some of them)
 * and `npm run validate:examples`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.TIMTIM_API_BASE ?? "https://api.timtim.live/v1";

/** Every keyless call worth keeping. `auth` is a header to send ON PURPOSE to show an error — never a real key. */
export const CAPTURES = [
  { file: "listDemoEvents/city-miami-category-music.200.json", operationId: "listDemoEvents", path: "/demo/events", query: { city: "Miami", category: "music" }, status: 200, note: "The first call to try. Sample events only." },
  { file: "listDemoEvents/limit-2-first-page.200.json", operationId: "listDemoEvents", path: "/demo/events", query: { limit: "2" }, status: 200, note: "A page with `next`: pass it as `cursor` to get the next page." },
  { file: "listDemoEvents/simulate-cancelled.200.json", operationId: "listDemoEvents", path: "/demo/events", query: { city: "Miami", simulate: "cancelled" }, status: 200, note: "Sandbox only: every sample event as if cancelled." },
  { file: "listDemoEvents/simulate-sold_out.200.json", operationId: "listDemoEvents", path: "/demo/events", query: { city: "Miami", simulate: "sold_out" }, status: 200, note: "Sandbox only: every sample event as if sold out." },
  { file: "listDemoEvents/simulate-invalid_key.401.json", operationId: "listDemoEvents", path: "/demo/events", query: { simulate: "invalid_key" }, status: 401, note: "The exact problem a bad key gets." },
  { file: "listDemoEvents/simulate-rate_limited.429.json", operationId: "listDemoEvents", path: "/demo/events", query: { simulate: "rate_limited" }, status: 429, note: "Comes with a Retry-After header (seconds)." },
  { file: "listDemoEvents/unknown-parameter.400.json", operationId: "listDemoEvents", path: "/demo/events", query: { colour: "blue" }, status: 400, note: "An unknown parameter is refused, never ignored." },
  { file: "listEvents/missing-key.401.json", operationId: "listEvents", path: "/events", query: { city: "Miami" }, status: 401, note: "GET /events with no Authorization header." },
  { file: "listEvents/invalid-key.401.json", operationId: "listEvents", path: "/events", query: { city: "Miami" }, auth: "Bearer tt_test_not_a_real_key", status: 401, note: "GET /events with a key that does not exist." },
];

async function main() {
  const manifestPath = join(root, "examples", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const kept = manifest.examples.filter((e) => e.source !== "live-capture");
  const captured = [];
  const at = new Date().toISOString().slice(0, 10);

  for (const c of CAPTURES) {
    const url = `${BASE}${c.path}?${new URLSearchParams(c.query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json", ...(c.auth ? { Authorization: c.auth } : {}) } });
    if (res.status !== c.status) throw new Error(`${url} answered ${res.status}, expected ${c.status}`);
    const body = await res.json();
    const out = join(root, "examples", c.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(body, null, 2)}\n`);
    const headers = {};
    for (const h of ["content-type", "retry-after", "access-control-allow-origin"]) if (res.headers.get(h)) headers[h] = res.headers.get(h);
    captured.push({
      file: c.file,
      kind: "response",
      operationId: c.operationId,
      method: "GET",
      path: c.path,
      query: c.query,
      ...(c.auth ? { requestHeaders: { Authorization: c.auth } } : {}),
      status: c.status,
      responseHeaders: headers,
      source: "live-capture",
      captured: at,
      note: c.note,
    });
    console.log(`captured ${c.status} ${url}`);
  }

  manifest.examples = [...captured, ...kept];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`examples/manifest.json: ${captured.length} live captures, ${kept.length} illustrative`);
}

await main();
