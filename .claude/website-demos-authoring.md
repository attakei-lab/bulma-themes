# Website Demos Authoring Guide

Conventions for authoring the per-theme demo pages under
`apps/website/src/theme/<slug>.md` and the supporting include
partials under `apps/website/src/_includes/theme/`.

The goal of these pages is twofold:

1. **Make a theme's characteristics visible** to someone evaluating
   the theme — brand colors, link hue, radius, shadow, heading
   treatment, etc.
2. **Surface defects** in either the theme or the demo template by
   exposing the rendering paths that the `themes-authoring.md`
   pitfalls cover (bare `var()` chains, `panel-icon` sizing,
   `card`/`box`/`panel` shadow propagation, etc.).

Both goals are served by a single layout: an integrated top
**Showcase** section that compresses the theme's standard look into
one page-band, followed by a **Demo** section that exposes each
Bulma component through a small set of matrix subsections.

## Directory layout

```text
apps/website/src/_includes/theme/
├── _menu.html          ← side nav (structural)
├── _showcase.html      ← integrated top Showcase (structural)
├── element-*.html      ← per-element preview snippets
├── component-*.html    ← per-component preview snippets
└── form-*.html         ← per-form-control preview snippets
```

Eleventy renders these via `apps/website/src/_layouts/theme.html`,
which composes the page as:

```text
hero (theme title)
└── overview (markdown content from the theme page itself)
└── showcase (include "theme/_showcase.html")
└── demo
    ├── side nav (include "theme/_menu.html")
    └── per-component preview includes
```

## File naming convention

- **`_<name>.html`** (leading underscore): structural / layout
  partials. Not a preview itself.
- **`<name>.html`** (no underscore): a self-contained preview
  snippet rendered as a numbered demo block in `theme.html`.

The leading underscore mirrors the Sass partial convention. Eleventy
itself does not treat the prefix specially; the rule is purely
authoring discipline so structural files and preview files can be
told apart by name.

When adding a new preview snippet, follow the existing prefix
(`element-` / `component-` / `form-`) so it lands under the
correct nav-menu group in `_menu.html`.

## Subsection dictionary

Each per-component preview file uses a fixed dictionary of
subsection labels. A given file emits only the subsections that
make sense for that component; the order below is observed when
multiple subsections are present.

| Heading       | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `Colors`      | Color modifiers (`is-primary` / `is-info` / `is-success` / `is-warning` / `is-danger`), plus `is-light` / `is-dark` variants where Bulma supports them. |
| `Sizes`       | Size modifiers (`is-small` / `is-normal` / `is-medium` / `is-large`).   |
| `States`      | Element states (`disabled` / `is-loading` / `is-active` / `is-focused` / `is-hovered` / `is-current`). |
| `Modifiers`   | Component-specific modifiers (`is-outlined` / `is-inverted` / `is-rounded` / `is-boxed` / `is-toggle` / `is-striped` / etc.). Anything that doesn't fit the four labels above goes here. |
| `In context`  | The component placed inside a parent that affects how it renders (e.g., `.button` inside `.field.has-addons`, `.input` inside `.panel-block`, `.tag` inside `.tags.has-addons`). Surfaces cross-component pitfalls (e.g., navbar/burger, panel-icon). |

A per-component `Showcase` subsection is **not** part of the
dictionary. Theme-characteristic surfacing is concentrated in the
integrated top Showcase section (see below).

Class hierarchy inside a preview snippet:

- **Component title** (top of the file): `<h3 id="demo-…" class="subtitle is-4">…</h3>`.
  Bulma's `.subtitle.is-4` (1.5rem, lighter weight) reads as a
  "secondary heading" beneath the page-level `<h2 class="title">Demo</h2>`
  while sitting clearly above the `.heading` subsections below it.
  Size (1.5rem) is intentionally kept the same as `.title.is-4` so
  the component title remains skim-able when 23 components stack;
  weight is lighter so the long Demo column does not feel visually
  heavy. The default `.subtitle` size (`.subtitle.is-5`, 1.25rem) was
  rejected because the size difference vs the uppercase-caps
  `.heading` below was too subtle to read as a parent heading.
- **Subsection heading**: `<p class="heading">Label</p>` — Bulma's
  small-caps caption style. Picked deliberately so it doesn't collide
  with the `.title is-N` / `.subtitle is-N` classes the previews
  themselves use (e.g., `element-title.html`'s body content also
  renders `.title is-6`; the subsection heading must read as
  something other than a preview row).
  Spacing for these subsection headings is widened via a scoped
  rule in `_layouts/theme.html` (`#demo .heading { margin-top: 1.5rem;
  margin-bottom: 0.75rem; }`) so labels do not sit flush against
  surrounding content. Bulma's `.heading` default leaves only 5px
  margin-bottom and no margin-top, which reads as cramped inside a
  long demo block.
