/* Shared helpers for the generate and validate scripts. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/* Where the schema files will be published; also each file's $id, so relative $refs resolve. */
export const SCHEMA_BASE = "https://raw.githubusercontent.com/timtimlive/timtim-openapi/main/schemas/";

export function loadContract() {
  return parse(readFileSync(join(root, "openapi.yaml"), "utf8"));
}

/**
 * An OpenAPI 3.1 schema → a JSON Schema 2020-12 schema:
 *  - `#/components/schemas/X` refs → `<prefix>X.schema.json`
 *  - `example` (OpenAPI only) → `examples: [value]` (JSON Schema)
 */
export function toJsonSchema(node, refPrefix) {
  if (Array.isArray(node)) return node.map((n) => toJsonSchema(n, refPrefix));
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string" && value.startsWith("#/components/schemas/")) {
      out.$ref = `${refPrefix}${value.slice("#/components/schemas/".length)}.schema.json`;
    } else if (key === "example") {
      out.examples = [value];
    } else {
      out[key] = toJsonSchema(value, refPrefix);
    }
  }
  return out;
}

/** Follows `#/components/responses/X` once. */
export function resolveResponse(contract, response) {
  if (response?.$ref?.startsWith("#/components/responses/")) return contract.components.responses[response.$ref.split("/").pop()];
  return response;
}

export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const normalise = (s) => s.replace(/\r\n/g, "\n");
