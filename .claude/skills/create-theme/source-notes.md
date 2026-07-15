# create-theme source notes

Source-family-specific facts for the **structural pass** (`SKILL.md` › Phase A.3).
`SKILL.md` holds the generic, framework-neutral process; the concrete facts about a
particular source family live here so the skill stays neutral and does not bloat as
new sources are added. Add one `##` section per source family.

Each entry is **non-exhaustive and accumulating** — extend it whenever a new port
surfaces another verified fact. Verify every value against the source's **compiled /
rendered CSS**, not a single override file (see `SKILL.md` › Source-import
principles).

**Implementation-choice principle (token-first).** When a fix can be expressed by
overriding a Bulma `--bulma-*` token (Bulma's designed customisation surface),
**prefer that** over a direct property / bare-var override — the token flows through
Bulma's own render chain (hover/focus deltas, dark mode). Reach for a direct property
only when (a) no token exists for the effect, or (b) the token's `hsl(var(), var(),
var())` chain provably fails at the render site (a Pitfall-11/12-class break). Decide
by **measuring the rendered result**, not by assuming a token name maps to the render
path — see the pagination-current teaching example below.

**Do not over-interfere with Bulma's class system.** A theme changes the *look*; it
should not fight Bulma's *semantics or variant system*. Three anti-patterns to avoid,
each caught in a real port: (a) repurposing a semantic class (mapping `.btn-link` onto
`.is-link` — see universal default #2); (b) overriding a semantic default with a
framework-foreign value (forcing pagination-current to primary — #4); (c) letting
base-element chrome clobber a native variant (a `.button` frame reaching `.is-ghost` —
#9). Restyling *layout / appearance* (e.g. joined pagination, #3) is legitimate theming
and is **not** over-interference, even when invasive.

---

## Bootswatch / Bootstrap-derived

Most existing themes in this repo (cosmo, pulse, united, brite, and the Lumen /
Spacelab ports below) are ported from [Bootswatch](https://bootswatch.com/). (Not
every theme is Bootswatch — Solarized is a palette-only source and `default` is
repo-native — so keep this scoped to Bootstrap-derived sources.)

### Where to read the source

- Two files matter: **`_variables.scss`** (the palette — `$primary`, the `$gray-*`
  ramp, `$min-contrast-ratio`, `$btn-font-weight`, etc.) and **`_bootswatch.scss`**
  (the theme's component overrides — the interesting structural intent). Fetch
  **both**, e.g. `https://bootswatch.com/5/<theme>/_variables.scss` and
  `.../_bootswatch.scss`.
- The compiled **`bootstrap.css`** `:root` exposes the `--bs-*` palette (plus `-rgb`)
  — good for colours. It is large and a fetch/grep can miss a specific selector, so
  confirm component structure from the override file **and** the compiled rule.

### Framework-universal defaults (always apply)

These hold for **any** Bootstrap-derived source (Bootstrap-framework facts, not
per-theme choices), and each recurred across ports. **Emit them by default.** Every
light-mode literal added below also needs a dark counterpart in the
`[data-theme="dark"]` block (a recurring miss — check it).

1. **Body links: underline + chrome reset.** Bootstrap 5.3 underlines body links
   (`--bs-link-decoration: underline`). Apply the underline + navigation-chrome-reset
   block (see `SKILL.md` › Phase B.1 template).

2. **Do NOT repurpose `.is-link`; map `.btn-link` to Bulma's native `.is-ghost`.**
   Bootstrap `.btn-link` is a *form* (a button that looks like a text link); Bulma
   `.is-link` is a *semantic colour* (a navigation role, rendered as a solid fill).
   Different axes — do **not** restyle `.is-link` into a text link. Bulma already ships
   the form: **`.button.is-ghost`** (transparent, link-coloured, underline-on-hover) is
   the `.btn-link` equivalent, and `.button.is-text` is the plainer text-coloured
   variant. No theme code is needed for the text link itself. If the source underlines
   `.btn-link` at rest, pin it with a token:
   ```scss
   .button.is-ghost { --bulma-button-ghost-decoration: underline; }
   ```
   Caveat: this only works if the base `.button` chrome excludes `.is-ghost` — see #9.

