---
name: create-theme
description: Author a new Bulma theme by extracting colors / tokens from a reference URL, iterate with the user via apps/website preview, and ship two scoped commits through /ship-pr. Use when the user wants to start a new theme from an existing site's design.
---

# create-theme

This skill takes a reference URL (e.g. `https://bootswatch.com/cerulean/`) and walks it through to a merged PR adding a new theme to the repository. It is the only sanctioned end-to-end path for "make a theme from this URL".

The flow has six phases (A–F). Do not reorder or skip; the file-layout, commit-shape, and Pitfall guarantees depend on this ordering. Token-emission rules referenced below are documented in `.claude/themes-authoring.md` — keep that document and this skill in sync.

Invocation: `/create-theme <url>`.

## Phase A — Pre-work agreement & extraction

### A.1 — Lock the inputs (single batched ask)

Immediately after invocation, ask the user once for all of the following, presenting your best derivations as defaults:

- **slug** — kebab-case dir name; default = last URL path segment, lowercased and de-suffixed. Must not collide with an existing `packages/themes/src/<slug>/` directory; if it does, halt and ask for an alternative.
- **title** — display name shown on the website; default = slug titlecased.
- **description** — short one-liner for the MD frontmatter; no default, must be supplied.
- **Issue #** — optional. If given, every commit on this branch gets `Refs: #N` (per CLAUDE.md > Commit conventions). If absent, omit the trailer.
- **branch name** — default `feature/theme-<slug>`. Must satisfy the push allow-list in `branch-strategy.md`.
- **push & PR authorization** — confirm the user agrees to Phase F running `/ship-pr`.

Do not write any file before all of the above are agreed.

### A.2 — Extract tokens from the URL

Run a hybrid extraction:

