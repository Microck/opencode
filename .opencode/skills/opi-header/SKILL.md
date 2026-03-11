---
name: opi-header
description: Modify the opi session header in the forked TUI. Use whenever the user mentions the opi header, top bar, session title area, session context area, leading or trailing header content, or wants to add, move, replace, or hide content in the top session row.
---

# opi header

The opi header is surface-driven. Prefer slot and registry changes over hardcoding layout changes in the component.

## Primary files

- `packages/opencode/src/cli/cmd/tui/routes/session/header.tsx` - header container and rendering of the left/right slot lists
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-registry.tsx` - base header surfaces like `core.session-primary` and `core.session-context`
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-resolver.ts` - slot names and add/move/hide/replace behavior
- `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` - header visibility toggle and placement in the full session layout
- `packages/opencode/test/cli/tui/session-surface.test.ts` - regression coverage for ordering and slot behavior

## How to change header behavior

- If the request is about what appears in the header, start in `surface-registry.tsx` or extension contributions, not `header.tsx`.
- If the request is about header layout or spacing, start in `header.tsx`.
- Use `session.header.leading` for left-side content.
- Use `session.header.trailing` for right-side content.
- If the change affects add/move/hide/replace semantics, also update `surface-resolver.ts` and its tests.

## Verify

- `cd packages/opencode && bun test test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun run typecheck`
