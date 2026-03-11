---
name: opi-widgets
description: Modify opi extension widgets, status items, or their render helpers. Use whenever the user mentions opi widgets, sidebar widget cards, status entries, footer pills, setWidget, setStatus, or wants to change how extension-provided UI fragments render in the sidebar or footer.
---

# opi widgets

This skill focuses on extension-provided widgets and status items, not the full extension runtime.

## Primary files

- `packages/opencode/src/opi/render.tsx` - widget and status rendering helpers
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx` - projects `Opi.widgets()` and `Opi.status()` into sidebar and footer surfaces
- `packages/opencode/src/cli/cmd/tui/routes/session/status-bar.tsx` - footer container for status items
- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` - sidebar container that renders projected widgets
- `packages/opencode/src/opi/types.ts` - `setWidget` and `setStatus` API types
- `packages/opencode/test/opi/runtime.test.ts` - runtime coverage for widget/status behavior

## Working rules

- If the request is about how widgets or status items look, start in `render.tsx`.
- If the request is about where they appear, start in `surface-local.tsx`, then check `status-bar.tsx` or `sidebar.tsx`.
- Keep the rendering helpers simple. They should format widget/status content, not own extension runtime logic.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts`
- `cd packages/opencode && bun run typecheck`
