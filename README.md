# cukededup.dev

The official website for [CukeDedup](https://github.com/figueiredoluiz/cuke-dedup) — a fast static
analyzer for duplicate, ambiguous, reusable, and unused Cucumber/Gherkin step definitions.

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build), styled
with Tailwind CSS. Fully static: no backend, no database, no runtime server-side processing.

## Local development

Requires Node.js 20+ and [pnpm](https://pnpm.io).

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

Formatting:

```bash
pnpm format      # write
pnpm format:check
```

Regenerate the social preview image after brand changes (output is committed):

```bash
pnpm og:image
```

## Structure

```text
src/
├── components/      # landing sections, report showcase, shared UI
├── content/docs/    # Starlight documentation (adapted from the source repo)
├── data/            # local fixtures: releases.json, sample-report.json
├── layouts/         # BaseLayout (meta, analytics, theme bootstrap)
├── lib/             # site config, releases, report types, analytics
├── pages/           # / and /changelog/
└── styles/          # Tailwind design tokens + Starlight palette
```

## Data fixtures

- `src/data/releases.json` mirrors the GitHub Releases API response for
  `figueiredoluiz/cuke-dedup` (manually copied). `src/lib/releases.ts` is typed against the same
  shape so a build-time fetch can replace the fixture without touching the page.
- `src/data/sample-report.json` is a **real** report produced by
  `cuke-dedup . --reporters json` (schema version 3) against a small demo project. The report
  showcase components consume it through the schema-v3 types in `src/lib/report.ts`.

## Configuration notes

- The production domain `https://cukededup.dev` is the default `site` in `astro.config.mjs`;
  override with `SITE_URL` for local experiments.
- Google Analytics (`G-LPQTNFBH3X`) is included in production builds only, and the bootstrap
  script additionally refuses to run outside `cukededup.dev` — dev, preview, and off-domain builds
  load no analytics.
- Deployment (Cloudflare Pages), docs/release synchronization with the source repository, and
  other integrations are intentionally deferred; see `backlog.local.md`.

## License

The website content is part of the CukeDedup project family and MIT licensed. CukeDedup is an
independent project, not affiliated with or endorsed by the Cucumber project or its maintainers.
