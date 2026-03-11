---
name: opi-footer
description: Modify the opi footer or status bar in the forked TUI. Use whenever the user mentions the footer, bottom bar, status bar, status line, footer pills, session status slot, or wants to change how extension status items render at the bottom of the session view.
---

# opi footer

The opi footer is the `session.status` surface slot plus the status rendering helpers.

## Primary files

- `packages/opencode/src/cli/cmd/tui/routes/session/status-bar.tsx` - footer container that renders `session.status`
- `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` - where the footer sits in the session layout
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx` - maps `Opi.status()` into `session.status` surfaces
- `packages/opencode/src/opi/render.tsx` - rendering helpers for status items and widgets
- `packages/opencode/src/opi/types.ts` - `setStatus` API shape
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-resolver.ts` - owns the `session.status` slot definition
- `packages/opencode/test/opi/runtime.test.ts` - runtime coverage for status updates

## How to change footer behavior

- If the request is visual-only, start in `status-bar.tsx`.
- If the request changes what data appears or how extensions write status, start in `surface-local.tsx`, `render.tsx`, and `types.ts`.
- If the request needs a new footer slot behavior, change `surface-resolver.ts` too.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun run typecheck`
