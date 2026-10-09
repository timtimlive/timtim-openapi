#!/usr/bin/env node
/*
 * Everything in schemas/ and postman/ is GENERATED from openapi.yaml.
 *
 *   node scripts/generate.mjs           write the files
 *   node scripts/generate.mjs --check   exit 1 if any generated file is stale, missing or extra
 *
 * schemas/<Name>.schema.json — one JSON Schema (2020-12) per component schema.
 * postman/timtim-api.postman_collection.json — built here from openapi.yaml, in
 *   folders a newcomer can follow, keyless demo request first.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SCHEMA_BASE, json, loadContract, normalise, root } from "./lib.mjs";

const check = process.argv.includes("--check");
const contract = loadContract();

/* ── schemas/ ──────────────────────────────────────────────────────────────── */

function schemaFiles() {
  const files = {};
  for (const [name, schema] of Object.entries(contract.components.schemas)) {
    files[`schemas/${name}.schema.json`] = json({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: `${SCHEMA_BASE}${name}.schema.json`,
      title: name,
      $comment: "GENERATED from openapi.yaml by scripts/generate.mjs. Do not edit.",
      ...toJsonSchemaLocal(schema),
    });
  }
  return files;
}

function toJsonSchemaLocal(schema) {
  /* Refs between schema files are relative, so the folder works anywhere. */
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string" && v.startsWith("#/components/schemas/")) out.$ref = `${v.split("/").pop()}.schema.json`;
      else if (k === "example") out.examples = [v];
      else out[k] = walk(v);
    }
    return out;
  };
  return walk(schema);
}

/* ── postman/ ──────────────────────────────────────────────────────────────── */

/*
 * What each request takes from the contract: its path (Postman writes {id} as
 * :id), its query parameters with their descriptions, and its description.
 * Read straight from openapi.yaml — no converter package (2026-10-09: the one
 * we used pulled in a faker version with an unfixed advisory).
 */
function operation(method, path) {
  const item = contract.paths[path];
  const op = item?.[method.toLowerCase()];
  if (!op) throw new Error(`openapi.yaml has no ${method} ${path}`);
  const resolve = (p) => (p.$ref ? p.$ref.split("/").reduce((node, key) => (key === "#" ? contract : node[key]), null) : p);
  const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolve);
  return {
    path: path.split("/").filter(Boolean).map((p) => (p.startsWith("{") ? `:${p.slice(1, -1)}` : p)),
    query: params.filter((p) => p.in === "query").map((p) => ({ key: p.name, ...(p.description ? { description: p.description } : {}) })),
    description: op.description ?? op.summary ?? "",
  };
}

function stripIds(node) {
  if (Array.isArray(node)) return node.map(stripIds);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) if (k !== "id" && k !== "_postman_id") out[k] = stripIds(v);
  return out;
}

const example = (file) => JSON.parse(readFileSync(join(root, "examples", file), "utf8"));
const NOAUTH = { type: "noauth" };

