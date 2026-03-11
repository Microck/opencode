# opi extensions

opi can load local TypeScript extensions and let them mutate the session TUI, react to runtime events, and register tools without patching core files.

## Current scope

- extension discovery from project and global `extensions/` folders
- typed `opi` API object passed to each extension factory
- session surface mutations through `addSurface`, `moveSurface`, `hideSurface`, and `replaceSurface`
- status line entries through `setStatus`
- sidebar widgets through `setWidget`
- runtime event hooks through `opi.on(...)`
- notifications through `opi.ui.notify(...)`
- tool registration and built-in overrides through `opi.registerTool(...)`
- selected built-ins now mounted through the same extension contribution path
- startup loading through the normal instance bootstrap path

## Discovery order

opi loads extensions in this order:

1. `${XDG_CONFIG_HOME}/opencode/extensions/*.ts` and `*/index.ts`
2. ancestor `.opi/extensions/*.ts` files from the worktree root down to the current project
3. ancestor `.opi/extensions/*/index.ts` files in the same root-to-leaf order

In the current local launcher setup, the global path usually resolves to `~/.config/opi-xdg/opencode/extensions`.

Supported entry file extensions are `ts`, `tsx`, `js`, `jsx`, `mts`, `mtsx`, `mjs`, `cts`, `ctsx`, and `cjs`.

## Extension entrypoint

Each extension must default export a function.

```ts
import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.hideSurface("core.sidebar-getting-started")
})
```

The `opi` object currently contains:

- `meta.id` - extension id derived from the filename or folder name
- `meta.path` - absolute path to the loaded file
- `meta.directory` - current project directory
- `meta.worktree` - current git worktree root
- `ui.*` - session surface mutation helpers
- `on(name, handler)` - subscribes the extension to opi lifecycle events
- `registerTool(id, def)` - adds or overrides a tool in the tool registry

## UI API

### `opi.ui.addSurface(surface)`

Adds a new renderable surface.

```ts
opi.ui.addSurface({
  id: "demo.badge",
  slot: "session.header.leading",
  order: 150,
  render: () => null,
  after: "core.session-primary",
})
```

### `opi.ui.moveSurface(id, input)`

Moves an existing surface to a different slot or order.

```ts
opi.ui.moveSurface("core.sidebar-version", {
  slot: "session.sidebar.top",
  order: 50,
})
```

### `opi.ui.hideSurface(id)`

Hides an existing built-in or extension-provided surface.

```ts
opi.ui.hideSurface("core.sidebar-getting-started")
```

### `opi.ui.replaceSurface(id, input)`

Replaces the renderer for an existing surface and can also move it.

```ts
opi.ui.replaceSurface("core.session-context", {
  render: () => null,
  slot: "session.header.leading",
})
```

### `opi.ui.setStatus(key, text)`

Adds or updates a footer status item. Pass `undefined` to remove it.

```ts
opi.ui.setStatus("run", "busy ses_live")
opi.ui.setStatus("run", undefined)
```

### `opi.ui.setWidget(key, input)`

Adds or updates a sidebar widget. `input` can be a list of text lines or a component.

```ts
opi.ui.setWidget("last-tool", ["bash", "completed"])
```

### `opi.ui.notify(input)`

Shows a TUI toast.

```ts
opi.ui.notify({
  message: "Extension finished",
  variant: "success",
})
```

## Events

Current event names:

- `session.start`
- `session.end`
- `idle`
- `message.user`
- `message.assistant`
- `tool.call`
- `tool.result`

```ts
opi.on("session.start", ({ sessionID }) => {
  opi.ui.setStatus("run", `busy ${sessionID}`)
})

opi.on("tool.result", ({ part }) => {
  opi.ui.setWidget("last-tool", [part.tool, part.state.status])
  opi.ui.notify(`done ${part.tool}`)
})

opi.on("idle", () => {
  opi.ui.setStatus("run", undefined)
})
```

## Tools

Extensions can register tools with the same definition shape used by the plugin tool bridge. Registering with the same id as a built-in replaces the built-in for the active session.

```ts
import z from "zod"
import { defineTool } from "opencode/opi"

opi.registerTool("bash", defineTool({
  description: "override bash",
  args: {
    flag: z.string().optional(),
  },
  async execute({ flag }) {
    return `opi bash ${flag ?? "ok"}`
  },
}))
```

## Slots

Current session slots:

- `session.header.leading`
- `session.header.trailing`
- `session.sidebar.top`
- `session.sidebar.bottom`
- `session.status`

## Writing rendered surfaces

If your extension renders JSX, use a `.tsx` file and set the OpenTUI JSX runtime at the top of the file.

```tsx
/** @jsxImportSource @opentui/solid */
import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.addSurface({
    id: "demo.panel",
    slot: "session.sidebar.top",
    order: 50,
    render: () => (
      <box>
        <text>hello from opi</text>
      </box>
    ),
  })
})
```

## Examples in this repo

- `.opi/extensions/example-status.ts`
- `.opi/extensions/example-hide.ts`
- `.opi/extensions/example-custom-sidebar.ts`
- `.opi/extensions/example-move.ts`
- `.opi/extensions/example-panel.tsx`
- `.opi/extensions/example-tool.ts`

## Walkthrough

Start with a new file at `.opi/extensions/hello.ts`:

```ts
import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.setWidget("hello", [
    "opi extension loaded",
    `from ${opi.meta.id}`,
  ])
})
```

Then launch `opi` in the repo. If the file loads correctly, a `Hello` widget appears in the session sidebar without changing any core source files.

From there you can:

- switch to `opi.ui.hideSurface(...)` to remove built-ins
- switch to `opi.on(...)` to react to lifecycle events
- switch to `opi.registerTool(...)` to add or override tools

## Notes

- Extension load failures are isolated. One broken extension does not stop the others.
- Surface ids must still be unique after all extension mutations are applied.
- Built-in `MCP`, `Todo`, and `Modified Files` sidebar panels now flow through the same contribution merge as opi extensions.
- Built-ins are collected before user extensions, so user extensions can hide, move, or replace them.
- This API currently targets the fork-only session surface system in `packages/opencode/src/cli/cmd/tui/routes/session/`.
