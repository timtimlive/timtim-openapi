#!/usr/bin/env node
/*
 * Is this repository's copy of the API contract the one TimTim.Live publishes?
 *
 *   node scripts/check-contract.mjs
 *
 * Compares openapi.yaml with
 * https://timtim.live/partner-api/openapi.yaml (line endings ignored) and
 * exits 1 if they differ. When they differ, the published contract is newer
 * or older than this copy: open an issue, do not edit the copy by hand.
 */
import { readFileSync } from "node:fs";

const PUBLISHED = process.env.TIMTIM_CONTRACT_URL ?? "https://timtim.live/partner-api/openapi.yaml";
const local = readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

const res = await fetch(PUBLISHED);
if (!res.ok) {
  console.error(`check-contract: ${PUBLISHED} answered ${res.status}`);
  process.exit(2);
}
const published = (await res.text()).replace(/\r\n/g, "\n");
if (published === local) {
  console.log(`check-contract: openapi.yaml matches ${PUBLISHED}`);
} else {
  console.error(`check-contract: openapi.yaml DIFFERS from ${PUBLISHED}`);
  process.exit(1);
}