async function postmanCollection() {
  /** One request: the contract's path, parameters and description, with our own values. */
  function request(name, method, path, { query = {}, disabledQuery = [], pathVars = {}, headers = [], body, auth, tests, prerequest, saved, description } = {}) {
    const op = operation(method, path);
    const base = { request: { url: { path: op.path, query: op.query }, description: op.description } };
    const known = new Map((base.request.url.query ?? []).map((q) => [q.key, q]));
    const q = [
      ...Object.entries(query).map(([key, value]) => ({ key, value: String(value), ...(known.get(key)?.description ? { description: known.get(key).description } : {}) })),
      ...disabledQuery
        .filter((k) => !(k in query))
        .map((key) => ({ key, value: known.get(key) ? sampleValue(key) : "", disabled: true, ...(known.get(key)?.description ? { description: known.get(key).description } : {}) })),
    ];
    for (const k of Object.keys(query)) if (!known.has(k) && k !== "colour" && k !== "key") throw new Error(`${method} ${path} has no query parameter "${k}" in the contract`);
    const contractDescription = typeof base.request.description === "object" ? base.request.description.content : base.request.description;
    const item = {
      name,
      request: {
        method,
        header: [{ key: "Accept", value: "application/json" }, ...headers],
        url: {
          raw: `{{baseUrl}}/${base.request.url.path.join("/")}${q.filter((x) => !x.disabled).length ? `?${q.filter((x) => !x.disabled).map((x) => `${x.key}=${x.value}`).join("&")}` : ""}`,
          host: ["{{baseUrl}}"],
          path: base.request.url.path,
          ...(q.length ? { query: q } : {}),
          ...(Object.keys(pathVars).length ? { variable: Object.entries(pathVars).map(([key, value]) => ({ key, value })) } : {}),
        },
        description: [description, contractDescription].filter(Boolean).join("\n\n"),
        ...(body ? { body } : {}),
        ...(auth ? { auth } : {}),
      },
      ...((tests || prerequest) ? { event: [...(prerequest ? [{ listen: "prerequest", script: { type: "text/javascript", exec: prerequest } }] : []), ...(tests ? [{ listen: "test", script: { type: "text/javascript", exec: tests } }] : [])] } : {}),
      response: (saved ?? []).map((s) => ({
        name: s.name,
        originalRequest: { method, header: [], url: { raw: s.url, host: ["{{baseUrl}}"], path: base.request.url.path } },
        status: s.statusText,
        code: s.code,
        _postman_previewlanguage: "json",
        header: [{ key: "Content-Type", value: s.code >= 400 ? "application/problem+json" : "application/json" }],
        body: JSON.stringify(example(s.file), null, 2),
      })),
    };
    return item;
  }

  const SAMPLE = { country: "US", from: "2026-10-01", to: "2026-12-31", near: "Paris,FR", artist: "Sample", cursor: "{{nextCursor}}", commissioned: "true", minimum_earnings: "5", lat: "38.9072", lng: "-77.0369", radius: "50", changed_since: "{{changedSince}}", limit: "20" };
  function sampleValue(key) {
    return SAMPLE[key] ?? "";
  }

  const listTests = [
    'pm.test("200 OK", () => pm.response.to.have.status(200));',
    "const body = pm.response.json();",
    'pm.test("a list of events", () => pm.expect(body.object).to.eql("list"));',
    'if (body.next) pm.collectionVariables.set("nextCursor", body.next);',
  ];
  const problemTests = (status) => [
    `pm.test("${status}", () => pm.response.to.have.status(${status}));`,
    "const p = pm.response.json();",
    'pm.test("a problem with a request_id", () => { pm.expect(p.title).to.be.a("string"); pm.expect(p.request_id).to.match(/^req_/); });',
  ];

  const webhookPrerequest = (eventType) => [
    "// Signs the body exactly like TimTim.Live: HMAC-SHA256(secret, `${t}.${body}`) as hex.",
    "const t = Math.floor(Date.now() / 1000).toString();",
    "const body = pm.request.body.raw;",
    'const v1 = CryptoJS.HmacSHA256(`${t}.${body}`, pm.variables.get("webhookSecret")).toString(CryptoJS.enc.Hex); // pm.variables: an environment value wins over the collection default',
    'pm.request.headers.upsert({ key: "TimTim-Signature", value: `t=${t},v1=${v1}` });',
    'pm.request.headers.upsert({ key: "TimTim-Timestamp", value: t });',
    `pm.request.headers.upsert({ key: "TimTim-Event", value: "${eventType}" });`,
  ];
  const webhookItem = (name, file, eventType) => ({
    name,
    request: {
      method: "POST",
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "TimTim-Delivery-Id", value: "{{$guid}}" },
      ],
      url: { raw: "{{webhookUrl}}", host: ["{{webhookUrl}}"] },
      auth: NOAUTH,
      body: { mode: "raw", raw: JSON.stringify(example(file)), options: { raw: { language: "json" } } },
      description:
        `Sends an illustrative ${eventType} delivery to YOUR endpoint ({{webhookUrl}}), signed with {{webhookSecret}} the same way TimTim.Live signs: ` +
        "`TimTim-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of \"<t>.<raw body>\">`. Your endpoint should check it in constant time, refuse anything older than 300 seconds, " +
        "use TimTim-Delivery-Id to ignore repeats, and answer 2xx within 10 seconds.",
    },
    event: [
      { listen: "prerequest", script: { type: "text/javascript", exec: webhookPrerequest(eventType) } },
      { listen: "test", script: { type: "text/javascript", exec: ['pm.test("your endpoint accepted the signed delivery (2xx)", () => pm.expect(pm.response.code).to.be.within(200, 299));'] } },
    ],
  });

  const demoQuery = ["country", "from", "to", "near", "artist", "limit", "cursor"];
  const eventsQuery = ["country", "from", "to", "changed_since", "commissioned", "minimum_earnings", "near", "artist", "lat", "lng", "radius", "limit", "cursor"];

  const collection = {
    info: {
      name: "TimTim.Live Partner API (Developer Preview)",
      description:
        "Generated from openapi.yaml (https://timtim.live/partner-api/openapi.yaml) by scripts/generate.mjs.\n\n" +
        "1. Send **Start here** — it needs no key.\n2. Put your test key (tt_test_…, from https://timtim.live/partners/dashboard) in the collection variable `apiKey`.\n3. Work down the folders.\n\n" +
        "Test keys see sample events only. No real money moves. Docs: https://timtim.live/developers/docs",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{apiKey}}", type: "string" }] },
    variable: [
      { key: "baseUrl", value: "https://api.timtim.live/v1" },
      { key: "apiKey", value: "tt_test_YOUR_KEY" },
      { key: "eventId", value: "evt_test_washington_konpa" },
      { key: "ticketTypeId", value: "tt_test_washington_konpa" },
      { key: "changedSince", value: "2026-10-06T00:00:00Z" },
      { key: "nextCursor", value: "" },
      { key: "orderId", value: "" },
      { key: "clientId", value: "" },
      { key: "clientSecret", value: "" },
      { key: "accessToken", value: "" },
      { key: "webhookUrl", value: "https://your-server.example.com/timtim-webhook" },
      { key: "webhookSecret", value: "your-endpoint-signing-secret" },
      { key: "bulkFile", value: "bfs_YOURFEED.ndjson.gz" },
    ],
    item: [
      request("Start here: sample events (no key)", "GET", "/demo/events", {
        query: { city: "Miami", category: "music" },
        disabledQuery: demoQuery,
        auth: NOAUTH,
        description: "No key, no sign-up. Every name starts with \"TEST EVENT — NO REAL MONEY\".",
        tests: [...listTests, 'pm.test("sample events only", () => body.events.forEach((e) => pm.expect(e.name.startsWith("TEST EVENT — NO REAL MONEY")).to.be.true));'],
        saved: [{ name: "Miami + music (captured)", url: "{{baseUrl}}/demo/events?city=Miami&category=music", code: 200, statusText: "OK", file: "listDemoEvents/city-miami-category-music.200.json" }],
      }),
      {
        name: "Authentication",
        description: "Send your key as `Authorization: Bearer <key>` (set once, in the collection's `apiKey` variable). tt_test_… = sandbox, tt_pk_live_… = website key (events only), tt_sk_live_… = server key (never in a browser or a URL). Large integrations may use OAuth client credentials instead — server side only.",
        item: [
          request("Does my key work? (one event)", "GET", "/events", { query: { limit: 1 }, disabledQuery: eventsQuery, tests: listTests }),
          request("OAuth: get an access token", "POST", "/oauth/token", {
            auth: NOAUTH,
            headers: [{ key: "Content-Type", value: "application/x-www-form-urlencoded" }],
            body: { mode: "urlencoded", urlencoded: [{ key: "grant_type", value: "client_credentials" }, { key: "scope", value: "events:read events:details" }, { key: "client_id", value: "{{clientId}}" }, { key: "client_secret", value: "{{clientSecret}}" }] },
            tests: ['pm.test("200 OK", () => pm.response.to.have.status(200));', 'pm.collectionVariables.set("accessToken", pm.response.json().access_token);'],
            description: "Then send {{accessToken}} as the Bearer token instead of a key. Server side only.",
          }),
          request("OAuth: revoke a token", "POST", "/oauth/revoke", {
            auth: NOAUTH,
            headers: [{ key: "Content-Type", value: "application/x-www-form-urlencoded" }],
            body: { mode: "urlencoded", urlencoded: [{ key: "token", value: "{{accessToken}}" }, { key: "client_id", value: "{{clientId}}" }, { key: "client_secret", value: "{{clientSecret}}" }] },
          }),
        ],
      },
      {
        name: "Search Events",
        item: [
          request("Find events", "GET", "/events", { query: { city: "Washington", category: "music" }, disabledQuery: eventsQuery, tests: listTests }),
          request("Next page (uses {{nextCursor}})", "GET", "/events", { query: { city: "Washington", cursor: "{{nextCursor}}" }, disabledQuery: eventsQuery, tests: listTests }),
          request("Sample events with every demo filter (no key)", "GET", "/demo/events", { query: { city: "Paris" }, disabledQuery: demoQuery, auth: NOAUTH, tests: listTests }),
        ],
      },
      {
        name: "What Can I Ask For?",
        description: "Which categories and cities have events for your key right now, with counts — counted with the same rules as /events, so a category that says 3 gives 3.",
        item: [
          request("Categories", "GET", "/categories", { disabledQuery: ["country"], tests: ['pm.test("200 OK", () => pm.response.to.have.status(200));'] }),
          request("Cities", "GET", "/locations", { query: { country: "US" }, disabledQuery: ["limit"], tests: ['pm.test("200 OK", () => pm.response.to.have.status(200));'] }),
          request("Sample categories (no key)", "GET", "/demo/categories", { auth: NOAUTH }),
          request("Sample cities (no key)", "GET", "/demo/locations", { auth: NOAUTH }),
        ],
      },
      {
        name: "Tracking",
        description: "What the embed sends so your dashboard can count what visitors saw and clicked. Never money: sales are recorded by TimTim.Live itself. Answers 204.",
        item: [
          request("A visitor clicked Get tickets", "POST", "/track", {
            auth: NOAUTH,
            headers: [{ key: "Content-Type", value: "text/plain" }],
            body: { mode: "raw", raw: JSON.stringify({ type: "event_click", event_id: "{{eventId}}", key: "{{apiKey}}", view: "pv_postman_example" }, null, 2) },
            tests: ['pm.test("204 heard", () => pm.response.to.have.status(204));'],
          }),
        ],
      },
      {
        name: "Get Event",
        item: [request("One event", "GET", "/events/{id}", { pathVars: { id: "{{eventId}}" }, tests: ['pm.test("200 OK", () => pm.response.to.have.status(200));'], saved: [] })],
      },
      {
        name: "Changed Events",
        description: "Keep your copy in sync: ask for everything that changed after a time. Update each event; stop showing every id in `withdrawn` (always empty for a test key).",
        item: [request("Changed since {{changedSince}}", "GET", "/events", { query: { changed_since: "{{changedSince}}" }, disabledQuery: eventsQuery, tests: listTests })],
      },
      {
        name: "Sandbox Transaction",
        description: "Embedded commerce with a TEST key: see the sample ticket types, hold tickets (POST /orders with an Idempotency-Key), then check the order. No real money moves.",
        item: [
          request("Ticket types for {{eventId}}", "GET", "/events/{id}/tickets", { pathVars: { id: "{{eventId}}" } }),
          request("Create a test order", "POST", "/orders", {
            headers: [
              { key: "Content-Type", value: "application/json" },
              { key: "Idempotency-Key", value: "{{$guid}}", description: "8–80 of A-Z a-z 0-9 _ -. Reuse the same key when you retry the same order." },
            ],
            body: { mode: "raw", raw: JSON.stringify({ ...example("createOrder/request.illustrative.json"), event_id: "{{eventId}}", ticket_type_id: "{{ticketTypeId}}" }, null, 2), options: { raw: { language: "json" } } },
            tests: ['pm.test("200 OK", () => pm.response.to.have.status(200));', 'pm.collectionVariables.set("orderId", pm.response.json().id);'],
          }),
          request("Check the order", "GET", "/orders/{id}", { pathVars: { id: "{{orderId}}" } }),
        ],
      },
      {
        name: "Webhooks",
        description: "TimTim.Live POSTs to your endpoint when an event changes (event.changed) or an earning changes (earnings.changed). These requests let you test YOUR endpoint with correctly signed deliveries. Set webhookUrl and webhookSecret first.",
        item: [
          webhookItem("event.changed (cancelled) → your endpoint", "webhooks/event.changed.illustrative.json", "event.changed"),
          webhookItem("event.changed (withdrawn) → your endpoint", "webhooks/event.changed-withdrawn.illustrative.json", "event.changed"),
          webhookItem("earnings.changed (refund: reversed) → your endpoint", "webhooks/earnings.changed-reversed.illustrative.json", "earnings.changed"),
        ],
      },
      {
        name: "Errors",
        description: "Every error is application/problem+json with type, title, status, detail, request_id and code. These need no key.",
        item: [
          request("401 — bad key (simulated)", "GET", "/demo/events", { query: { simulate: "invalid_key" }, auth: NOAUTH, tests: problemTests(401), saved: [{ name: "401 (captured)", url: "{{baseUrl}}/demo/events?simulate=invalid_key", code: 401, statusText: "Unauthorized", file: "listDemoEvents/simulate-invalid_key.401.json" }] }),
          request("429 — too many requests (simulated)", "GET", "/demo/events", { query: { simulate: "rate_limited" }, auth: NOAUTH, tests: [...problemTests(429), 'pm.test("Retry-After", () => pm.response.to.have.header("Retry-After"));'], saved: [{ name: "429 (captured)", url: "{{baseUrl}}/demo/events?simulate=rate_limited", code: 429, statusText: "Too Many Requests", file: "listDemoEvents/simulate-rate_limited.429.json" }] }),
          request("400 — unknown parameter", "GET", "/demo/events", { query: { colour: "blue" }, auth: NOAUTH, tests: problemTests(400), saved: [{ name: "400 (captured)", url: "{{baseUrl}}/demo/events?colour=blue", code: 400, statusText: "Bad Request", file: "listDemoEvents/unknown-parameter.400.json" }] }),
          request("Cancelled event (simulated)", "GET", "/demo/events", { query: { city: "Miami", simulate: "cancelled" }, auth: NOAUTH, tests: [...listTests, 'pm.test("every event cancelled", () => body.events.forEach((e) => pm.expect(e.status).to.eql("cancelled")));'] }),
          request("Sold out (simulated)", "GET", "/demo/events", { query: { city: "Miami", simulate: "sold_out" }, auth: NOAUTH, tests: listTests }),
        ],
      },
      {
        name: "Earnings, Offers, Statements and Feeds",
        description: "Server keys (tt_sk_live_…) or test keys.",
        item: [
          request("Your earnings", "GET", "/earnings"),
          request("Card-linked offers", "GET", "/offers", { query: { country: "US" }, disabledQuery: ["city", "category", "from", "to", "changed_since", "minimum_earnings", "near", "limit", "cursor"] }),
          request("Monthly statements", "GET", "/settlements"),
          request("Feed (RSS) with the key in the URL", "GET", "/feeds/{file}", { pathVars: { file: "events.rss" }, query: { key: "{{apiKey}}", city: "Paris" }, auth: NOAUTH, description: "Website or test keys only — a server key is refused in a URL." }),
          request("Bulk feed file", "GET", "/bulk/{file}", { pathVars: { file: "{{bulkFile}}" }, disabledQuery: ["changed_since"] }),
        ],
      },
    ],
  };
  return json(stripIds(collection));
}