3. **Joined pagination.** Bootstrap page numbers are one segmented set (adjacent
   borders overlap, only outer corners rounded). `.is-rounded` opts out.
   ```scss
   .pagination:not(.is-rounded) .pagination-list {
     .pagination-link, .pagination-ellipsis { margin: 0; border-radius: 0; }
     li:not(:first-child) .pagination-link,
     li:not(:first-child) .pagination-ellipsis { margin-inline-start: -1px; }
     li:first-child :is(.pagination-link, .pagination-ellipsis) {
       border-start-start-radius: #{$radius}; border-end-start-radius: #{$radius};
     }
     li:last-child :is(.pagination-link, .pagination-ellipsis) {
       border-start-end-radius: #{$radius}; border-end-end-radius: #{$radius};
     }
   }
   ```
   This is the most **invasive** restyle — Bulma has no native "joined" variant, so it
   fakes the segmented group with negative margins + per-child radius (no token hook: an
   accepted exception to token-first). It is layout theming, **not** semantic
   over-interference, but keep it variant-safe: exclude `.is-rounded` (above) and verify
   focus rings / hover z-order / RTL at the joints in Phase C.

4. **Pagination current stays at Bulma's default (link colour).** Bootstrap's active
   page is `$primary`, but Bulma colours `.pagination-link.is-current` with the *link*
   colour, which conforms to the `.is-link` semantic — **keep it**. Do **not** force it
   to primary (an earlier draft did, overriding Bulma's semantic default). A theme that
   genuinely wants a different current colour overrides the
   `--bulma-pagination-selected-item-*` tokens (token-first) — but that is opt-in, not a
   universal default.

5. **Breadcrumb: non-active = link, active = muted grey, no underline.** Token-first for
   the colours; strip the underline on the active `<a>`.
   ```scss
   .breadcrumb {
     --bulma-breadcrumb-item-color: hsl(#{$link-h}, #{$link-s}, #{$link-on-scheme-l});
     --bulma-breadcrumb-item-active-color: hsl(#{$scheme-h}, #{$scheme-s}, 45%);
   }
   .breadcrumb .is-active a { text-decoration: none; }
   ```

6. **Checkbox / radio = primary fill + white glyph** (Bootstrap `.form-check-input`;
   Bulma has no token — direct restyle of the native input; real `background-color` →
   bare Sass vars). `appearance: none` removes the browser's native focus outline, so
   **restore a `:focus-visible` ring** (keyboard accessibility) and dim the disabled
   state.
   ```scss
   input[type="checkbox"], input[type="radio"] {
     width: 1em; height: 1em; appearance: none; vertical-align: -0.125em;
     background-color: transparent; background-repeat: no-repeat;
     background-position: center; background-size: contain;
     border: 1px solid hsl($scheme-h, $scheme-s, 70%);
   }
   input[type="checkbox"] { border-radius: 0.25em; }
   input[type="radio"] { border-radius: 50%; }
   input[type="checkbox"]:checked, input[type="radio"]:checked {
     background-color: hsl($primary-h, $primary-s, $primary-l);
     border-color: hsl($primary-h, $primary-s, $primary-l);
   }
   input[type="checkbox"]:focus-visible, input[type="radio"]:focus-visible {
     outline: 2px solid hsl($primary-h, $primary-s, $primary-l);
     outline-offset: 2px;
   }
   input[type="checkbox"]:disabled, input[type="radio"]:disabled { opacity: 0.5; }
   /* checked glyphs: white check SVG (checkbox) / white dot SVG (radio) */
   ```

7. **Control right-icon follows the input's state colour** (Bootstrap colours its
   validation icon; Bulma leaves it a fixed muted grey; no token — direct, per state,
   bare Sass vars). Left icon stays neutral.
   ```scss
   .control.has-icons-right .input.is-danger ~ .icon.is-right { color: hsl($danger-h, $danger-s, $danger-l); }
   /* …repeat for is-primary / is-link / is-info / is-success / is-warning */
   ```

8. **Card / box = 1px border, no shadow** (Bootstrap `.card`). The B.1 Pitfall-10
   template lists `.box, .card, .panel` for the default (shadowed) case; for a
   Bootstrap-derived theme **drop `.box, .card` from that pin** (keep it on
   `.dropdown, .modal-card-head, .panel`) and instead give `.box, .card` their own
   rule with `--bulma-shadow: none` + a 1px border (real `border` → bare Sass vars),
   plus a dark border counterpart. Do not leave both rules active — the border
   treatment replaces the shadow pin for box/card, it does not stack on it.

