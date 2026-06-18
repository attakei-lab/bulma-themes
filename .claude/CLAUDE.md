# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Bun workspace monorepo (`workspaces: ["apps/*", "packages/*"]`) with two members:

- `packages/themes/` — `@attakei/bulma-themes`: the SCSS-sourced theme library that compiles to plain CSS variants.
- `apps/website/` — `website`: an Eleventy 3 demo / showcase site that consumes the theme package via `workspace:*`.

The `apps/website/` package depends on `@attakei/bulma-themes` through the workspace symlink (`bun install` resolves it), so the website does not have to know where the theme dist lives on disk.

## Common commands

Run from the workspace member directory unless noted.

| Where | Command | What it does |
| --- | --- | --- |
| `packages/themes/` | `bun run build` | Compile every theme in `src/<theme>/` to `dist/<theme>/*.min.css` (compressed). |
| `packages/themes/` | `bun run build:debug` | Same but `expanded` style + `.map` files alongside `*.css` (no `.min.` suffix). |
| `apps/website/` | `bun run dev` | Eleventy `--serve` against `eleventy.config.ts` (dev URLs). |
| `apps/website/` | `bun run build` | Eleventy build against `eleventy.publish.config.ts` (release URLs). |
| repo root | `bun install` | Installs deps and links workspace packages. |
| repo root | `lefthook run pre-commit --all-files` | Run the same hook the pre-commit + CI uses on the whole repo. |

The website's `dev` / `build` does **not** trigger the theme build. Re-run `bun run build` in `packages/themes/` whenever theme source changes — the website will pick up the new CSS through the passthrough copy described below. `dist/` is `.gitignore`d at the repo root; the theme build does not clean it, so running `build` after `build:debug` leaves both sets of files side by side (intentional for local iteration).

## Theme library architecture (`packages/themes/`)

### Per-theme source = one file

Each theme has exactly one hand-written file: `src/<theme>/_variables.scss`. It defines `!default` Sass variables (one per CSS custom property, e.g. `$primary-h`, `$radius-medium`, `$primary-invert-l`) plus a single `@mixin variables` that emits Bulma's `--bulma-*` custom properties. The mixin may also nest targeted Sass rules (e.g. `.button.is-link { ... }`) that get scoped to the theme selector at build time.

Downstream consumers can `@use ".../variables" as t with ($primary-h: 280, ...)` to override individual tokens.

### Three CSS outputs per theme

`build.ts` walks `src/` directories and emits three variants per theme using `sass.compileString`:

| Output | Generated entry SCSS (in-memory) | Use case |
| --- | --- | --- |
| `theme.min.css` | `@use "_variables" as v; :root { @include v.variables; }` | Apply theme alongside an existing Bulma. |
| `theme.data.min.css` | `... [data-theme=<slug>] { @include v.variables; }` | Multi-theme switching via `<html data-theme>`. |
| `theme.full.min.css` | `@use "pkg:bulma"; @use "_variables" as v; :root { @include v.variables; }` | Bundle Bulma + theme; replaces vanilla Bulma. |

Bulma is resolved through `sass.NodePackageImporter` so `@use "pkg:bulma"` honours the package's `main: "bulma.scss"`. There is no other build step or watcher.

### Future-proofing

Dark mode is expected for later themes — keep the `_variables.scss` mixin shape and `build.ts` variant list extensible (e.g. a sibling `@mixin variables-dark` or a `prefers-color-scheme` wrapping in the entry templates) rather than refactoring once a dark theme lands.

## Website architecture (`apps/website/`)

### Eleventy config split

- `eleventy.config.ts` defines all behaviour (collections, passthrough copy, FontAwesome plugin, `.ts` data extension). It does **not** call `addGlobalData("site", ...)`.
- `eleventy.publish.config.ts` imports the base config, awaits it, then layers a release-only `addGlobalData("site", { url, base_path })` for GitHub Pages.
- Default `site` data lives in `src/_data/site.ts` (full set: `url`, `base_path`, `title`, `repo_url`). The function receives `configData.site` and merges any `addGlobalData("site", ...)` overrides over the defaults — so the publish config only needs to provide the keys that differ. **Keep `_data/site.ts` authoritative**: when splitting config into default + override layers, the default side must hold the complete current value set; the override side specifies only the keys that actually differ.

### `.ts` data extension

