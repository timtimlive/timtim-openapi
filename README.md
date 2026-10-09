# TimTim.Live OpenAPI

> **Developer Preview.** The contract is real and in use; this repository is new.

The **API contract** for TimTim.Live — the one file that says exactly what the API does — plus things made from it.

[Live Demo](https://timtim.live/developers/demo) · [Documentation](https://timtim.live/developers/docs) · [Sandbox](https://timtim.live/developers/sandbox) · [Developer Access](https://timtim.live/developers) · [Community](https://timtim.live/developers/community)

## What is in here

| Path | What it is | Made how |
|---|---|---|
| [`openapi.yaml`](openapi.yaml) | The contract, OpenAPI 3.1 | Copied byte for byte from TimTim.Live's source of truth (also served at https://timtim.live/partner-api/openapi.yaml) |
| [`schemas/`](schemas) | One JSON Schema (2020-12) per object: `Event`, `Earning`, `Order`, `TicketType`, `Offer`, `Settlement`, `Problem`, `Withdrawn` | **Generated** from `openapi.yaml` |
| [`examples/`](examples) | Real requests and responses, listed in [`examples/manifest.json`](examples/manifest.json) | `live-capture`: saved from the live API (calls that need no key). `illustrative`: hand-written for calls that need a key — the file name says `.illustrative.` |
| [`postman/timtim-api.postman_collection.json`](postman/timtim-api.postman_collection.json) | A Postman collection | **Generated** from the contract by `scripts/generate.mjs`, in folders |

Every example is validated against the contract on every change.

## Try it in 30 seconds

No key needed:

```bash
curl "https://api.timtim.live/v1/demo/events?city=Miami&category=music"
```

You get sample events. Every name starts with "TEST EVENT — NO REAL MONEY".

## Postman

1. In Postman: **Import** → choose `postman/timtim-api.postman_collection.json`.
2. Send **Start here: sample events (no key)**. It works with no key.
3. Get a free test key (`tt_test_…`) at https://timtim.live/partners/dashboard and paste it into the collection variable `apiKey`.
4. Go down the folders: Authentication → Search Events → Get Event → Changed Events → Sandbox Transaction → Webhooks → Errors.

The **Webhooks** folder sends correctly signed deliveries to *your* endpoint (`webhookUrl`, `webhookSecret`), so you can test your signature check.

## Use the schemas

```js
import Ajv2020 from "ajv/dist/2020.js";
import event from "./schemas/Event.schema.json" with { type: "json" };
const validate = new Ajv2020({ strict: false }).compile(event);
```

Each file has an `$id`. If one schema ever refers to another, it uses a relative `$ref` like `Event.schema.json`, so keep the folder together.

## For contributors

```bash
npm ci
npm test                    # = lint + generated files fresh + examples valid
npm run generate            # rebuild schemas/ and postman/ after openapi.yaml changes
npm run capture:examples    # refresh the live captures (no key needed)
npm run check:contract      # is openapi.yaml the one TimTim.Live publishes?
```

**Do not edit `openapi.yaml` here.** It is published from TimTim.Live's source of truth. To ask for a change to the API, open an issue — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- Docs: https://timtim.live/developers/docs
- Quickstart: https://timtim.live/developers/quickstart
- Status: https://timtim.live/developers/status
- SDK: https://github.com/timtimlive/timtim-live-events
- Raw API examples by goal: https://github.com/timtimlive/timtim-api-examples

## Security

Report security problems privately: **Report a vulnerability** on this repository's [Security tab](https://github.com/timtimlive/timtim-openapi/security). Policy: https://timtim.live/partners/security. See [SECURITY.md](SECURITY.md).

## TimTim.Live Developer Tools

Open-source tools for connecting websites, apps and platforms to TimTim.Live.

### What is open source

SDKs, widgets, adapters, examples and public API specifications.

### What is not included

This code shows events. It does not include TimTim.Live's own servers. Tickets, payments, payouts, fraud checks and everyone's private data stay with TimTim.Live. You reach them through the API.

These tools connect to the hosted TimTim.Live API at:

https://api.timtim.live

Open-source licenses for client software do not grant ownership of TimTim.Live event data, API services, commercial rights, certification marks or trademarks.

## License

This description file and everything here: [MIT](LICENSE) © 2026 timtim-live. Using the API itself is governed by the Partner Terms: https://timtim.live/partners/terms
