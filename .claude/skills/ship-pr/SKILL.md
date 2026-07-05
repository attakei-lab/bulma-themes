---
name: ship-pr
description: Open a pull request and shepherd it through CI and CodeRabbit review until it is mergeable; auto-merge only when all three safety conditions are met. Use when the user has finished work on a feature/fix/update branch and wants the PR opened and run to completion.
---

# ship-pr

This skill takes a `feature/**` / `fix/**` / `update/**` branch from "ready to open a PR" to "merged into `dev`". It is the single entry point for PR-related actions in this repository — do not improvise an alternative workflow.

## Preconditions

Before running, confirm all of the following:

- All intended commits have been authored at the current `HEAD`. Push state and branch-name conformance are reconciled by Step 0.
- Commits that should carry a `Refs: #N` footer do (see CLAUDE.md > Commit conventions).
- The user has approved opening a PR in this session.

## Step 0 — Reconcile branch name with the push allow-list

The on-disk branch at skill invocation may not match the push allow-list — typical on claude.ai/code, where Claude often starts from a worktree-managed name (`worktree-*`) or another non-conforming ref. Materialise a conforming branch before any PR action.

1. Inspect the current branch:
   ```
   git rev-parse --abbrev-ref HEAD
   ```
2. If the name matches `feature/**`, `fix/**`, or `update/**`, ensure it is pushed to `origin` and proceed to Step 1.
3. Otherwise:
   1. Take the target branch name from the pre-work agreement (CLAUDE.md > Cloud Claude Code startup > Pre-work agreement). If none was agreed, ask the user now.
   2. Confirm the proposed `<target>` with the user before acting.
   3. Materialise the branch, set up tracking, and switch local `HEAD` to it:
      ```
      git push origin HEAD:refs/heads/<target>
      git branch <target>
      git branch --set-upstream-to=origin/<target> <target>
      git switch <target>
      ```
   4. Leave the original branch (e.g. `worktree-*`) untouched — it will be cleaned up when the worktree exits.
   5. Use `<target>` as the PR head ref in Step 1, and as the branch any fix-up commits in Step 2 land on.

## Step 1 — Create the PR

1. Derive the **title** from the in-progress branch content: the dominant commit subject, or a one-line summary of the branch's stated topic. Do not paste an Issue number into the title.
2. Compose the **body**:
   - Default: leave it empty.
   - Only when a related Issue is confirmed, add a single line such as `Related to #N`. Use a non-closing phrase; never `Closes` / `Fixes` / `Resolves`.
3. Run:
   ```
   gh pr create --base dev --title "<title>" --body "<body>"
   ```
4. Report the resulting PR URL and a 1–2 sentence summary of the change to the user.

## Step 2 — Wait for CI

1. Identify the workflows triggered by the PR (`gh pr checks <pr>` or `gh run list --branch <branch>`).
2. Poll until every check has settled. Use a background process so the user can keep talking to you while you wait.
3. Report the final status.
4. If any check failed:
   - Pull the failing job's log, diagnose, fix in the same session, push, and let CI run again.
   - Do not proceed to Step 3 until CI is fully green.

## Step 3 — Surface CodeRabbit's review

1. Poll for CodeRabbit's review on the PR (`gh pr view <pr> --json reviews,comments`, or the GitHub API for `pull_request_review_comments`).
2. Summarize for the user:
   - The overall verdict (Approve / Request changes / Comment).
   - The count and headlines of any file/line-level review comments.
3. Do **not** apply changes automatically. The user decides whether each suggestion is adopted, parked, or rejected.

### If CodeRabbit is rate-limited

CodeRabbit enforces a per-developer PR-review rate limit. When several PRs
are shipped in quick succession it may decline to *start* the review,
posting a comment containing `Review limit reached` and
`Next review available in: N minutes` instead of a verdict. A rate-limited
PR has **no** CodeRabbit review — the green `CodeRabbit` status check in
this state is not an approval, so it does **not** satisfy Step 4's
"CodeRabbit has Approved" condition.

The default is to **wait and re-review**, not to merge without a review:

1. Detect the rate limit: the review verdict is absent **and** CodeRabbit's
   latest comment contains `Review limit reached`.
2. Read `Next review available in: N minutes`, wait that long (a background
   sleep so the user can keep talking), then re-trigger the review by
   commenting `@coderabbitai review` on the PR (CodeRabbit does not retry on
   its own).
3. Re-poll for the verdict and resume Step 4 once a real
   Approve / Request-changes / Comment lands.

Handle this automatically — do not require the user to intervene for each
limit — with two exceptions:

- If the stated wait is unreasonably long (roughly over 60 minutes) or no
  reset time is given, stop and let the user decide rather than waiting
  indefinitely.
- Merging *without* a CodeRabbit review is allowed only when the user
  explicitly instructs it.

## Step 4 — Conditional auto-merge

Claude may merge the PR autonomously **only when all three** of the following hold simultaneously:

1. Every CI check on the PR is green.
2. CodeRabbit has Approved the PR.
3. CodeRabbit's review contains **no** file/line-level review comments (zero `pull_request_review_comments` from CodeRabbit on this PR).

Rationale: under those three conditions, code generated under user-agreed scope has been judged "uncontroversially fine" by CodeRabbit, so a merge does not bypass human review — it formalises an already-aligned decision.

If all three hold, run:

```
gh pr merge <pr> --merge
```

If any one of the three fails to hold, stop and wait for the user's explicit go-ahead before merging.

After a successful merge, report the result and remind the user that any related Issue must be closed by hand — GitHub auto-close keywords are forbidden by repo policy.

## Out of scope

- Reopening, rebasing, or force-pushing PRs.
- PRs targeting branches other than `dev`.
- PRs authored by bots (Renovate, etc.) — their merging is governed by each bot's own automerge config.
