---
title: Custom Build
description: Build your own CSS from a theme's Sass source
---

## Why build your own

Each theme's `theme.min.css` is a drop-in replacement for Bulma — no build
step required. If you want to override a theme's tokens (colours, radii,
etc.) rather than just load it as-is, you need the theme's Sass source
instead, compiled in your own project.

## Get the source

Every theme publishes its `_variables.scss` — the file that defines its
Sass tokens (`$primary-h`, `$radius-medium`, and so on) — right next to its
compiled CSS:

```
/dist/<slug>/theme.min.css
/dist/<slug>/_variables.scss
```

Download the one for the theme you're starting from (see that theme's page)
and add it to your own project.

## Wire it into Bulma

`_variables.scss` only defines tokens and a `variables` mixin — it doesn't
pull in Bulma itself. In your own project, with `bulma` installed as a
dependency, write an entry file that combines the two:

```scss
@use "_variables" as v with (
  $primary-h: 210,
  $primary-s: 55%,
  $primary-l: 28%,
);
@use "bulma/sass" as bulma with (
  $custom-colors: v.$custom-colors
);

:root {
  @include v.variables;
}
```

- `@use "_variables" as v with (...)` loads the downloaded file and
  overrides whichever tokens you want to change — omit the `with (...)` block
  entirely to keep the theme's defaults.
- `@use "bulma/sass" as bulma with ($custom-colors: v.$custom-colors)`
  brings in Bulma itself, configured with the theme's `secondary` colour (see
  [Color Palette](/docs/color-palette/) for what that adds).
- `:root { @include v.variables; }` emits the theme's `--bulma-*` custom
  properties.

Compile the entry file with your own Sass toolchain (`sass`, Vite, webpack +
`sass-loader`, …) — any setup that resolves `bulma/sass` through your
project's `node_modules` will work.

This is the same composition the library uses internally to build
`theme.min.css`, just written for a normal Sass project instead of using this
repository's build script.
