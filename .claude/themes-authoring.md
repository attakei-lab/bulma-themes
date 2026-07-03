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

```css
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

## Pitfall 6: the bare `.button` loses padding and border-radius

Bulma 1.x's base `.button {}` rule pulls two values through a `var()`
chain that originates on `:root`:

- `--bulma-button-border-width: var(--bulma-control-border-width)` —
  consumed inside the `padding` calc().
- `border-radius: var(--bulma-control-radius)` (inherited from the
  shared `.button, .input, ...` rule) — `--bulma-control-radius` is
  itself `var(--bulma-radius)` on `:root`.

For reasons not yet diagnosed in this project's bundle, both var()
chains fail to resolve on the **bare `.button`** (no `.is-*` modifier
of any kind). The `padding` calc collapses to 0 and `border-radius` is
discarded — the button renders ≈10px shorter than `.button.is-primary`
beside it, with text flush against the border and square corners.

Why only the bare button: every `.is-*` modifier (color modifiers like
`.is-primary` set `--bulma-button-border-width: 0px`; size modifiers
like `.is-small` / `.is-normal` / `.is-medium` / `.is-large` set
`--bulma-control-radius: var(--bulma-radius-*)`) re-declares the
relevant variable on a `(0, 2, 0)`-specificity selector. Re-declaring
with a fresh `var()` substitution apparently sidesteps the failure.
The unmodified `.button` (specificity `(0, 1, 0)`) never gets a
re-declaration, so it stays stuck with the broken chain.

Both Pulse and the default theme exhibit this — the bug is
template-wide, not theme-specific. Root cause is open.

The same chain failure affects every other bare control element — `.input`,
`.textarea`, `.select select`, `.pagination-link` / `-next` / `-previous` /
`-ellipsis`, and the `.file-cta` / `.file-name` pair. They share Bulma's
control rule (`.button, .file-cta, ..., .textarea { ... }`) and read the
same `--bulma-control-*` family. Padding collapses, border-radius
disappears, and on `.pagination-link` `border-width` falls back to the CSS
initial value `medium` (≈3px), making the link appear with a thick frame.

Icons positioned by `.control.has-icons-left .icon { width: var(--bulma-
input-height) }` are affected too, because `--bulma-input-height` chains
to `--bulma-control-height`; when the chain fails, icons collapse to
their intrinsic glyph size instead of filling the input's vertical
extent.

### Mitigation

Pin every `--bulma-control-*` token literally on Bulma's shared control
selector group **and** on the `.control`, `.pagination`, and `.select`
wrappers — child elements that read `--bulma-input-*` /
`--bulma-pagination-item-*` (which themselves chain to `--bulma-control-*`)
then resolve correctly via inheritance. `--bulma-control-radius` is
interpolated from `$radius` so the theme's chosen base radius applies:

```scss
@mixin variables {
  // ... custom property emissions ...

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
}
```

`.is-*` modifiers retain their own higher-specificity declarations, so
size variants still pick up `--bulma-radius-small` / `-medium` /
`-large`, and color variants still render with `border-width: 0px`.

This is a template-wide workaround; new themes should emit it by
default until the root cause in the var chain is understood and fixed.

## Pitfall 8: `--bulma-link-text` can fail to resolve on `<a>`

Bulma's `:root` block sets

```css
--bulma-link-text: hsl(var(--bulma-link-h), var(--bulma-link-s), var(--bulma-link-on-scheme-l));
```

then `a { color: var(--bulma-link-text) }` reads it. The same class of
`var()` chain failure described in Pitfall 6 also affects this token at
the `<a>` element: under the right conditions, body links render in the
user-agent default link colour instead of the theme's link colour, even
though every individual component (`--bulma-link-h`, `--bulma-link-s`,
`--bulma-link-on-scheme-l`) is set on `:root`.

### Mitigation

Re-declare `--bulma-link-text` on the `a` selector itself with a literal
hsl() built from the theme's `$link-*` variables:

```scss
@mixin variables {
  // ...

  a {
    --bulma-link-text: hsl(#{$link-h}, #{$link-s}, #{$link-on-scheme-l});
  }
}
```

Higher-specificity rules (`.navbar-item`, `.menu-list a`, `.button.is-link`,
etc.) still override `color:` directly, so this only takes effect where
the chain failure would otherwise show.

This is theme-dependent — apply when the body link colour visibly
diverges from the intended `$link-*` values during Phase C review.

## Pitfall 7: `:root`-level `--bulma-title-color` / `--bulma-content-heading-color` are shadowed

Headings are colored through two Bulma tokens:

- `.title` (and `.subtitle`) reads `--bulma-title-color`.
- `.content h1`–`h6` read `--bulma-content-heading-color`.

Bulma's bundle **re-declares both tokens on `.subtitle, .title { ... }`
and `.content { ... }` selectors** (specificity `(0, 1, 0)`), pointing
them at `--bulma-text-strong`. A theme that only overrides the tokens
on `:root` is silently shadowed at every element where the headings
actually render — the inherited `:root` value is overruled by the
element-level declaration.

### Mitigation

Emit the overrides at the same selector level as Bulma's bundle (or
higher) so source order makes them win:

```scss
@mixin variables {
  // ... :root-level custom property emissions ...

  .title {
    --bulma-title-color: var(--bulma-primary);
  }
  .content {
    --bulma-content-heading-color: var(--bulma-primary);
  }
}
```

Apply this only when the theme actually wants headings tinted; many
themes are happy with Bulma's `text-strong`-derived default. It is not
a default emission — drive it from the theme's intent during Phase C.

## Pitfall 9: `.panel-icon` collapses when the child SVG has no viewBox

Bulma's `.panel-icon` sizes its container to `1em × 1em` and assumes the
child icon is a font glyph (an `<i class="fa-...">` element) that renders
inside that footprint. The `@11ty/font-awesome` plugin emits SVG-sprite
markup instead:

```html
<span class="panel-icon">
  <svg class="svg-inline--fa" aria-hidden="true">
    <use href="#fas-fa-book" xlink:href="#fas-fa-book"></use>
  </svg>
</span>
```

The outer `<svg>` is dimensionless and carries no `viewBox`. The
referenced `<symbol>` does have a viewBox (e.g. `0 0 448 512`), but
without a viewBox on the outer element the use's instance renders at the
symbol's native user-coordinate units. The visible glyph then floats
hundreds of pixels to the right of where the panel-icon slot sits — in
the demo, the book icon lands *after* the panel-block's text label
instead of before it.

Other Bulma icon containers (notably `.icon`) escape this because they
are `display: inline-flex` with explicit `width` / `height`, which gives
the SVG a sized flex parent and clips the misrender into something close
to the intended location. `.panel-icon` doesn't centre its child via
flex, so the misalignment is plainly visible there.

### Mitigation

Pin the outer SVG and the inner `<use>` to `1em × 1em` so the symbol
scales back into the icon slot. Apply inside `@mixin variables` so the
fix travels with the theme bundle:

```scss
@mixin variables {
  // ... custom property emissions and other Pitfall fixes ...

  .panel-icon svg {
    width: 1em;
    height: 1em;
  }
  .panel-icon svg use {
    width: 100%;
    height: 100%;
  }
}
```

This affects only `.panel-icon` descendants, so non-panel icons (buttons,
navbar, breadcrumbs, etc.) keep whatever sizing they already had.

This is a template-wide workaround for the @11ty/font-awesome SVG output;
new themes should emit it by default. If a downstream consumer swaps to
a different icon implementation that produces correctly-sized SVGs, the
rule is a no-op.

## Pitfall 10: `.box` / `.card` / `.panel` lose their shadow when --bulma-shadow uses a var() chain

Bulma defines `--bulma-shadow` on `:root` as a two-stop value whose hsla
components themselves use `var()`:

```css
--bulma-shadow:
  0 0.5em 1em -0.125em hsla(var(--bulma-shadow-h), var(--bulma-shadow-s), var(--bulma-shadow-l), 0.1),
  0 0 0 1px hsla(var(--bulma-shadow-h), var(--bulma-shadow-s), var(--bulma-shadow-l), 0.02);
```

`.box`, `.card`, and `.panel` all consume this through their own
`--bulma-*-shadow: var(--bulma-shadow)` indirection. When the nested
`var(--bulma-shadow-h)` / `-s` / `-l` substitutions fail to resolve at
the rendered element, the whole `box-shadow` declaration is discarded
and the container renders flat — no drop shadow, no inner 1px ring.

Themes that emit their own `--bulma-shadow` literal at `:root` (e.g.
Pulse's hairline ring `0 0 0 1px hsla(0, 0%, 0%, 0.125)`) escape this
because the inherited value has no inner `var()` left to resolve. Themes
that rely on Bulma's default chain (e.g. the project's `default` theme)
trip on it.

### Mitigation

Either pin `--bulma-shadow` on `:root` with a fully-resolved literal
(mirrors Bulma's two-stop shadow but with concrete hsl arguments), or —
preferred for themes that should keep Bulma's `:root` value untouched —
pin it at the consumer selectors:

```scss
@mixin variables {
  // ... custom property emissions ...

  .box,
  .card,
  .dropdown,
  .panel {
    --bulma-shadow:
      0 0.5em 1em -0.125em hsla(221deg, 14%, 4%, 0.1),
      0 0 0 1px hsla(221deg, 14%, 4%, 0.02);
  }
}
```

The literal `221deg, 14%, 4%` matches Bulma's light-mode default
`--bulma-shadow-h/s/l`. A theme that already overrides `--bulma-shadow`
at `:root` with a fully literal value does not need this element-level
pin.

`.dropdown` is pinned on the parent selector, not on `.dropdown-content`
where the `box-shadow` is actually read. Bulma registers
`--bulma-dropdown-content-shadow: var(--bulma-shadow)` on `.dropdown`
(parent) and reads `box-shadow: var(--bulma-dropdown-content-shadow)` on
`.dropdown-content` (child). Per Pitfall 1's eager-substitution
behaviour, the inner `var(--bulma-shadow)` inside
`--bulma-dropdown-content-shadow` is substituted at `.dropdown` (using
the still-broken `:root` shadow chain), so pinning `--bulma-shadow` at
`.dropdown-content` is too late — the substitution has already happened
one level up. For `.box` / `.card` / `.panel` the register and the read
happen on the same element, so pinning on the element itself works;
`.dropdown`'s two-level indirection is the exception.

This pin is element-scoped, so the dark-mode `prefers-color-scheme`
media query that flips Bulma's `--bulma-shadow-l` on `:root` no longer
reaches `.box` / `.card` / `.dropdown` / `.panel`. Acceptable for a
light-only theme; revisit when a dark variant is authored.

## Pitfall 11: separators between `.card-*`, `.panel-*`, and `.dropdown-*` sub-components disappear

Bulma renders separator rules between `.card-header` / `.card-content`
/ `.card-footer`, between `.panel-block` / `.panel-tabs` siblings, and
between `.dropdown-item`s (via `.dropdown-divider`) through the tokens:

- `--bulma-card-footer-border-top: 1px solid var(--bulma-border-weak)`
  on `.card`.
- `--bulma-panel-item-border: 1px solid var(--bulma-border-weak)` on
  `.panel` (consumed by `.panel-block:not(:last-child)` and
  `.panel-tabs:not(:last-child)`).
- `--bulma-dropdown-divider-background-color: var(--bulma-border-weak)`
  on `.dropdown` (consumed by `.dropdown-divider`'s `background-color`).
- `--bulma-card-header-shadow: 0 0.125em 0.25em hsla(var(--bulma-scheme-h),
  var(--bulma-scheme-s), var(--bulma-scheme-invert-l), 0.1)` on `.card`
  (consumed by `.card-header`'s `box-shadow`).

The first three chain through `--bulma-border-weak`, which itself is an
`hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), var(--bulma-border-weak-l))`
on `:root`. The last has its own three-`var()` chain. Both classes of
chain fail to resolve at the rendered sub-elements, so the separators
disappear and the components blur into a single flat block.

### Mitigation

Pin literal values for `--bulma-border-weak` (covers footer-border,
panel-item-border, and dropdown-divider) and `--bulma-card-header-shadow`
on the parent containers:

```scss
@mixin variables {
  // ... custom property emissions ...

  .card,
  .dropdown,
  .panel {
    --bulma-border-weak: hsl(#{$scheme-h}, #{$scheme-s}, 93%);
  }

  .card {
    --bulma-card-header-shadow: 0 0.125em 0.25em hsla(#{$scheme-h}, #{$scheme-s}, 4%, 0.1);
  }
}
```

`93%` matches Bulma's light-mode `--bulma-border-weak-l`; `4%` matches
its light-mode `--bulma-scheme-invert-l`. Themes without an explicit
scheme tint (e.g. cerulean with a pure-white body) substitute `0, 0%`
for the hue/saturation.

`.dropdown` is pinned on the parent for the same reason as Pitfall 10's
`.dropdown` pin: Bulma registers `--bulma-dropdown-divider-background-color`
on the parent `.dropdown` and reads it on child `.dropdown-divider`, and
the inner `var(--bulma-border-weak)` gets substituted at `.dropdown`
under Pitfall 1's eager behaviour.

Like Pitfall 10, this pin is light-mode-only; dark-mode auto-switching
on these tokens stops at the parent container.

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
