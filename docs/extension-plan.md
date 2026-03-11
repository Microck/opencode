# opi extension system - phased plan

## Context

opi is a fork of OpenCode. The goal is Pi-like extensibility: drop a `.ts` file, get a typed API, mutate the TUI and agent behavior without touching core internals.

We already have:
- an internal surface registry with `add / move / hide / replace` for session header and sidebar
- a `surface-local.tsx` hook for fork-local customization
- a custom theme (`7075`) with separate config overlay

What we do not have yet:
- a developer-facing extension API
- extension discovery and loading
- UI mutation hooks beyond the surface system
- widget/status bar primitives
- built-ins going through the same extension path as third-party code

## Branch strategy

Each phase gets its own branch off `dev`. Branches are merged to `dev` when the phase is complete and verified. This keeps opi features cleanly separated from upstream OpenCode changes.

Branch naming: `opi/<phase-name>`

## Phase 1 - extension types and loader

Branch: `opi/extension-types`

Goal: define the extension API types and build a loader that discovers and calls extension functions.

### What gets built

- `packages/opencode/src/opi/types.ts` - the core `OpiExtensionAPI` interface
- `packages/opencode/src/opi/loader.ts` - discovers `.ts` files from `.opi/extensions/` and `~/.config/opi/extensions/`, loads them with jiti or Bun, calls each with the API object
- `packages/opencode/src/opi/index.ts` - public re-export

### Extension API shape (phase 1 scope)

```ts
export type OpiExtension = (opi: OpiAPI) => void | Promise<void>

export interface OpiAPI {
  ui: OpiUI
  on: OpiEventEmitter
}

export interface OpiUI {
  addSurface(surface: OpiSurface): void
  moveSurface(id: string, opts: { slot: string; order?: number; before?: string; after?: string }): void
  hideSurface(id: string): void
  replaceSurface(id: string, opts: { render: Component; slot?: string; order?: number }): void
}

export interface OpiSurface {
  id: string
  slot: string
  order: number
  render: Component
  before?: string
  after?: string
}
```

### Discovery order

1. `<cwd>/.opi/extensions/*.ts`
2. `<cwd>/.opi/extensions/*/index.ts`
3. `~/.config/opi/extensions/*.ts`
4. `~/.config/opi/extensions/*/index.ts`

### Loader behavior

- uses jiti for zero-compile TypeScript loading
- each file must default-export an `OpiExtension` function
- loader calls each factory with a per-extension API instance
- collects contributions (surface mutations, event handlers) into a shared runtime
- errors in one extension do not crash others

### Tests

- loader discovers files from mock directories
- loader calls factory with correct API shape
- loader handles missing/broken extensions gracefully

### Success criteria

- extension loader runs at app startup
- placing a `.ts` file in `.opi/extensions/` causes it to be loaded and called
- the API object is typed and usable from the extension

## Phase 2 - wire UI mutations into surface system

Branch: `opi/extension-ui`

Goal: connect the extension API's `ui.*` methods to the existing surface registry so mutations from extensions actually render.

### What gets built

- bridge code that converts `OpiUI` calls into `SessionContribution` entries
- `surface-local.tsx` stops being the hook point; the extension loader replaces it
- built-in surfaces still render through the registry, but extensions can now mutate them

### Changes

- `packages/opencode/src/opi/runtime.ts` - shared runtime that accumulates contributions from all loaded extensions
- `packages/opencode/src/cli/cmd/tui/routes/session/surface-local.tsx` - reads contributions from the opi runtime instead of returning an empty array
- existing surface resolver stays unchanged

### Tests

- extension that calls `ui.addSurface()` produces a visible surface in the header
- extension that calls `ui.hideSurface("core.sidebar-getting-started")` actually hides it
- extension that calls `ui.moveSurface()` relocates a built-in
- extension that calls `ui.replaceSurface()` swaps the renderer

### Success criteria

- a real `.ts` extension file can structurally modify the TUI at startup
- no changes to the surface resolver itself

## Phase 3 - widgets and status

Branch: `opi/extension-widgets`

Goal: add lightweight widget and status bar primitives that do not require full surface registration.

### What gets added to OpiUI

```ts
export interface OpiUI {
  // existing surface methods...

  setStatus(key: string, text: string | undefined): void
  setWidget(key: string, content: string[] | undefined): void
  setWidget(key: string, render: Component | undefined): void
  notify(message: string, type?: "info" | "warning" | "error"): void
}
```

### Implementation

- `setStatus()` creates or updates a tiny surface in a dedicated `session.status` slot
- `setWidget()` creates or updates a surface in `session.sidebar.top` with a standard wrapper
- `notify()` uses OpenCode's existing toast system
- a new `session.status` slot is added to the slot set, rendered in the footer area

### Tests

- `setStatus("build", "running...")` shows text in the status area
- `setStatus("build", undefined)` removes it
- `setWidget("my-panel", ["line 1", "line 2"])` shows a text widget in the sidebar
- `notify("done", "info")` triggers a toast

