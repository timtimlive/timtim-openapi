#!/usr/bin/env node
/*
 * Validates every file in examples/ against the contract, using the generated
 * JSON Schemas in schemas/ for the shared objects.
 *
 *   node scripts/validate-examples.mjs
 *
 * Fails (exit 1) when an example does not match, when a file is not listed in
 * examples/manifest.json, or when the manifest lists a file that is missing.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { SCHEMA_BASE, loadContract, resolveResponse, root, toJsonSchema } from "./lib.mjs";

const contract = loadContract();
const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
addFormats(ajv);
for (const f of readdirSync(join(root, "schemas"))) ajv.addSchema(JSON.parse(readFileSync(join(root, "schemas", f), "utf8")));

function schemaFor(entry) {
  if (entry.kind === "webhook") {
    const op = contract.webhooks?.[entry.webhook]?.post;
    if (!op) throw new Error(`no webhook "${entry.webhook}" in the contract`);
    return op.requestBody.content["application/json"].schema;
  }
  const op = contract.paths?.[entry.path]?.[entry.method.toLowerCase()];
  if (!op) throw new Error(`no ${entry.method} ${entry.path} in the contract`);
  if (op.operationId !== entry.operationId) throw new Error(`${entry.method} ${entry.path} is ${op.operationId}, not ${entry.operationId}`);
  if (entry.kind === "request") return op.requestBody.content["application/json"].schema;
  const response = resolveResponse(contract, op.responses?.[String(entry.status)]);
  if (!response) throw new Error(`${entry.operationId} has no ${entry.status} response in the contract`);
  const content = response.content?.["application/json"] ?? response.content?.["application/problem+json"];
  if (!content?.schema) throw new Error(`${entry.operationId} ${entry.status} has no JSON schema`);
  return content.schema;
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? listFiles(join(dir, d.name)) : [join(dir, d.name)]));
}

const manifest = JSON.parse(readFileSync(join(root, "examples", "manifest.json"), "utf8"));
const listed = new Set(manifest.examples.map((e) => e.file));
let failures = 0;

for (const file of listFiles(join(root, "examples"))) {
  const rel = relative(join(root, "examples"), file).split("\\").join("/");
  if (rel === "manifest.json") continue;
  if (!listed.has(rel)) {
    console.error(`  NOT IN MANIFEST  ${rel}`);
    failures++;
  }
}

for (const entry of manifest.examples) {
  const path = join(root, "examples", entry.file);
  if (!existsSync(path)) {
    console.error(`  MISSING          ${entry.file}`);
    failures++;
    continue;
  }
  if (!["live-capture", "illustrative"].includes(entry.source)) {
    console.error(`  BAD SOURCE       ${entry.file}: source must be live-capture or illustrative`);
    failures++;
    continue;
  }
  if (entry.source === "illustrative" && !entry.file.includes(".illustrative.")) {
    console.error(`  NAME             ${entry.file}: illustrative examples must say so in the file name`);
    failures++;
    continue;
  }
  try {
    const validate = ajv.compile(toJsonSchema(schemaFor(entry), SCHEMA_BASE));
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (validate(data)) {
      console.log(`  ok               ${entry.file}  (${entry.source})`);
    } else {
      console.error(`  INVALID          ${entry.file}: ${ajv.errorsText(validate.errors)}`);
      failures++;
    }
  } catch (error) {
    console.error(`  ERROR            ${entry.file}: ${error.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nvalidate-examples: ${failures} problem(s).`);
  process.exit(1);
}
console.log(`\nvalidate-examples: all ${manifest.examples.length} examples match the contract.`);
