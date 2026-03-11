---
name: opi-tools
description: Modify opi extension tool registration or override behavior. Use whenever the user mentions opi.registerTool, defineTool, tool overrides, extension-defined tools, built-in tool replacement, or wants to change how opi extensions integrate with the tool registry.
---

# opi tools

This skill covers extension-defined tools and their bridge into the main tool registry.

## Primary files

- `packages/opencode/src/opi/types.ts` - `registerTool` and `defineTool` API
- `packages/opencode/src/opi/runtime.ts` - stores extension tool definitions at runtime
- `packages/opencode/src/tool/registry.ts` - converts extension tool definitions into registry tools and dedupes by id
- `packages/opencode/test/opi/runtime.test.ts` - extension tool registration and override tests
- `packages/opencode/test/tool/registry.test.ts` - registry behavior checks

## Working rules

- If the public tool authoring API changes, update `types.ts`, docs, and tests together.
- If selection or override behavior changes, start in `tool/registry.ts`.
- Preserve the current last-write-wins dedupe rule unless the user explicitly wants different precedence.
- If the request is actually about extension loading rather than tools specifically, also load `opi-extensions`.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts test/tool/registry.test.ts`
- `cd packages/opencode && bun run typecheck`
