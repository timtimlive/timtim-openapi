# Changelog

This file tracks the repository. The API contract's own version is `info.version` in [`openapi.yaml`](openapi.yaml) (currently 1.0.0); the v1 API only grows — new optional fields, filters and endpoints.

## [Unreleased] — Developer Preview

### Changed

- The Postman collection is built by `scripts/generate.mjs` straight from `openapi.yaml`. `openapi-to-postmanv2` is gone, and with it the `@faker-js/faker` and old `yaml` it pulled in (GHSA-qxc2-j82w-r537, GHSA-48c2-rrv3-qjmp). The collection is the same; the "revoke a token" request now carries its summary.
- The contract adds ETag and 304 on the event reads, and says website keys are counted per visitor.

### Added

- `GET /categories`, `GET /locations` and their keyless twins `GET /demo/categories`, `GET /demo/locations` — what you can ask `/events` for, with counts. `POST /track` — the embed's impression, view and click signals (never money). Schemas `Category` and `Location`; Postman folders "What Can I Ask For?" and "Tracking".
- `openapi.yaml` — the TimTim.Live Partner API contract (OpenAPI 3.1, contract version 1.0.0), including `GET /demo/events` (sample events, no key, `simulate`).
- `schemas/` — one generated JSON Schema (2020-12) per component schema.
- `examples/` — 9 live captures from keyless calls and 11 illustrative examples, all validated against the contract.
- `postman/timtim-api.postman_collection.json` — generated with openapi-to-postmanv2; folders Authentication, Search Events, Get Event, Changed Events, Sandbox Transaction, Webhooks, Errors; keyless request first.
- CI: Redocly lint, generated-files freshness check, example validation.
