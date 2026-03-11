# TUI Surface Fork Guide

This fork now has a local session surface system for the TUI.

It is fork-first on purpose. There is no public plugin contract here yet. The goal is to let you change the session UI immediately inside your fork without waiting on upstream review.

## Where To Edit

Edit `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx`.

That file exports local contributions for the session UI.

## What Works

You can:

- add new surfaces
- move built-in surfaces to other slots
- hide built-in surfaces
- replace built-in surfaces with custom components

Current scope is the session header and sidebar.

## Available Slots

- `session.header.leading`
- `session.header.trailing`
- `session.sidebar.top`
- `session.sidebar.bottom`

## Built-In Surface IDs

- `core.session-primary`
- `core.session-context`
- `core.sidebar-session`
- `core.sidebar-context`
- `core.sidebar-mcp`
- `core.sidebar-lsp`
- `core.sidebar-todo`
- `core.sidebar-diff`
- `core.sidebar-getting-started`
- `core.sidebar-directory`
- `core.sidebar-version`

## Contribution Shapes

### Add

```tsx
{
  type: "add",
  surface: {
    id: "fork.badge",
    slot: "session.header.trailing",
    order: 150,
    render: ForkBadge,
  },
}
```

### Move

```tsx
{
  type: "move",
  id: "core.session-context",
  slot: "session.sidebar.top",
  order: 250,
}
```

### Hide

```tsx
{
  type: "hide",
  id: "core.sidebar-getting-started",
}
```

### Replace

```tsx
{
  type: "replace",
  id: "core.sidebar-version",
  surface: {
    render: CustomVersion,
  },
}
```

## Example

```tsx
import { createMemo } from "solid-js"
import { useDirectory } from "../../context/directory"
import { useTheme } from "../../context/theme"
import type { SessionContribution } from "./surface-resolver"

function BranchBadge() {
  const dir = useDirectory()
  const theme = useTheme().theme

  return <text fg={theme.textMuted}>{dir()}</text>
}

export function useSessionSurfaceLocal() {
  return createMemo<SessionContribution[]>(() => [
    {
      type: "hide",
      id: "core.sidebar-getting-started",
    },
    {
      type: "move",
      id: "core.session-context",
      slot: "session.sidebar.top",
      order: 250,
    },
    {
      type: "add",
      surface: {
        id: "fork.branch",
        slot: "session.header.trailing",
        order: 260,
        render: BranchBadge,
      },
    },
  ])
}
```

## Validation

Use these commands from `packages/opencode`:

```bash
bun test test/cli/tui/session-surface.test.ts --timeout 30000
bun typecheck
```

`bun run build` also works as a heavier verification step, but it packages multiple targets and takes much longer.