- **Per-variant label** (Modifiers / In context, when multiple
  distinct variants are stacked in one subsection):
  `<p class="demo-variant"><code>.is-striped.is-hoverable</code></p>` — a
  paragraph with inline `<code>` listing the Bulma classes (or other
  identifying description) of the variant immediately below it. Sizes /
  Colors / States don't need per-variant labels because each cell already
  carries its own inline text label (`Small`, `Primary`, `Hover`,
  etc.).
  The `demo-variant` class is required: a bare `<p>` is zeroed to
  `margin: 0` by Bulma's minireset, leaving the label at zero distance
  from the component directly below (its border/chip visibly touching).
  A scoped rule in `_layouts/theme.html` (`#demo .demo-variant { margin-top:
  1rem; margin-bottom: 0.5rem; }`) restores the spacing, so every new
  variant label must carry the class rather than relying on a bare `<p>`.

## Default-first cell rule

Every matrix subsection whose component has a meaningful "no
modifier" variant **must** include the unmodified element as the
first cell of that subsection. For example:

- `Colors` for buttons starts with a bare `.button` (no `.is-*`)
  next to `.button.is-primary`, `.is-link`, etc.
- `Sizes` starts with the default-size variant alongside `is-small`
  / `is-medium` / `is-large`.

Rationale:

- The bare-no-modifier variant is exactly what trips the `var()`
  chain failures listed as Pitfall 6, 8, and 10 in
  `themes-authoring.md`. Placing it side-by-side with the
  modified variants makes the regression visible at a glance —
  the bare element's height, padding, or border-radius differs
  from the adjacent modified one when the pitfall is active.
- A theme evaluator reading the demo expects "what does a plain
  X look like" to be the first piece of information per
  subsection.

This rule does not apply to elements whose only form is the
unmodified one (`.title`, `.breadcrumb`, the modal-card chrome,
etc.); in those cases the matrix has no "default vs modifier" axis
to begin with.

## Integrated Showcase section

`_includes/theme/_showcase.html` is a single page-band placed
between Overview and Demo. Its job is to compress the theme's
visual signature into one screen-band of content so that a person
landing on `/theme/<slug>/` sees the theme's overall look
immediately, without having to scroll through the matrix-style
Demo section.

Blocks are composed with `.columns` so multiple sit at the same
vertical position:

| Row | Left half                  | Right half                                |
| --- | -------------------------- | ----------------------------------------- |
| 1   | card with image            | title hierarchy + prose with links (stacked) |
| 2   | `.panel.is-primary`        | form group (label + input + textarea + buttons) |
| 3   | message                    | tabs                                      |
| 4   | breadcrumb (full width)                                                |||
| 5   | pagination (full width)                                                |||
| 6   | tags + buttons palette strip (full width)                              |||

Surfaces, by block:

| Block                | Surfaces                                                            |
| -------------------- | ------------------------------------------------------------------- |
| card with image      | Radius, shadow tint (Pitfall 10), separator (Pitfall 11)            |
| title hierarchy      | Heading family, heading color (Pitfall 7), title/subtitle pairing   |
| prose with links     | Link hue (Pitfall 8), `.content a` decoration, heading-in-content   |
| `.panel.is-primary`  | Brand color on a panel-heading, panel-icon (Pitfall 9), panel-block input chain |
| form group           | Bare `.input` chain (Pitfall 6), radius, `.button.is-link` specialty |
| message              | Saturated brand color contrast, `delete` button on colored header   |
| tabs                 | Tab modifier styling, brand-color underline                         |
| breadcrumb + pagination | Bare `.pagination-link` chain (Pitfall 6), separator characters  |
| color palette        | Primary + admonition palette spread (`.tags` row + `.buttons` row)  |

Title hierarchy is paired with prose **in the same column** so that
the column height matches the visually heavy card on the opposite
side. When tuning the title hierarchy length, keep prose stacked
underneath rather than shifting it back to its own row — the
`.columns` row collapses to single-column on narrow viewports, so
the per-row content does not have to assume a fixed split.

A navbar is intentionally **not** part of the Showcase: the page-level
`_includes/nav.html` already sits above with `.navbar.is-primary`, so
a second navbar inside the Showcase container reads as duplication and
appears cropped at both ends (the `.section > .container` wrap clips
the otherwise full-bleed navbar).

When a new theme is added, no per-component changes to the
preview snippets are required. The Showcase block list is shared
across all themes; the visual differences come entirely from the
theme's CSS.

## Adding a new preview snippet

1. Create `_includes/theme/<prefix>-<bulma-name>.html` (no
   underscore prefix — it's a preview).
2. Open with `<div class="container mb-5">` and an anchor
   `<h3 id="demo-<prefix>-<bulma-name>" class="subtitle is-4">…</h3>`.
3. Emit the matrix subsections that apply, in the dictionary order
   (`Colors` → `Sizes` → `States` → `Modifiers` → `In context`).
4. Add an `{% include %}` line in `_layouts/theme.html` next to
   the other includes of the same prefix group (Bulma's
   documentation order: Elements → Components → Form).
5. Add a `<li><a href="#demo-…">…</a></li>` entry to the matching
   group in `_includes/theme/_menu.html`.

## Cross-theme verification

When working on a new theme or chasing a regression, render
`/theme/<slug>/` for every theme in `apps/website/src/theme/`
and compare side-by-side. The Showcase section gives the
at-a-glance comparison; the Demo section's matrix surfaces
per-component breakage.
