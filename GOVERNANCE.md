# Governance

## Who decides

The TimTim.Live open-source projects are maintained by the TimTim.Live team (GitHub organization: [timtimlive](https://github.com/timtimlive)). The maintainers review and merge pull requests, decide what goes into each release, and publish releases.

## How decisions are made

- Small changes (fixes, docs, tests): one maintainer review is enough.
- Changes to a public interface (a method, a component's props, a file format): discussed in an issue first, then reviewed.
- Changes to the API itself are not decided here. The API contract is published from TimTim.Live's source of truth; ask for API changes with an issue in [timtim-openapi](https://github.com/timtimlive/timtim-openapi).

## Releases

Versions follow [Semantic Versioning](https://semver.org). While a project is `0.x` (Developer Preview), a minor version may include breaking changes; they are always written in the CHANGELOG. Packages are published from GitHub Actions with npm provenance, never from a laptop.

## Changing this document

Changes to governance are proposed as a pull request to the [.github repository](https://github.com/timtimlive/.github) and stay open for at least seven days for comment.

## Code of Conduct

Everyone follows the [Code of Conduct](CODE_OF_CONDUCT.md).