1. `WebFetch` the URL; parse out `<link rel="stylesheet">` hrefs.
2. `WebFetch` each linked stylesheet (limit to same-origin / CDN matches that look like the site's own CSS — skip analytics / fonts).
3. Parse `:root { --... }` custom properties first (Bootstrap-style sites). Fall back to rule-body scanning for `.btn-primary`, `a`, `body`, etc. when no useful custom properties exist.
4. Convert any hex / rgb values to HSL (deterministic; compute inline).
5. If after extraction you have fewer than 4 of the following 6 tokens — primary, link, scheme bg, text fg, one admonition, radius — declare low confidence and ask the user for a screenshot of the reference site, then read colors from the image instead.

Map extracted values to Bulma tokens using this target shape (matches `packages/themes/src/default/_variables.scss`):

- always emit (when extracted): `scheme-h/s`, `text-h/s`, `primary-h/s/l`, `link-h/s/l`, `info/success/warning/danger -h/s/l`
- always emit (Pitfall 3): `primary-invert-l` (100% if `$primary-l ≲ 35%`, else 0%); `link-invert-l` likewise
- always emit (Pitfall 6): pin `--bulma-control-*` on the shared control selector group inside the mixin so bare `.button` / `.input` / `.textarea` / `.select select` / `.pagination-*` resolve their padding, border, and height correctly (see Phase B.1 template)
- always emit (Pitfall 9): pin `.panel-icon svg` and its `<use>` to `1em` inside the mixin so `<use href="#symbol">`-pattern SVGs (the shape `@11ty/font-awesome` emits) sit inside the panel-icon slot instead of drifting to the right of the label
- always emit (Pitfall 10): pin `--bulma-shadow` on `.box, .card, .panel` with a literal two-stop value so the drop shadow + inner 1px ring render. Skip when the theme already overrides `--bulma-shadow` at `:root` with a fully literal value (e.g. a hairline ring) — that route resolves without further chains
- always emit (Pitfall 11): pin `--bulma-border-weak` on `.card, .panel` and `--bulma-card-header-shadow` on `.card` so the sub-component separators render
- conditional: `*-on-scheme-l` only if the reference site uses the token as body text (Pitfall 2)
- conditional: `radius-small`, `$radius`, `radius-medium`, `radius-large` only if the source has a clearly different radius from Bulma's defaults
- conditional: shadow tokens only if the source shows a distinct, simple `box-shadow` on box-like elements
- **never** emit `scheme-main-l`, `background-l`, `text-l`, `text-strong-l` unless the user explicitly requests it (Pitfall 5: pinning these breaks dark-mode auto-switching)

For any token in the "missing" set, leave it unemitted and report it as "left to Bulma default" at the end of Phase B.

## Phase B — Skeleton write + dev server

### B.1 — Write `packages/themes/src/<slug>/_variables.scss`

Use the structure of `packages/themes/src/default/_variables.scss` as the template (SPDX header, `!default` Sass variables, `@mixin variables { ... }`). Always include these two fixed rules inside the mixin:

```scss
// Pitfall 6: pin every --bulma-control-* on the shared control selector
// group so bare `.button` / `.input` / `.textarea` / `.select select` /
// `.pagination-*` and their icons resolve their padding, border, height,
// and radius correctly.
.button,
.control,
.file-cta,
.file-name,
.input,
.pagination,
.pagination-ellipsis,
.pagination-link,
.pagination-next,
.pagination-previous,
.select,
.select select,
.textarea {
  --bulma-control-border-width: 1px;
  --bulma-control-height: 2.5em;
  --bulma-control-padding-vertical: calc(0.5em - 1px);
  --bulma-control-padding-horizontal: calc(0.75em - 1px);
  --bulma-control-radius: #{$radius};
}

// Pitfall 4: burger icon on .navbar.is-primary follows primary-invert.
.navbar.is-primary {
  --bulma-navbar-burger-color: var(--bulma-primary-invert);
}

// Pitfall 9: pin `<use>`-pattern SVG icons inside .panel-icon to 1em
// so they sit in the icon slot instead of overflowing rightward.
.panel-icon svg {
  width: 1em;
  height: 1em;
}
.panel-icon svg use {
  width: 100%;
  height: 100%;
}

// Pitfall 10: pin --bulma-shadow on .box / .card / .panel so the
// drop-shadow + 1px-ring render (skip if the theme already pins
// --bulma-shadow at :root with a fully literal value).
.box,
.card,
.panel {
  --bulma-shadow:
    0 0.5em 1em -0.125em hsla(221deg, 14%, 4%, 0.1),
    0 0 0 1px hsla(221deg, 14%, 4%, 0.02);
}

// Pitfall 11: pin --bulma-border-weak and --bulma-card-header-shadow so
// .card-footer / .panel-block separators and the card-header bottom
// rule render. Use neutral `hsl(0, 0%, ...)` if the theme has no scheme
// tint; otherwise interpolate $scheme-h / $scheme-s.
.card,
.panel {
  --bulma-border-weak: hsl(#{$scheme-h}, #{$scheme-s}, 93%);
}
.card {
  --bulma-card-header-shadow: 0 0.125em 0.25em hsla(#{$scheme-h}, #{$scheme-s}, 4%, 0.1);
}
```

For themes where body link color visibly diverges from `$link-*` (Pitfall
8), additionally pin `--bulma-link-text` on `a`. Drive from theme intent
during Phase C — not a default:

```scss
a {
  --bulma-link-text: hsl(#{$link-h}, #{$link-s}, #{$link-on-scheme-l});
}
```

For themes that want headings tinted with the brand color (Pitfall 7),
emit these inside the mixin (also driven from theme intent, not default):

```scss
.title {
  --bulma-title-color: var(--bulma-primary);
}
.content {
  --bulma-content-heading-color: var(--bulma-primary);
}
```

### B.2 — Write `apps/website/src/theme/<slug>.md` (skeleton)

Frontmatter only; the body is intentionally left empty and gets authored in Phase D:

```markdown
---
title: <Title>
description: <description>
layout: theme.html
theme: <slug>
---
```

### B.3 — Start (or reuse) the dev server

Per-worktree state lives in `.claude/dev-server.json` (gitignored). It records `{ "port": <n>, "pid": <n>, "owned": <bool> }`. Tracking the PID alongside the port prevents accidental attachment to (or kill of) an unrelated process that happens to be listening on the recorded port.

1. If `.claude/dev-server.json` exists:
   1. Read the recorded `pid` and verify the process is alive (`kill -0 <pid>` returns 0).
   2. Confirm the recorded `pid` is still the listener on the recorded `port` (`lsof -ti :<port>` returns `<pid>`, or `ss -tlnp` shows the same pid).
   3. Both checks pass → **reuse** the running server. Leave the file as-is.
   4. Either check fails → treat the state as stale: ignore the file (it will be overwritten in step 4 below) and continue.
2. Pick the first free port in `8080, 8081, 8082, ...` by probing `lsof -ti :<p>` and choosing one with no listener.
3. Start the server in background from `apps/website/`:
   ```shell
   bun run dev -- --port=<port>
   ```
   Use the Bash tool's `run_in_background` mode and capture the launched process PID (Bash tool's background-task id refers to the shell wrapper; resolve the actual listener with `lsof -ti :<port>` once the server is up).
4. Write `.claude/dev-server.json` with `port`, the resolved listener `pid`, and `owned: true`.
5. Announce the preview URL: `http://localhost:<port>/theme/<slug>/`.

Cleanup (Phase F.2 and the user-abort fallback) must also verify `pid` before killing — `kill <pid>` is preferred over `kill $(lsof -ti :<port>)` so a third-party process that grabbed the port mid-session is not affected.

