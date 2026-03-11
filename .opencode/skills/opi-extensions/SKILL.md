---
name: opi-extensions
description: Modify the opi extension system in the Microck fork. Use whenever the user mentions .opi/extensions, extension loading, defineExtension, defineTool, extension events, extension widgets, extension status items, extension docs, extension examples, or wants Pi-like modular customization in opi.
---

# opi extensions

This skill covers the fork-only extension runtime and its public API.

## Primary files

- `packages/opencode/src/opi.ts` and `packages/opencode/src/opi/index.ts` - public exports
- `packages/opencode/src/opi/types.ts` - typed API, events, and helper definitions
- `packages/opencode/src/opi/loader.ts` - discovery of global and local extension files
- `packages/opencode/src/opi/runtime.ts` - runtime state, event wiring, tool registration, and extension execution
- `packages/opencode/src/opi/render.tsx` - render helpers for status and widgets
- `packages/opencode/src/opi/builtin.tsx` - built-ins that now flow through the extension contribution path
- `packages/opencode/src/project/bootstrap.ts` - startup init
- `packages/opencode/src/tool/registry.ts` - extension tool registration and override behavior
- `.opi/extensions/` - example extensions
- `docs/extensions.md` and `docs/extension-plan.md` - docs and plan
- `packages/opencode/test/opi/runtime.test.ts` and `packages/opencode/test/tool/registry.test.ts` - coverage

## Working rules

- If the request changes the public extension API, update `types.ts`, docs, and tests together.
- If the request changes discovery or loading, start in `loader.ts` and `runtime.ts`.
- If the request changes extension tools, also check `tool/registry.ts`.
- If the request changes built-in panels routed through the extension path, check `opi/builtin.tsx` and `surface-local.tsx`.
- For non-trivial fork-only changes, update `docs/opi-change-tracker.md` in the same task.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts test/tool/registry.test.ts test/cli/tui/session-surface.test.ts`
- `cd packages/opencode && bun run typecheck`
