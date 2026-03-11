import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useRouteData } from "@tui/context/route"
import { useTheme } from "@/cli/cmd/tui/context/theme"
import { TodoItem } from "@/cli/cmd/tui/component/todo-item"
import type { SessionContribution } from "@/cli/cmd/tui/routes/session/surface-resolver"
import { Opi } from "./runtime"
import { defineExtension, type OpiExtension } from "./types"

const SidebarMcp = () => {
  const sync = useSync()
  const theme = useTheme().theme
  const mcp = () => Object.entries(sync.data.mcp).sort(([a], [b]) => a.localeCompare(b))
  const ok = () => mcp().filter(([_, item]) => item.status === "connected").length
  const err = () =>
    mcp().filter(
      ([_, item]) =>
        item.status === "failed" || item.status === "needs_auth" || item.status === "needs_client_registration",
    ).length
  const open = createSignal(true)

  return (
    <Show when={mcp().length > 0}>
      <box>
        <box flexDirection="row" gap={1} onMouseDown={() => mcp().length > 2 && open[1](!open[0]())}>
          <Show when={mcp().length > 2}>
            <text fg={theme.text}>{open[0]() ? "▼" : "▶"}</text>
          </Show>
          <text fg={theme.text}>
            <b>MCP</b>
            <Show when={!open[0]()}>
              <span style={{ fg: theme.textMuted }}>
                {" "}({ok()} active
                {err() > 0 ? `, ${err()} error${err() > 1 ? "s" : ""}` : ""})
              </span>
            </Show>
          </text>
        </box>
        <Show when={mcp().length <= 2 || open[0]()}>
          <For each={mcp()}>
            {([key, item]) => (
              <box flexDirection="row" gap={1}>
                <text
                  flexShrink={0}
                  style={{
                    fg: (
                      {
                        connected: theme.success,
                        failed: theme.error,
                        disabled: theme.textMuted,
                        needs_auth: theme.warning,
                        needs_client_registration: theme.error,
                      } as Record<string, typeof theme.success>
                    )[item.status],
                  }}
                >
                  •
                </text>
                <text fg={theme.text} wrapMode="word">
                  {key}{" "}
                  <span style={{ fg: theme.textMuted }}>
                    <Switch fallback={item.status}>
                      <Match when={item.status === "connected"}>Connected</Match>
                      <Match when={item.status === "failed" && item}>{(val) => <i>{val().error}</i>}</Match>
                      <Match when={item.status === "disabled"}>Disabled</Match>
                      <Match when={(item.status as string) === "needs_auth"}>Needs auth</Match>
                      <Match when={(item.status as string) === "needs_client_registration"}>Needs client ID</Match>
                    </Switch>
                  </span>
                </text>
              </box>
            )}
          </For>
        </Show>
      </box>
    </Show>
  )
}

const SidebarTodo = () => {
  const sync = useSync()
  const route = useRouteData("session")
  const theme = useTheme().theme
  const todo = () => sync.data.todo[route.sessionID] ?? []
  const open = createSignal(true)

  return (
    <Show when={todo().length > 0 && todo().some((item) => item.status !== "completed")}>
      <box>
        <box flexDirection="row" gap={1} onMouseDown={() => todo().length > 2 && open[1](!open[0]())}>
          <Show when={todo().length > 2}>
            <text fg={theme.text}>{open[0]() ? "▼" : "▶"}</text>
          </Show>
          <text fg={theme.text}>
            <b>Todo</b>
          </text>
        </box>
        <Show when={todo().length <= 2 || open[0]()}>
          <For each={todo()}>{(item) => <TodoItem status={item.status} content={item.content} />}</For>
        </Show>
      </box>
    </Show>
  )
}

const SidebarDiff = () => {
  const sync = useSync()
  const route = useRouteData("session")
  const theme = useTheme().theme
  const diff = () => sync.data.session_diff[route.sessionID] ?? []
  const open = createSignal(true)

  return (
    <Show when={diff().length > 0}>
      <box>
        <box flexDirection="row" gap={1} onMouseDown={() => diff().length > 2 && open[1](!open[0]())}>
          <Show when={diff().length > 2}>
            <text fg={theme.text}>{open[0]() ? "▼" : "▶"}</text>
          </Show>
          <text fg={theme.text}>
            <b>Modified Files</b>
          </text>
        </box>
        <Show when={diff().length <= 2 || open[0]()}>
          <For each={diff()}>
            {(item) => (
              <box flexDirection="row" gap={1} justifyContent="space-between">
                <text fg={theme.textMuted} wrapMode="none">
                  {item.file}
                </text>
                <box flexDirection="row" gap={1} flexShrink={0}>
                  <Show when={item.additions}>
                    <text fg={theme.diffAdded}>+{item.additions}</text>
                  </Show>
                  <Show when={item.deletions}>
                    <text fg={theme.diffRemoved}>-{item.deletions}</text>
                  </Show>
                </box>
              </box>
            )}
          </For>
        </Show>
      </box>
    </Show>
  )
}

const mcp = defineExtension((opi) => {
  opi.ui.addSurface({
    id: "core.sidebar-mcp",
    slot: "session.sidebar.top",
    order: 300,
    render: SidebarMcp,
  })
})

const todo = defineExtension((opi) => {
  opi.ui.addSurface({
    id: "core.sidebar-todo",
    slot: "session.sidebar.top",
    order: 500,
    render: SidebarTodo,
  })
})

const diff = defineExtension((opi) => {
  opi.ui.addSurface({
    id: "core.sidebar-diff",
    slot: "session.sidebar.top",
    order: 600,
    render: SidebarDiff,
  })
})

export const OpiBuiltin = {
  all(): OpiExtension[] {
    return [mcp, todo, diff]
  },
}

export function collectBuiltinSurface() {
  return Opi.collect(OpiBuiltin.all(), {
    id: "builtin",
    path: "<internal>",
  }) as SessionContribution[]
}

export function useSessionSurfaceBuiltin() {
  return createMemo(() => collectBuiltinSurface())
}
