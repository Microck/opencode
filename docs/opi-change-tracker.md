# opi change tracker

## Purpose

This file tracks every meaningful opi-specific change that is not part of upstream OpenCode.

The goal is simple: do not lose track of what was added, why it exists, where it lives, and what branch or worktree introduced it.

## Update rules

- For every non-trivial opi-specific change, update this file in the same task.
- Before starting a new opi-only feature, add or update the branch/worktree entry first.
- When merging a feature branch, move its final state into the change log and mark the branch entry as merged.
- If a change is reverted or replaced, record that here too. Do not silently delete history.

## Branch and worktree ledger

| branch/worktree | status | purpose | notes |
| --- | --- | --- | --- |
| `dev` | active | integration branch for current opi-specific changes | currently contains the first fork-only changes already pushed |
| `opi/extension-system` | active | full first opi extension-system milestone | combines phases 1 through 7 into one implementation branch |
| `opi/extension-types` | planned | extension API types and loader | phase 1 from `docs/extension-plan.md` |
| `opi/extension-ui` | planned | wire extension UI mutations into the surface system | phase 2 |
| `opi/extension-widgets` | planned | widget and status primitives | phase 3 |
| `opi/extension-events` | planned | event subscription API | phase 4 |
| `opi/extension-tools` | planned | tool registration and override support | phase 5 |
| `opi/extension-builtins` | planned | migrate selected built-ins onto the extension API | phase 6 |
| `opi/extension-examples` | planned | docs and example extensions | phase 7 |

## Current opi-specific deltas

### 2026-03-11 - fork bootstrap and launcher

- status: merged into `dev`
- branch/worktree: `dev`
- summary: created the `opi` fork and local launcher so the fork can be launched as a first-class command
- key paths:
  - `~/.local/bin/opi`
  - `/home/ubuntu/workspace/opencode-fork`
- notes:
  - GitHub repo created at `https://github.com/Microck/opi`
  - local git remotes now use `origin` = `Microck/opi` and `upstream` = `anomalyco/opencode`

### 2026-03-11 - shared setup with separate opi theme/config overlay

- status: merged into `dev`
- branch/worktree: `dev`
- summary: `opi` reuses the normal OpenCode setup for MCPs, skills, plugins, and rules, but keeps its own theme/config overlay
- key paths:
  - `~/.config/opi-xdg/opencode`
  - `~/.config/opi-xdg/opencode/tui.json`
  - `~/.config/opi-xdg/opencode/themes/7075.json`
- notes:
  - most files are symlinked from `~/.config/opencode`
  - `opi` can diverge on theme without losing seamless access to the rest of the normal setup

### 2026-03-11 - fork-first TUI surface system

- status: merged into `dev`
- branch/worktree: `dev`
- summary: added an internal surface system for session header and sidebar with `add / move / hide / replace`
- key paths:
  - `packages/opencode/src/cli/cmd/tui/routes/session/surface-resolver.ts`
  - `packages/opencode/src/cli/cmd/tui/routes/session/surface-registry.tsx`
  - `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx`
  - `packages/opencode/test/cli/tui/session-surface.test.ts`
- notes:
  - this is the internal engine that future opi extension APIs should target
  - current scope is session header and sidebar, not the whole TUI

### 2026-03-11 - opi branding and repo docs cleanup

- status: merged into `dev`
- branch/worktree: `dev`
- summary: replaced the root README with a minimal opi-specific version and removed the translated top-level READMEs
- key paths:
  - `README.md`
  - `docs/opi-logo.png`
- notes:
  - package-level READMEs were intentionally left alone

### 2026-03-11 - opi extension roadmap

- status: planned
- branch/worktree: future phase branches listed above
- summary: defined the phased plan for a Pi-like opi extension system
- key paths:
  - `docs/extension-plan.md`
- notes:
  - this is a plan only, not implemented yet

### 2026-03-11 - opi extension system implementation

- status: active on branch
- branch/worktree: `opi/extension-system`
- summary: completing the full first extension-system milestone on top of the fork-only surface system
- key paths:
  - `packages/opencode/src/opi/`
  - `.opi/extensions/`
  - `docs/extensions.md`
- notes:
  - startup now loads project and global extension entry files and feeds them into the existing session surface resolver
  - public extension scope now includes surface mutations, widgets, status, notifications, event hooks, and tool registration
  - selected built-ins now flow through the same extension contribution path instead of being hardcoded directly in the base session surface list
  - example extensions live in `.opi/extensions/` and the API reference lives in `docs/extensions.md`
  - follow-up readiness pass added missing example extensions, broader event and tool tests, and a docs walkthrough so the first milestone is ready to ship
  - verified on branch with `bun test test/opi/runtime.test.ts test/tool/registry.test.ts test/cli/tui/session-surface.test.ts` and `bun run typecheck` from `packages/opencode`

### 2026-03-11 - opi repo-local routing skills

- status: active in worktree
- branch/worktree: `opi/extension-system`
- summary: added repo-local opi skills so OpenCode can route header, footer, sidebar, surface, extension, theme, branding, and launcher requests to the right files
- key paths:
  - `.opencode/skills/`
  - `.opencode/skills/opi-pointer/SKILL.md`
  - `.opencode/skills/README.md`
- notes:
  - skills live under `.opencode/skills/` so the repo auto-discovers them without extra config
  - `opi-pointer` is the broad routing skill and the rest are narrow area skills tied to current fork-specific file ownership
  - follow-up split out extra narrow skills for widgets, events, and tools so extension-system requests can route with less ambiguity
  - follow-up added `pi-to-opi` so prompts like "migrate this pi extension to opi" route to a dedicated migration workflow

## Open questions

- Should opi support only local `.ts` extensions first, or also package-based extensions from day one?
- Should built-ins migrate to the extension API incrementally or all at once?
- Should message renderer replacement wait until after widgets and status primitives are stable?