### B.4 — Initial build

From `packages/themes/`:

```
bun run build
```

Use `build`, not `build:debug`. The website's layouts reference `theme.full.min.css` (the release-mode output); `build:debug` writes only the non-minified `theme.full.css` and leaves the preview link 404 / empty.

If sass fails, attempt to auto-fix the offending value in `_variables.scss` (typical causes: malformed HSL, divide-by-zero in invert-l computation, missing semicolon). Up to **3 attempts**; after each, rebuild. On success, report:

- which fix was applied,
- the symptom that drove it,
- the original intent of the broken value.

On 3rd failure, halt and surface the sass error to the user.

### B.5 — Report

Tell the user:

- the preview URL,
- which Bulma tokens were emitted (grouped by axis),
- which tokens were "left to Bulma default" (missing axis report),
- and that Phase C is starting.

## Phase C — Iterate via the website preview

Send the user a single checklist covering the token axes:

```
scheme bg / text fg / primary / link / info / success / warning / danger / radius / shadow / navbar burger
```

Ask the user to open `http://localhost:<port>/theme/<slug>/`, walk through the checklist, and reply with all items that do not match the reference site (as a list).

For each round of the loop:

1. Read the user's NG list.
2. Edit `_variables.scss` to apply all NG fixes in one batch.
3. Run `bun run build` from `packages/themes/` (the release build is what the website's `theme.full.min.css` link resolves to).
4. If sass fails, repeat Phase B.4's auto-fix protocol (3 attempts, report cause).
5. Ask the user to refresh and re-check.

Repeat until the user explicitly approves the design (natural-language approval is sufficient).

## Phase D-pre — Design approval gate

Do not proceed past this point without an explicit user approval of the visual design. If the user is hesitant, stay in Phase C.

## Phase E.1 — Commit the SCSS

Stage **only** the SCSS file. Do **not** `git add .` or `-A` (the website MD skeleton is still uncommitted and intentionally separate).

```
git add packages/themes/src/<slug>/_variables.scss
```

Commit using HEREDOC. Include `Refs: #N` if an Issue number was agreed in Phase A.1:

```
git commit -m "$(cat <<'EOF'
feat(themes): add <Title> theme variables

Refs: #N
EOF
)"
```

(Omit the `Refs:` trailer line if no Issue was agreed.)

## Phase D — Author the MD body

Now write the actual description copy into `apps/website/src/theme/<slug>.md`. Look at existing theme MDs (e.g. `apps/website/src/theme/pulse.md`) for the established tone: a short statement about what the theme is, followed by a sentence pointing to the source URL.

Propose a draft, let the user revise, and iterate until they approve the body.

## Phase E.2 — Commit the MD

Stage **only** the MD file:

```
git add apps/website/src/theme/<slug>.md
```

Commit with the same `Refs:` rule:

```
git commit -m "$(cat <<'EOF'
feat(website): add <slug> theme page

Refs: #N
EOF
)"
```

## Phase F — Ship and cleanup

1. Invoke `/ship-pr`. Branch reconciliation, PR creation, CI wait, CodeRabbit handling, and conditional auto-merge are entirely owned by that skill — do not reimplement any part of it here.
2. After `/ship-pr` returns control, read `.claude/dev-server.json`. If `owned: true`:
   - Verify the recorded `pid` is still alive and still owns the recorded `port` (same checks as Phase B.3 step 1).
   - If both checks pass, kill that process: `kill <pid>` (do **not** fall back to `kill $(lsof -ti :<port>)` — the port could now belong to an unrelated process).
   - If either check fails, leave the listener alone and just remove the file.
   - Remove `.claude/dev-server.json`.
3. Report the merged PR URL (or current PR status if not auto-merged) to the user.

## Error handling

- **Existing slug directory**: halt at Phase A.1; ask for a different slug. Do not overwrite.
- **CSS extraction yields <4 of 6 axes**: switch to screenshot-based extraction (Phase A.2 step 5).
- **Sass build error**: 3-attempt auto-fix per Phase B.4; halt and surface the error on 3rd failure.
- **User aborts mid-flow**: leave any in-progress files on disk for the user to inspect. Do not delete; do not commit. The dev server may be left running — next invocation's Phase B.3 will reuse or supersede.

## Out of scope

- Editing or re-tuning an existing theme (the skill errors out on slug collision; a separate flow handles edits).
- Dark-mode variants (themes-authoring.md > Future-proofing reserves this work).
- Adding new demo HTML partials under `apps/website/src/_includes/theme/`.
- Any work that touches `packages/themes/build.ts` or the website's Eleventy config.
