---
name: opi-session-surface
description: Modify the low-level opi session surface system that powers add, move, hide, and replace behavior. Use whenever the user mentions slots, session surfaces, ordering, anchoring before or after another surface, or requests structural TUI composition changes across the opi header, sidebar, or footer.
---

# opi session surface

This is the low-level composition layer for the fork-only session UI.

## Primary files

- `packages/opencode/src/cli/cmd/tui/routes/session/surface-resolver.ts` - slot types and add/move/hide/replace resolution
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-registry.tsx` - base built-in surfaces
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx` - local and extension-provided contributions
- `packages/opencode/src/cli/cmd/tui/routes/session/header.tsx` - consumes header slots
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` - consumes sidebar slots
- `packages/opencode/src/cli/cmd/tui/routes/session/status-bar.tsx` - consumes footer slot
- `packages/opencode/test/cli/tui/session-surface.test.ts` - core regression suite for this system

## Working rules

- Change slot names or surface semantics in `surface-resolver.ts` first.
- Change base built-ins in `surface-registry.tsx`.
- Change extension or runtime contributions in `surface-local.tsx`.
- Keep header, sidebar, and footer components thin. They should render slot output, not own business logic.

## Verify

- `cd packages/opencode && bun test test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun run typecheck`