9. **Base-element chrome must respect Bulma's variant modifiers.** When a theme adds
   chrome to a bare element selector (`.button`, `.pagination-link`, `.tabs`, …), it must
   not clobber Bulma's variants that expect different/absent chrome. Either **exclude**
   the chrome-less native variants — `.button:not(.is-outlined, .is-inverted, .is-ghost,
   .is-text)` (Spacelab's pattern), and `:not(.is-rounded)` where roundness matters — or
   **handle** the affected variants explicitly (per-state colours, like a framed input
   re-declaring `.input.is-danger` border). A base `.button` frame that reaches
   `.is-ghost` makes the link-button look like a solid button (observed on Brite/Lumen).

> Note on demo-only mismatches: some form demos hardcode the input text colour inline
> (`style="color: var(--bulma-*)"`); a theme cannot override inline styles, so that is a
> website-demos-authoring concern, out of `/create-theme` scope. The theme-side fix
> (icon follows state colour, #7) still applies.

### Per-theme specifics (measure)

These vary by theme — extract them in A.3 from the compiled CSS and confirm in Phase C:

- **The "shadow" / chrome mechanism.** Perceptual "shadow" differs per theme: Lumen =
  a thick bottom border that shrinks on press; Spacelab = a vertical tint→shade
  **gradient** (glossy) + inset highlight + text-shadow (source `@mixin btn-shadow`).
  Translate the word to the actual mechanism (Source-import principle). Whatever chrome
  you add to the base `.button`, apply the #9 exclusion.
- **Typography.** Uppercase + weight on buttons/pagination is per-theme (Lumen:
  uppercase + `$btn-font-weight: 700`; Spacelab: neither).
- **Radius**, **`secondary`** (usually a `$gray-*`), **`$dark`/`$light`** values, and
  **`$min-contrast-ratio`** (drives per-colour invert text) — all measured per theme.

### Component re-mapping (Bootstrap → Bulma) — non-exhaustive

| Bootstrap (source) | Bulma (this library) | Notes |
| --- | --- | --- |
| `.alert` | `.notification` / `.message` | chrome per theme |
| `.btn` | `.button` | chrome/typography per theme; exclude native variants (#9) |
| `.btn-link` | **`.button.is-ghost`** (native) | do NOT repurpose `.is-link` (#2) |
| `.btn-secondary` | `.button.is-secondary` | `$secondary` (usually `$gray-*`) adopted |
| `.nav-tabs` | `.tabs.is-boxed` | rounded-top, active connects to content |
| `.pagination` / `.page-link` | `.pagination-link` etc. | joined set (#3) |
| `.page-item.active .page-link` | `.pagination-link.is-current` | keep Bulma's link default (#4) |
| `.breadcrumb` | `.breadcrumb` | active muted / non-active link (#5) |
| `.form-check-input` | `input[type=checkbox]` / `input[type=radio]` | primary fill (#6) |
| `.card` | `.card` / `.box` | 1px border, no shadow (#8) |
| `.navbar` | `.navbar` | chrome per theme |
| `$dark` / `$light` | `--bulma-dark-*` / `--bulma-light-*` | `.is-dark` / `.is-light` |
| `--bs-<color>` palette | `--bulma-<token>-h/s/l` | hex/rgb → HSL |

> Untested but likely (confirm on a future port and append): `.badge`→`.tag`,
> `.list-group`→`.panel`, `.modal`→`.modal`, `.dropdown`→`.dropdown`,
> `.progress`→`.progress`, `.table`→`.table`.

### Teaching examples

- **"shadow" was not `box-shadow`.** During the Lumen port the alert "shadow" looked
  absent in `_bootswatch.scss` but was a `border-width: 0 1px 4px 1px` dark bottom
  border in the compiled output — reproducing it was *faithful*, not an extension.
  Lesson: measure the rendered output; translate the perceptual word to the mechanism.
- **A token name is not the render path.** Setting `--bulma-pagination-current-*` (which
  exists) did nothing for the current page — Bulma computes the is-current fill from
  `--bulma-pagination-selected-item-*` instead. Lesson: measure which token the render
  actually reads; a plausibly-named token can be inert.
- **Form vs semantic (`.btn-link` ≠ `.is-link`).** `.btn-link` is an appearance variant
  (looks like a link); `.is-link` is a semantic colour (navigation role). Bulma's
  appearance variants are `.is-ghost` / `.is-text`. Mapping `.btn-link` onto `.is-link`
  repurposed a semantic class — the correct target is the native `.is-ghost` (#2).
