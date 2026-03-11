---
name: opi-sidebar
description: Modify the opi session sidebar, sidebar widgets, or migrated built-in sidebar panels. Use whenever the user mentions the sidebar, right column, sidebar widgets, MCP panel, Todo panel, Modified Files panel, or wants to change what appears in the session sidebar.
---

# opi sidebar

The sidebar has a stable container plus surface-driven top and bottom regions. Several built-ins now come through the opi extension contribution path.

## Primary files

- `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` - sidebar container and top/bottom region rendering
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-registry.tsx` - base sidebar surfaces that are still hardcoded
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx` - merges built-ins, extension surfaces, widgets, and status
- `packages/opencode/src/opi/builtin.tsx` - migrated built-in panels for MCP, Todo, and Modified Files
- `packages/opencode/src/opi/render.tsx` - widget rendering helpers
- `packages/opencode/test/cli/tui/session-surface.test.ts` - slot and replacement coverage
- `packages/opencode/test/opi/runtime.test.ts` - widget runtime coverage

## How to change sidebar behavior

- If the request is about sidebar width or container layout, start in `sidebar.tsx`.
- If the request is about built-in panels like MCP, Todo, or Modified Files, start in `opi/builtin.tsx`.
- If the request is about extension widgets, start in `surface-local.tsx` and `opi/render.tsx`.
- Prefer changing panel order with surfaces, not manual conditional layout branches.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun run typecheck`
