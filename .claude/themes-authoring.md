# Themes Authoring Guide

Pitfalls and conventions for authoring a new theme
(`packages/themes/src/<slug>/_variables.scss`) on top of Bulma 1.x in
this repository. Applies to all three CSS variants produced by
`packages/themes/build.ts` (`theme.min.css`, `theme.data.min.css`,
`theme.full.min.css`).

## Bulma 1.x custom-property structure

Bulma 1.x defines its colors on three axes — `--bulma-<token>-h`,
`--bulma-<token>-s`, `--bulma-<token>-l` — and assembles derived colors
on `:root`:

```
--bulma-primary: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 1);
```

Other derived tokens follow the same shape, but some of them read from
*different* lightness components than you might expect:

- `--bulma-primary` (saturated fill) reads `--bulma-primary-l`.
- `--bulma-link-text` (the actual color used by `<a>`) reads
  **`--bulma-link-on-scheme-l`**, not `--bulma-link-l`.
- `--bulma-<token>-invert` (text drawn on top of a saturated `<token>`
  surface) reads `--bulma-<token>-invert-l`, which is computed by
  Bulma's SCSS palette generator at build time.

Understanding which lightness variable each rendering path consults is
the key to avoiding the pitfalls below.

## Pitfall 1: derived colors are resolved eagerly at `:root`

A derived custom property like `--bulma-primary` is resolved on `:root`
once, and then inherited to descendants as the **already-substituted**
color value. Nested `var()` resolution does not run lazily at every use
site; it behaves closer to eager substitution at the declaring element.

The consequence: if you override only `--bulma-primary-h` on a
descendant scope (for example `[data-theme=foo]`), `--bulma-primary`
itself still holds the color resolved from `:root`'s original H/S/L
values. The navbar background, `.button.is-primary`, and other surfaces
that read `--bulma-primary` directly will **not** pick up your H/S/L
overrides.

### Impact by variant

- `theme.min.css` — `@include variables` is applied on `:root`, so
  H/S/L overrides cascade through Bulma's own `:root` definition of
  `--bulma-primary`. No problem.
- `theme.full.min.css` — same as `theme.min.css`. No problem.
- `theme.data.min.css` — `@include variables` is applied on
  `[data-theme=<slug>]`. **Derived colors do not follow.** If you intend
  to use this variant for runtime theme switching, the override must
  also restate the resolved colors directly.

### Mitigation

If only `:root`-applied variants are used in practice, overriding H/S/L
is enough. If you need `data-theme`-attribute switching to actually
work, additionally emit explicit values like
`--bulma-primary: hsl(<h>deg, <s>%, <l>%);` so the descendant scope
overrides the resolved color too.

This trap is currently treated as known: address it when a downstream
consumer actually depends on the `data-theme` switching variant.

## Pitfall 2: `<a>` color is not derived from `--bulma-link-l`

The `<a>` element's `color` is `var(--bulma-link-text)`, which Bulma
defines as
`hsl(var(--bulma-link-h), var(--bulma-link-s), var(--bulma-link-on-scheme-l))`.
It does **not** read `--bulma-link-l`.

Bulma's default `--bulma-link-on-scheme-l` is `58%` (light mode), whereas
its default `--bulma-link-l` is `47%`. The split exists because Bulma
wants the body-text version of the link to be slightly brighter than the
saturated `.button.is-link` background for readability on white.