### Success criteria

- extensions can show transient status and persistent widgets without knowing the surface system internals

## Phase 4 - event hooks

Branch: `opi/extension-events`

Goal: let extensions subscribe to agent lifecycle events through `opi.on()`.

### What gets added

```ts
export interface OpiEventEmitter {
  on(event: "session.start", handler: () => void): void
  on(event: "session.end", handler: () => void): void
  on(event: "message.user", handler: (msg: UserMessage) => void): void
  on(event: "message.assistant", handler: (msg: AssistantMessage) => void): void
  on(event: "tool.call", handler: (call: ToolCall) => void): void
  on(event: "tool.result", handler: (result: ToolResult) => void): void
  on(event: "idle", handler: () => void): void
}
```

### Implementation

- wraps OpenCode's existing plugin event hook system
- the opi event emitter subscribes to the internal event bus and fans out to registered extension handlers
- extensions do not need to know about OpenCode's `Hooks` interface directly

### Tests

- extension that subscribes to `session.start` gets called when a session starts
- extension that subscribes to `tool.result` sees tool output

### Success criteria

- extensions can react to agent lifecycle events without patching core code

## Phase 5 - tool registration

Branch: `opi/extension-tools`

Goal: let extensions register custom tools through `opi.registerTool()`.

### What gets added

```ts
export interface OpiAPI {
  // existing...
  registerTool(tool: OpiToolDefinition): void
}

export interface OpiToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
  execute(params: any, ctx: OpiToolContext): Promise<OpiToolResult>
}
```

### Implementation

- wraps OpenCode's existing plugin tool registration
- the opi tool definition gets converted to an OpenCode `ToolDefinition` and injected into the tool registry
- extensions can override built-in tools by registering with the same name

### Tests

- extension registers a tool, tool appears in the tool list
- extension tool can be called by the agent
- extension tool that shadows a built-in replaces it

### Success criteria

- extensions can add and override tools through the same API

## Phase 6 - built-ins through the extension API

Branch: `opi/extension-builtins`

Goal: migrate selected built-in surfaces to use the extension API, proving that built-ins and third-party extensions share the same path.

### What gets migrated

- `core.sidebar-mcp` - the MCP status section
- `core.sidebar-todo` - the todo list section
- `core.sidebar-diff` - the modified files section

These are good candidates because they are self-contained, visually distinct, and useful to replace.

### Implementation

- each migrated built-in becomes an internal extension function that calls `opi.ui.addSurface()`
- they are loaded before user extensions so user extensions can hide/move/replace them
- the surface-registry.tsx built-in list shrinks as surfaces move to the extension path

### Tests

- migrated built-ins still render identically
- user extension can hide a migrated built-in
- user extension can replace a migrated built-in's renderer

### Success criteria

- at least 3 built-in surfaces go through the extension API
- there is no visible difference for default users

## Phase 7 - example extensions and docs

Branch: `opi/extension-examples`

Goal: ship a set of working example extensions and documentation so the system is actually usable.

### Deliverables

- `docs/extensions.md` - how to write an opi extension, API reference, discovery rules
- `.opi/extensions/example-status.ts` - adds a status bar widget showing session cost
- `.opi/extensions/example-hide.ts` - hides the getting-started panel
- `.opi/extensions/example-custom-sidebar.ts` - adds a custom sidebar section
- `.opi/extensions/example-tool.ts` - registers a simple custom tool

### Documentation covers

- extension entry point signature
- full API reference
- discovery paths
- how to use ui.addSurface / hideSurface / moveSurface / replaceSurface
- how to use setStatus / setWidget / notify
- how to register tools
- how to subscribe to events
- one complete walkthrough from empty file to working extension

### Success criteria

- a developer can read the docs, create a `.ts` file, and have a working extension in under 5 minutes
- example extensions work out of the box when placed in `.opi/extensions/`

## Merge order

1. `opi/extension-types` → `dev`
2. `opi/extension-ui` → `dev`
3. `opi/extension-widgets` → `dev`
4. `opi/extension-events` → `dev`
5. `opi/extension-tools` → `dev`
6. `opi/extension-builtins` → `dev`
7. `opi/extension-examples` → `dev`

Each phase depends on the previous. Do not skip phases.

## What this plan does not cover

- message renderer replacement (complex, defer until the surface system is proven)
- editor component replacement (complex, defer)
- dialog/overlay system (defer)
- cross-extension communication (defer until real demand appears)
- npm-installable extension packages (defer until the API is stable)
- upstream contribution of any of this (separate decision, separate plan)

## Relationship to existing work

- the surface resolver (`surface-resolver.ts`) stays as-is throughout all phases
- the surface registry (`surface-registry.tsx`) gradually delegates to the extension runtime
- the `surface-local.tsx` file gets replaced by the extension loader in phase 2
- the `7075` theme and config overlay are unrelated to this plan and stay unchanged
