---
title: Color Palette
description: The library's secondary extension colour
---

## `secondary`

Bulma ships five colour palettes — `primary`, `link`, `info`, `success`,
`warning`, `danger` — but no **`secondary`**. This library adds a `secondary`
palette to every theme it publishes: a standard extension colour that sits
alongside `primary` as a second brand tone.

Because `secondary` is registered into Bulma's own colour map, it behaves
exactly like a built-in palette — the same class names, helpers, and custom
properties are generated for it.

## What you can use

Every theme's `theme.min.css` exposes the full `secondary` surface:

- **Component modifiers** — `.is-secondary` on the components that take a
  colour modifier: `.button`, `.tag`, `.notification`, `.message`, `.table`
  rows, `.panel`, `.progress`, `.input`, `.select`, and the rest.
- **Colour helpers** — `.has-text-secondary` and `.has-background-secondary`
  (plus the `-light` / `-dark` / `-soft` / `-bold` variants Bulma derives).
- **Custom properties** — `--bulma-secondary`, `--bulma-secondary-h` /
  `-s` / `-l`, `--bulma-secondary-invert`, and the derived shade tokens, for
  use in your own CSS.

```html
<button class="button is-secondary">Secondary</button>
<span class="tag is-secondary">Secondary</span>
<p class="has-text-secondary">Secondary text</p>
```

## How the colour is chosen

`secondary` is a *supporting* tone to `primary`; its role is deliberately
open. Across the published themes it tends to be one of:

- an **accent** — a distinct second hue that complements the primary,
- a **neutral** — a grey used for lower-emphasis surfaces, or
- a **fallback** — equal to the primary, for themes that have no distinct
  supporting colour.

Each theme picks whichever reading fits its own design language, so the
`secondary` you get depends on the theme you load.

## Customising it

The prebuilt `theme.min.css` is a drop-in. To change the `secondary` value,
build from the theme's SCSS source and override its tokens:

```scss
@use "…/<theme>/variables" as t with (
  $secondary-h: 261,
  $secondary-s: 44%,
  $secondary-l: 70%,
);

:root {
  @include t.variables;
}
```

`$secondary-h` / `$secondary-s` / `$secondary-l` set the base colour;
`$secondary-invert-l` (optional) pins the text colour drawn on top of a
`secondary` fill when the automatically chosen contrast is not what you want.