`eleventyConfig.addDataExtension("ts", { read: false, parser })` imports each `.ts` data file and **manually invokes** the function-default-export with `eleventyConfig.globalData` — Eleventy does not auto-call functions returned from custom parsers, so this mirrors the built-in `.js` data-file behaviour for `_data/*.ts`.

### Theme consumption via npm resolution (no copying)

`eleventy.config.ts` resolves the theme package via `import.meta.resolve("@attakei/bulma-themes/package.json")` and passes its `dist/` directory to `addPassthroughCopy` mapped to `/dist/`. Result: theme CSS is served at `/dist/<slug>/theme.*.min.css` without committing any duplicated files into the website tree. The workspace symlink set up by `bun install` makes this work without an additional install step.

### Theme pages, demos, and gallery

- Each theme has an MD page at `src/theme/<slug>.md` with `layout: theme.html` frontmatter. `<slug>` must match a `packages/themes/src/<slug>/` directory so `dist/<slug>/theme.full.min.css` resolves.
- `eleventy.config.ts` exposes `collections.theme` via `addCollection("theme", api => api.getFilteredByGlob("./src/theme/*.md"))`. The nav dropdown (`_includes/nav.html`) and the homepage gallery (`_layouts/index.html`) both iterate this collection — no manual list maintenance.
- Demo snippets under `src/_includes/theme/*.html` are flat files prefixed by section (`form-`, `element-`, `component-`). They are `{% include %}`'d in `_layouts/theme.html` in Bulma documentation menu order (Elements → Components → Form).
- Per-theme thumbnails are generated by paginating `collections.theme` through `src/theme-thumb.njk` → `/theme/<slug>/thumb/`, rendered by `_layouts/thumb.html`. The homepage gallery embeds these via `<iframe>` with `pointer-events: none` so card clicks land on the wrapping anchor.

### FontAwesome icon sizing

The `@11ty/font-awesome` plugin emits dimensionless `<svg>`. It is configured in `eleventy.config.ts` with `defaultAttributes: { class: "svg-inline--fa", "aria-hidden": "true" }`, and `assets/custom.css` mirrors FontAwesome's `.svg-inline--fa { height: 1em; ... }` rule so icons render at icon-sized dimensions instead of the SVG default 300×150. Adding new icons does not require additional rules.

## Tooling

The full lint / format stack is wired into `lefthook.yaml` and runs both as a pre-commit hook and inside CI:

| Tool | Files | Notes |
| --- | --- | --- |
| Biome | `*.{js,ts,jsx,tsx}` | `--fix` is on, `stage_fixed: true`. Config: `biome.json` (recommended preset, double quotes). |
| Stylelint | `*.{css,scss,sass}` | `--fix` is on. Config: `.stylelintrc.js` extending `stylelint-config-standard-scss`. |
| yamllint | `*.{yml,yaml}` | Default ruleset with `truthy` extended to allow GitHub Actions' unquoted `on:`. `aqua.yaml` is excluded (rewritten by aqua). |
| actionlint | `.github/workflows/*.{yml,yaml}` | Installed via aqua. |
| oxfmt | `*.{json,jsonc,json5}` | Auto-applies. Installed via aqua. |

Versioned CLIs (`bun`, `lefthook`, `actionlint`, `yamllint`, `oxfmt`) are pinned in `aqua.yaml` so the whole CLI surface is managed by aqua, not npm. Renovate watches the aqua refs through `aquaproj/aqua-renovate-config`.

CI (`.github/workflows/ci.yaml`) has two jobs: `lint` runs the lefthook stack plus a renovate-config-validator (pinned by commit SHA), and `build-test` builds both the theme package and the website.

## Renovate

`renovate.json5` configuration is opinionated:

- Extends `config:recommended` + `aquaproj/aqua-renovate-config`.
- Asia/Tokyo timezone; weekend daytime schedule (`* 9-12 * * 0,6`). The leading `*` for minutes is required by Renovate's docs — keep it as is.
- `automerge: true` by default with a `matchUpdateTypes: ["major"]` override that turns off automerge, so Bulma / Eleventy / Sass / Bun majors always require human review.
- `minimumReleaseAge: "3 days"` waits out hotfixes before pulling updates in.

## Commit conventions

`feat(<scope>): ...` / `chore(<scope>): ...` / `fix(<scope>): ...` style, where `<scope>` is the workspace member (`themes`, `website`) or a top-level concern. Match commit contents to the stated goal of the change — do not bundle "next-step" edits that share a feature area but a separate intent. Use HEREDOCs when authoring commit messages to preserve formatting.
