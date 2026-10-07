# Contributing to timtim-openapi

Thank you! Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first. Security problems go **privately** through "Report a vulnerability" on the Security tab ([SECURITY.md](SECURITY.md)).

## Change requests to the contract go through issues

`openapi.yaml` here is **published from TimTim.Live's source of truth**. It is copied byte for byte; a pull request that edits it cannot be merged, because the next publish would overwrite it.

To ask for a change to the API — a new field, filter, endpoint, or a fix to a description — **open an issue** and say:

1. what you are trying to build,
2. what the contract says today (quote the path or schema),
3. what you need it to say.

If TimTim.Live accepts it, the change is made in the source, published here, and everything generated is rebuilt.

## What you can change with a pull request

- `examples/` — more illustrative examples (name them `*.illustrative.json`, list them in `examples/manifest.json`; they must validate).
- `scripts/` — the generators and validators.
- The README and other docs.

Generated files (`schemas/`, `postman/`) are never edited by hand: change `scripts/generate.mjs` and run `npm run generate`.

## Checks

```bash
npm ci
npm test   # Redocly lint + generated files fresh + every example valid
```

By contributing you agree your work is licensed under the [MIT License](LICENSE).
