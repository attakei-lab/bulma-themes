# Branch Strategy

## Long-lived branches

- `dev` — integration branch, current default.
- `main` — reserved for the public-operation phase; not in active use yet.

## Work-branch prefixes

- `feature/<topic>` — adding or updating a feature.
- `fix/<topic>` — fixing a defect in an existing feature. Reverts may live here, or be left off-convention; both are acceptable.
- `update/<topic>` — improvements outside of features (CI, dependencies, docs, refactor, etc.).

`release/` and `hotfix/` prefixes are not adopted at this time.

Branch conventions and commit conventions are independent. A `feature/<topic>` branch may include docs or tooling commits scoped to that feature, as long as they serve the branch's stated purpose.

Bot-generated branches (Renovate, etc.) are exempt from these naming rules.

## `<topic>` and `<sub-topic>` naming

- A short, descriptive, kebab-case identifier (a few words).
- When the work corresponds to a specific tracked issue, `issue-<N>` is also accepted.
- The same rule applies to `<sub-topic>` when nesting.

## Nesting (`<prefix>/<topic>/<sub-topic>`)

The default is flat (`feature/<topic>`). Nesting is an exception used when complexity is foreseen at branch-creation time.

Due to git's ref namespace constraint, `feature/<topic>` and `feature/<topic>/<sub-topic>` cannot coexist as branches. The convention therefore is:

- When nesting is foreseen at creation, create the children only:
  - Create `feature/<topic>/<sub-topic-1>`, `feature/<topic>/<sub-topic-2>`, and so on.
  - Do **not** create the parent `feature/<topic>`.
  - Keep `<topic>` short enough to encompass its children semantically.
- Children merge directly into `dev`. Parent-to-child merging does not occur.
- The same nesting rule applies to `fix/` and `update/`.

The procedure for splitting a branch after work has already begun on `feature/<topic>` is intentionally not specified; it is judged case by case when it occurs.

## Push policy (allow-list)

Only the following ref patterns are eligible to be pushed to `origin`:

- `dev`, `main`
- `feature/**`, `fix/**`, `update/**`
- Bot-generated branches whose tooling owns the naming. Currently allowed: `renovate/**`. Add new patterns explicitly when new tools are introduced.

Branches that do not match the patterns above (for example, `worktree-*` branches created by Claude Code, or throwaway local-only branches) are out of scope of these naming rules and must not be pushed. They are "exempt", not "non-compliant".

This policy is documentation-level. Mechanical enforcement is out of scope of this document.

## Worktrees

Claude Code may isolate a task in a git worktree, created under
`.claude/worktrees/`. The worktree's branch is renamed to a conforming
`feature/**` / `fix/**` / `update/**` name before any push — the raw
`worktree-*` name is push-exempt (see Push policy).

Base and sync rules, applied **before** creating the worktree:

- **Base on the default branch.** A new worktree branches from the default
  branch (currently `dev`), taken from `origin` so the base is the published
  tip.
- **Sync the local default branch first.** Compare the local default branch
  against `origin`; if they differ, fast-forward the local default to follow
  `origin` before creating the worktree.
- **Uncommitted work on the default branch → propose, don't disrupt.** If the
  main worktree currently has the default branch checked out and carries
  uncommitted changes, do not silently sync over them. Surface the situation
  and propose handling options (e.g. stash, commit onto a work branch, or
  defer) and let the user choose.
- **Conflict on sync → attempt a merge.** If following `origin` cannot
  fast-forward because the local default branch has diverged, attempt to merge
  `origin`'s default into the local default. If the merge itself conflicts,
  stop and surface the conflict to the user rather than force-resolving.

This policy is documentation-level, mirroring the Push policy above; mechanical
enforcement is out of scope.
