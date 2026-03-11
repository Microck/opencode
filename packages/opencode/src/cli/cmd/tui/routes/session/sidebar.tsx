import { Show, For } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSync } from "@tui/context/sync"
import { Dynamic } from "solid-js/web"
import { useSessionSurface } from "./surface-registry"

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const sync = useSync()
  const theme = useTheme().theme
  const surf = useSessionSurface()

  return (
    <Show when={sync.session.get(props.sessionID)}>
      <box
        backgroundColor={theme.backgroundPanel}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox
          flexGrow={1}
          verticalScrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.background,
              foregroundColor: theme.borderActive,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingRight={1}>
            <For each={surf.slot("session.sidebar.top")}>{(item) => <Dynamic component={item.render} />}</For>
          </box>
        </scrollbox>
        <box flexShrink={0} gap={1} paddingTop={1}>
          <For each={surf.slot("session.sidebar.bottom")}>{(item) => <Dynamic component={item.render} />}</For>
        </box>
      </box>
    </Show>
  )
}
