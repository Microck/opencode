import { useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "../../context/theme"
import { createSimpleContext } from "../../context/helper"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { pipe, sumBy } from "remeda"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import { useCommandDialog } from "@tui/component/dialog-command"
import { useKeybind } from "../../context/keybind"
import { Flag } from "@/flag/flag"
import { useDirectory } from "../../context/directory"
import { useKV } from "../../context/kv"
import { Installation } from "@/installation"
import { useSessionSurfaceLocal } from "./surface-local"
import {
  resolveSessionSurface,
  selectSessionSurface,
  type SessionSlot,
  type SessionSurface,
} from "./surface-resolver"

export const { use: useSessionSurface, provider: SessionSurfaceProvider } = createSimpleContext({
  name: "SessionSurface",
  init: () => {
    const route = useRouteData("session")
    const sync = useSync()
    const theme = useTheme().theme
    const cmd = useCommandDialog()
    const keybind = useKeybind()
    const dir = useDirectory()
    const kv = useKV()
    const ext = useSessionSurfaceLocal()
    const session = createMemo(() => sync.session.get(route.sessionID))
    const msgs = createMemo(() => sync.data.message[route.sessionID] ?? [])
    const cost = createMemo(() => {
      const total = pipe(
        msgs(),
        sumBy((item) => (item.role === "assistant" ? item.cost : 0)),
      )

      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(total)
    })
    const usage = createMemo(() => {
      const last = msgs().findLast((item) => item.role === "assistant" && item.tokens.output > 0) as AssistantMessage
      if (!last) return

      const total =
        last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
      const model = sync.data.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
      return {
        tokens: total.toLocaleString(),
        percentage: model?.limit.context ? Math.round((total / model.limit.context) * 100) : null,
      }
    })
    const workspace = createMemo(() => {
      const id = session()?.workspaceID
      if (!id) return "Workspace local"

      const info = sync.workspace.get(id)
      if (!info) return `Workspace ${id}`

      return `Workspace ${id} (${info.type})`
    })
    const hasProviders = createMemo(() =>
      sync.data.provider.some((item) => item.id !== "opencode" || Object.values(item.models).some((model) => model.cost?.input !== 0)),
    )
    const dismissed = createMemo(() => kv.get("dismissed_getting_started", false))

    const SessionPrimary = () => {
      const hover = createSignal<"parent" | "prev" | "next" | null>(null)

      return (
        <Show when={session()}>
          <Switch>
            <Match when={session()?.parentID}>
              <box flexDirection="column" gap={1}>
                <box flexDirection="column">
                  <text fg={theme.text}>
                    <b>Subagent session</b>
                  </text>
                  <Show when={Flag.OPENCODE_EXPERIMENTAL_WORKSPACES}>
                    <text fg={theme.textMuted} wrapMode="none" flexShrink={0}>
                      {workspace()}
                    </text>
                  </Show>
                </box>
                <box flexDirection="row" gap={2}>
                  <box
                    onMouseOver={() => hover[1]("parent")}
                    onMouseOut={() => hover[1](null)}
                    onMouseUp={() => cmd.trigger("session.parent")}
                    backgroundColor={hover[0]() === "parent" ? theme.backgroundElement : theme.backgroundPanel}
                  >
                    <text fg={theme.text}>
                      Parent <span style={{ fg: theme.textMuted }}>{keybind.print("session_parent")}</span>
                    </text>
                  </box>
                  <box
                    onMouseOver={() => hover[1]("prev")}
                    onMouseOut={() => hover[1](null)}
                    onMouseUp={() => cmd.trigger("session.child.previous")}
                    backgroundColor={hover[0]() === "prev" ? theme.backgroundElement : theme.backgroundPanel}
                  >
                    <text fg={theme.text}>
                      Prev <span style={{ fg: theme.textMuted }}>{keybind.print("session_child_cycle_reverse")}</span>
                    </text>
                  </box>
                  <box
                    onMouseOver={() => hover[1]("next")}
                    onMouseOut={() => hover[1](null)}
                    onMouseUp={() => cmd.trigger("session.child.next")}
                    backgroundColor={hover[0]() === "next" ? theme.backgroundElement : theme.backgroundPanel}
                  >
                    <text fg={theme.text}>
                      Next <span style={{ fg: theme.textMuted }}>{keybind.print("session_child_cycle")}</span>
                    </text>
                  </box>
                </box>
              </box>
            </Match>
            <Match when={true}>
              <box flexDirection="column">
                <text fg={theme.text}>
                  <span style={{ bold: true }}>#</span> <span style={{ bold: true }}>{session()?.title}</span>
                </text>
                <Show when={Flag.OPENCODE_EXPERIMENTAL_WORKSPACES}>
                  <text fg={theme.textMuted} wrapMode="none" flexShrink={0}>
                    {workspace()}
                  </text>
                </Show>
              </box>
            </Match>
          </Switch>
        </Show>
      )
    }

    const SessionContext = () => {
      return (
        <Show when={usage()}>
          <text fg={theme.textMuted} wrapMode="none" flexShrink={0}>
            {usage()?.tokens} ({cost()})
          </text>
        </Show>
      )
    }

    const SidebarSession = () => {
      return (
        <Show when={session()}>
          <box paddingRight={1}>
            <text fg={theme.text}>
              <b>{session()?.title}</b>
            </text>
            <Show when={session()?.share?.url}>
              <text fg={theme.textMuted}>{session()?.share?.url}</text>
            </Show>
          </box>
        </Show>
      )
    }

    const SidebarContext = () => {
      return (
        <box>
          <text fg={theme.text}>
            <b>Context</b>
          </text>
          <text fg={theme.textMuted}>{usage()?.tokens ?? 0} tokens</text>
          <text fg={theme.textMuted}>{usage()?.percentage ?? 0}% used</text>
          <text fg={theme.textMuted}>{cost()} spent</text>
        </box>
      )
    }

    const SidebarLsp = () => {
      const open = createSignal(true)

      return (
        <box>
          <box flexDirection="row" gap={1} onMouseDown={() => sync.data.lsp.length > 2 && open[1](!open[0]())}>
            <Show when={sync.data.lsp.length > 2}>
              <text fg={theme.text}>{open[0]() ? "▼" : "▶"}</text>
            </Show>
            <text fg={theme.text}>
              <b>LSP</b>
            </text>
          </box>
          <Show when={sync.data.lsp.length <= 2 || open[0]()}>
            <Show when={sync.data.lsp.length === 0}>
              <text fg={theme.textMuted}>
                {sync.data.config.lsp === false ? "LSPs have been disabled in settings" : "LSPs will activate as files are read"}
              </text>
            </Show>
            <For each={sync.data.lsp}>
              {(item) => (
                <box flexDirection="row" gap={1}>
                  <text
                    flexShrink={0}
                    style={{
                      fg: {
                        connected: theme.success,
                        error: theme.error,
                      }[item.status],
                    }}
                  >
                    •
                  </text>
                  <text fg={theme.textMuted}>
                    {item.id} {item.root}
                  </text>
                </box>
              )}
            </For>
          </Show>
        </box>
      )
    }

    const SidebarGettingStarted = () => {
      return (
        <Show when={!hasProviders() && !dismissed()}>
          <box
            backgroundColor={theme.backgroundElement}
            paddingTop={1}
            paddingBottom={1}
            paddingLeft={2}
            paddingRight={2}
            flexDirection="row"
            gap={1}
          >
            <text flexShrink={0} fg={theme.text}>
              ⬖
            </text>
            <box flexGrow={1} gap={1}>
              <box flexDirection="row" justifyContent="space-between">
                <text fg={theme.text}>
                  <b>Getting started</b>
                </text>
                <text fg={theme.textMuted} onMouseDown={() => kv.set("dismissed_getting_started", true)}>
                  ✕
                </text>
              </box>
              <text fg={theme.textMuted}>OpenCode includes free models so you can start immediately.</text>
              <text fg={theme.textMuted}>
                Connect from 75+ providers to use other models, including Claude, GPT, Gemini etc
              </text>
              <box flexDirection="row" gap={1} justifyContent="space-between">
                <text fg={theme.text}>Connect provider</text>
                <text fg={theme.textMuted}>/connect</text>
              </box>
            </box>
          </box>
        </Show>
      )
    }

    const SidebarDirectory = () => {
      return <text fg={theme.textMuted}>{dir()}</text>
    }

    const SidebarVersion = () => {
      return (
        <text fg={theme.textMuted}>
          <span style={{ fg: theme.success }}>•</span> <b>Open</b>
          <span style={{ fg: theme.text }}>
            <b>Code</b>
          </span>{" "}
          <span>{Installation.VERSION}</span>
        </text>
      )
    }

    const base = createMemo<SessionSurface[]>(() => [
      {
        id: "core.session-primary",
        slot: "session.header.leading",
        order: 100,
        render: SessionPrimary,
      },
      {
        id: "core.session-context",
        slot: "session.header.trailing",
        order: 200,
        render: SessionContext,
      },
      {
        id: "core.sidebar-session",
        slot: "session.sidebar.top",
        order: 100,
        render: SidebarSession,
      },
      {
        id: "core.sidebar-context",
        slot: "session.sidebar.top",
        order: 200,
        render: SidebarContext,
      },
      {
        id: "core.sidebar-lsp",
        slot: "session.sidebar.top",
        order: 400,
        render: SidebarLsp,
      },
      {
        id: "core.sidebar-getting-started",
        slot: "session.sidebar.bottom",
        order: 100,
        render: SidebarGettingStarted,
      },
      {
        id: "core.sidebar-directory",
        slot: "session.sidebar.bottom",
        order: 200,
        render: SidebarDirectory,
      },
      {
        id: "core.sidebar-version",
        slot: "session.sidebar.bottom",
        order: 300,
        render: SidebarVersion,
      },
    ])
    const list = createMemo(() => resolveSessionSurface(base(), ext()))

    return {
      slot(slot: SessionSlot) {
        return selectSessionSurface(list(), slot)
      },
    }
  },
})