/* ── write or check ───────────────────────────────────────────────────────── */

const files = { ...schemaFiles(), "postman/timtim-api.postman_collection.json": await postmanCollection() };
const existingSchemas = existsSync(join(root, "schemas")) ? readdirSync(join(root, "schemas")).filter((f) => f.endsWith(".json")).map((f) => `schemas/${f}`) : [];
const extra = existingSchemas.filter((f) => !(f in files));

if (check) {
  const stale = Object.entries(files).filter(([f, content]) => !existsSync(join(root, f)) || normalise(readFileSync(join(root, f), "utf8")) !== content).map(([f]) => f);
  if (stale.length || extra.length) {
    for (const f of stale) console.error(`  stale or missing: ${f}`);
    for (const f of extra) console.error(`  not generated (remove it): ${f}`);
    console.error("Generated files are out of date. Run: npm run generate");
    process.exit(1);
  }
  console.log(`generated files are fresh (${Object.keys(files).length} files).`);
} else {
  mkdirSync(join(root, "schemas"), { recursive: true });
  mkdirSync(join(root, "postman"), { recursive: true });
  for (const f of extra) unlinkSync(join(root, f));
  for (const [f, content] of Object.entries(files)) writeFileSync(join(root, f), content);
  console.log(`wrote ${Object.keys(files).length} files${extra.length ? `, removed ${extra.length}` : ""}.`);
}
