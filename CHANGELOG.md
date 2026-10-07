# Changelog

This file tracks the repository. The API contract's own version is `info.version` in [`openapi.yaml`](openapi.yaml) (currently 1.0.0); the v1 API only grows — new optional fields, filters and endpoints.

## [Unreleased] — Developer Preview

### Added

- `openapi.yaml` — the TimTim.Live Partner API contract (OpenAPI 3.1, contract version 1.0.0), including `GET /demo/events` (sample events, no key, `simulate`).
- `schemas/` — one generated JSON Schema (2020-12) per component schema.
- `examples/` — 9 live captures from keyless calls and 11 illustrative examples, all validated against the contract.
- `postman/timtim-api.postman_collection.json` — generated with openapi-to-postmanv2; folders Authentication, Search Events, Get Event, Changed Events, Sandbox Transaction, Webhooks, Errors; keyless request first.
- CI: Redocly lint, generated-files freshness check, example validation.