If a theme author overrides only `$link-l` (say, to `30%` for a deeper
teal), the saturated `.button.is-link` background renders at the
intended L=30% but body `<a>` text renders at H/S=overridden, L=58%
(Bulma's untouched default). The body link visibly looks brighter than
the button.

### Mitigation

If body links and `.button.is-link` should use the same color (the
common case for a brand-color link), set
`$link-on-scheme-l: $link-l !default;` and emit
`--bulma-link-on-scheme-l` from the mixin.

If you want to honor Bulma's "text needs different contrast from
background" model, declare `$link-on-scheme-l` independently of
`$link-l` (e.g., `$link-on-scheme-l: $link-l + 5% !default;`). Either
way, do not silently leave `--bulma-link-on-scheme-l` unset while
overriding `$link-l`.

### Tokens with the same `*-on-scheme-l` pattern

The same split applies to every other Bulma color token. Override the
`-on-scheme-l` counterpart whenever you customize the base `-l` and
want `.has-text-<token>` body usage to match:

- `--bulma-primary-on-scheme-l` (default 21%) — used by
  `.has-text-primary`
- `--bulma-info-on-scheme-l` (default 25%)
- `--bulma-success-on-scheme-l` (default 23%)
- `--bulma-warning-on-scheme-l` (default 23%)
- `--bulma-danger-on-scheme-l` (default 40%)

For themes that do not lean on `.has-text-<token>` heavily, this is
easier to leave alone; revisit when those classes are used.

## Pitfall 3: `*-invert-l` is computed by the SCSS palette generator

`--bulma-primary-invert-l`, `--bulma-link-invert-l`, etc. govern the
text color drawn on saturated brand surfaces (navbar items, primary
buttons). Bulma derives these via its SCSS palette generator at compile
time, based on its original color values. They will **not** recompute
when you override H/S/L at runtime.

The risk: if your primary is dark, the SCSS-derived invert may land on
a dark value (because Bulma's original primary was lighter), leaving
illegible dark-on-dark text on navbar items and `.button.is-primary`.

### Mitigation

Explicitly emit `--bulma-primary-invert-l` (and likewise
`--bulma-link-invert-l`). For a dark primary (L ≲ 35%), `100%` (white)
is the standard choice. For a light primary, `0%` (black) is the
inverse. Reflect this with a SCSS default like
`$primary-invert-l: 100% !default;`.

## Pitfall 4: `.navbar.is-primary` does not override `--bulma-navbar-burger-color`

The base `.navbar` rule in Bulma 1.x sets
`--bulma-navbar-burger-color: var(--bulma-link)`, and the actual
`.navbar-burger` rule reads `color: var(--bulma-navbar-burger-color)`.
The `.navbar.is-primary` modifier overrides `--bulma-burger-h`,
`--bulma-burger-s`, and `--bulma-burger-l` (to follow primary), but
**does not** override `--bulma-navbar-burger-color`. The `--bulma-burger-*`
overrides are effectively dead because the later `.navbar-burger`
rule's `color` declaration wins the cascade with
`--bulma-navbar-burger-color`.

The visible symptom: on narrow viewports where the navbar collapses to
a burger button, the burger icon stays link-colored even on a
`.navbar.is-primary` background. For a theme that intentionally uses a
non-link color on primary surfaces (i.e., any theme with
`$primary-invert-l: 100%`), this is a clear visual regression — dark
link-colored bars on a dark primary navbar.

### Mitigation

Inside `@mixin variables`, add a nested rule that ties the burger color
to the primary invert (the same value navbar items already use):

```scss
@mixin variables {
  // ... custom property emissions ...

  .navbar.is-primary {
    --bulma-navbar-burger-color: var(--bulma-primary-invert);
  }
}
```

This pattern only fixes the `is-primary` navbar. If a theme uses
`.navbar.is-link`, `.navbar.is-info`, etc., apply the same override per
modifier color. Most themes only style `is-primary` for the navbar, so
in practice this is a single-rule fix.

## Pitfall 5: avoid emitting `*-l` for scheme/text if you only tint H/S

When overriding `$scheme-h` / `$scheme-s` to tint the page background
toward the brand hue, it is tempting to also emit
`--bulma-scheme-main-l`, `--bulma-background-l`, `--bulma-text-l`, etc.
**Do not emit those L values unless you have a specific reason to.**

Bulma's defaults for those `-l` tokens are paired with a
`prefers-color-scheme: dark` media query that auto-switches them in
dark mode. If a theme pins them to fixed values at the `:root` level,
dark-mode auto-switching breaks (or returns inconsistent results)
because the theme's static L overrides Bulma's media-query-driven L.

For an H/S-only tint, emit only `--bulma-scheme-h`, `--bulma-scheme-s`,
`--bulma-text-h`, `--bulma-text-s` and let Bulma handle the L axis.

## Minimum viable theme: variable checklist

For a color-only theme that inherits Bulma defaults for radius / shadow
/ spacing, emit at least the following from `@mixin variables`:

```scss
@mixin variables {
  // scheme / text hue tint (do not emit L — see Pitfall 5)
  --bulma-scheme-h: #{$scheme-h};
  --bulma-scheme-s: #{$scheme-s};
  --bulma-text-h: #{$text-h};
  --bulma-text-s: #{$text-s};

  // primary
  --bulma-primary-h: #{$primary-h};
  --bulma-primary-s: #{$primary-s};
  --bulma-primary-l: #{$primary-l};
  --bulma-primary-invert-l: #{$primary-invert-l};   // Pitfall 3

  // link (covers both body links and .button.is-link)
  --bulma-link-h: #{$link-h};
  --bulma-link-s: #{$link-s};
  --bulma-link-l: #{$link-l};
  --bulma-link-invert-l: #{$link-invert-l};         // Pitfall 3
  --bulma-link-on-scheme-l: #{$link-on-scheme-l};   // Pitfall 2

  // info / success / warning / danger
  --bulma-info-h: #{$info-h};
  --bulma-info-s: #{$info-s};
  --bulma-info-l: #{$info-l};
  // ...same pattern for success / warning / danger

  // burger color on primary navbar — see Pitfall 4
  .navbar.is-primary {
    --bulma-navbar-burger-color: var(--bulma-primary-invert);
  }
}
```

If your theme uses `.has-text-<token>` for any of primary / info /
success / warning / danger as body text, also emit the corresponding
`--bulma-<token>-on-scheme-l` (Pitfall 2).

## Status of existing themes against these pitfalls

- `packages/themes/src/pulse/_variables.scss` currently **trips
  Pitfall 2**: it overrides `$link-l: 39%` but does not override
  `link-on-scheme-l`, so body `<a>` text renders at L=58%
  (Bulma's default) rather than at L=39%. Whether this is intentional
  for Pulse's look or an oversight is unconfirmed. Treat any
  retroactive fix as a separate task with its own design decision.
