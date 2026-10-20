# cukededup.dev

The official website for [CukeDedup](https://github.com/figueiredoluiz/cuke-dedup) — a fast static
analyzer for duplicate, ambiguous, reusable, and unused Cucumber/Gherkin step definitions.

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build), styled
with Tailwind CSS. Fully static: no backend, no database, no runtime server-side processing.

## Local development

Requires Node.js 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open <http://localhost:4321>.

Production build and local preview:

```bash
pnpm build
pnpm preview
```

Formatting and checks:

```bash
pnpm format         # write
pnpm format:check
pnpm test           # sync contract tests (node --test)
pnpm check:docs     # committed docs match a fresh sync at the release tag
pnpm check:links    # every internal link and anchor in dist/ resolves (run after build)
```

Regenerate the social preview image after brand changes (output is committed):

```bash
pnpm og:image
```

## Structure

```text
src/
├── components/      # landing sections, report showcase, shared UI
├── content/docs/    # Starlight docs generated from the source repo (do not edit)
├── data/            # releases.json (offline snapshot), sample-report.json
├── layouts/         # BaseLayout (meta, analytics, theme bootstrap)
├── lib/             # site config, releases, report types, analytics
├── pages/           # / and /changelog/
├── reference-nav.mjs  # sidebar order and labels of the generated docs
└── styles/          # Tailwind design tokens + Starlight palette
```

## Documentation sync

The site documents the **latest release** of CukeDedup, never `main`. Everything under
`src/content/docs/docs/` is generated from the source repository
([figueiredoluiz/cuke-dedup](https://github.com/figueiredoluiz/cuke-dedup)) and must not be edited
here; edits belong upstream.

```bash
pnpm sync:docs      # regenerate from ../cuke-dedup at the newest vX.Y.Z tag
```

- **Tag.** `CUKE_DEDUP_TAG` (CI) or, when unset, the newest `vX.Y.Z` tag of the local clone
  (`../cuke-dedup`, override with `CUKE_DEDUP_REPO`). Files are read from git objects of that tag
  (`git show`), never from the working tree. A missing tag, `README.md` or `docs/` fails the sync.
- **Published set.** `README.md` (the introduction at `/docs/`) and `docs/**/*.md`. Excluded:
  `*.local.md`, the upstream docs index (`docs/README.md`, duplicated by the sidebar) and the
  contributor pages `docs/development.md` and `docs/releasing.md`. The sidebar links Contributing to
  `CONTRIBUTING.md` on GitHub.
- **Navigation.** `src/reference-nav.mjs` lists the top-level pages and their sidebar section and
  label. The sync fails if an upstream top-level page or folder is not listed there. Pages inside a
  folder (`docs/rules/`, `docs/discovery/`) follow the order in which their parent page links to
  them; a nav entry whose page is absent at the tag is omitted.
- **Links.** Relative links become site routes. Links to excluded pages, to files outside `docs/`
  and absolute `github.com/figueiredoluiz/cuke-dedup/blob/main/...` links point to GitHub **at the
  tag**.
- **Provenance.** Each generated file starts with a comment naming the tag and short commit.
- **Committed output.** Generated docs are committed so builds are deterministic. CI re-runs the sync
  before every build; `pnpm check:docs` fails when the committed files differ from a fresh sync (it
  skips when the source repository is not available).

## Releases

`src/lib/releases.ts` fetches the GitHub Releases of the source repository at build time (with
`GITHUB_TOKEN` when set) and falls back to the snapshot `src/data/releases.json`. The current
version shown on the site is the newest non-prerelease, non-draft release. Refresh the snapshot
from the API when convenient; it only matters for offline builds.

## Release trigger

`.github/workflows/deploy.yml` runs on pushes to `main`, pull requests, manual dispatch and
`repository_dispatch` of type `release-published`. The cuke-dedup release workflow sends it:

```text
POST /repos/figueiredoluiz/cuke-dedup-site/dispatches
{"event_type": "release-published", "client_payload": {"tag": "vX.Y.Z"}}
```

- The sender needs a token with write access to this repository's contents.
- The workflow validates the tag against `^v[0-9]+\.[0-9]+\.[0-9]+$`. A prerelease or draft tag, and
  every other trigger, falls back to the latest stable release from the API.
- It checks out the source repository at that tag, runs the tests, regenerates the docs, builds,
  checks internal links and deploys to Cloudflare Pages.
- `pnpm check:docs` runs on pull requests only: a new release makes the committed docs stale until
  `pnpm sync:docs` is committed, and pushes and release dispatches must still deploy (they
  regenerate the docs before building).
- Removed hand-written routes (`/docs/installation/`, `/docs/quick-start/`, `/docs/reference/*`,
  ...) redirect to the page that now covers them (`redirects` in `astro.config.mjs`).

## Data fixtures

- `src/data/sample-report.json` is a **real** report produced by
  `cuke-dedup . --reporters json` (schema version 3) against a small demo project. The report
  showcase components consume it through the schema-v3 types in `src/lib/report.ts`.

## Configuration notes

- The production domain `https://cukededup.dev` is the default `site` in `astro.config.mjs`;
  override with `SITE_URL` for local experiments.
- Google Analytics (`G-LPQTNFBH3X`) is included in production builds only, and the bootstrap
  script additionally refuses to run outside `cukededup.dev` — dev, preview, and off-domain builds
  load no analytics.
- Landing-page claims (rule count, report formats, frameworks, versions) mirror the source
  README at the documented release; update them when a release changes those facts.

## License

The website content is part of the CukeDedup project family and MIT licensed. CukeDedup is an
independent project, not affiliated with or endorsed by the Cucumber project or its maintainers.
