---
name: pi-to-opi
description: Migrate Pi-style extensions, Pi widgets, Pi panels, or other Pi customization snippets into the opi extension system. Use whenever the user says things like "migrate this pi extension to opi", "port this Pi widget", "convert this Pi panel", or provides a link or file and wants the result rewritten as an opi extension.
---

# pi to opi

Use this skill when the user wants an existing Pi-oriented customization rewritten for the opi fork.

## Goal

Take the source extension or snippet, identify what behavior it implements, and rewrite it into the closest opi-native shape.

The output should usually be one of:

- a new file under `.opi/extensions/`
- an update to an existing `.opi/extensions/` file
- a focused patch to the opi runtime/docs/examples if the Pi feature needs a missing opi capability

## First pass

Before editing, answer these questions from the source material:

1. Is this a surface/layout change, a widget, a status item, an event reaction, a tool, a theme tweak, or branding/config work?
2. Is it additive, or is it replacing an existing built-in?
3. Does opi already have a direct API for it?
4. Which opi area owns the destination behavior?

If the source is a URL:

- Prefer repo-local or GitHub-native retrieval, not vague summaries.
- For GitHub URLs, use `gh` or raw file fetches when possible.
- If it is a webpage that just contains code, extract the actual source before planning the migration.

## Concept mapping

Map Pi concepts to opi concepts with the simplest opi-native result:

| Pi intent | Prefer in opi |
| --- | --- |
| Add a header/footer/sidebar element | `opi.ui.addSurface(...)` |
| Move existing UI around | `opi.ui.moveSurface(...)` |
| Hide existing built-in UI | `opi.ui.hideSurface(...)` |
| Swap an existing renderer | `opi.ui.replaceSurface(...)` |
| Add a simple sidebar card | `opi.ui.setWidget(...)` |
| Add a small footer/status line item | `opi.ui.setStatus(...)` |
| React to lifecycle or tool activity | `opi.on(...)` |
| Add or override an agent tool | `opi.registerTool(...)` with `defineTool(...)` |
| Change built-in panel behavior | opi extension mutation first, core patch only if necessary |
| Theme/palette changes | opi theme files, not the extension runtime |

## Destination file guide

- New migrated extension code usually belongs in `.opi/extensions/<name>.ts` or `.opi/extensions/<name>.tsx`.
- If the migration needs JSX rendering, use `.tsx` and `/** @jsxImportSource @opentui/solid */`.
- If the migration reveals a missing opi capability, inspect these files before adding anything:
  - `packages/opencode/src/opi/types.ts`
  - `packages/opencode/src/opi/runtime.ts`
  - `packages/opencode/src/opi/render.tsx`
  - `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx`
  - `packages/opencode/src/tool/registry.ts`
  - `docs/extensions.md`

## Migration rules

- Prefer opi-native APIs over building a Pi compatibility shim.
- Keep the migrated result boring and direct. Do not preserve Pi abstractions that are not helping in opi.
- If the Pi source bundles multiple concerns together, split them only when the split is obvious and improves opi readability.
- If opi already ships a similar example, reuse its style.
- If the migration changes fork-only behavior in a meaningful way, update `docs/opi-change-tracker.md`.

## Output structure

When you finish a migration, report:

- what the Pi source was doing
- how that maps to opi
- which files were changed
- any Pi behavior that could not be ported exactly
- how to verify the migrated extension

## Verify

Pick the smallest relevant checks:

- `cd packages/opencode && bun test test/opi/runtime.test.ts`
- `cd packages/opencode && bun test test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun test test/tool/registry.test.ts`
- `cd packages/opencode && bun run typecheck`

If the migration only creates a local example extension, also explain where the user should place it and what visible result to expect in the TUI.
