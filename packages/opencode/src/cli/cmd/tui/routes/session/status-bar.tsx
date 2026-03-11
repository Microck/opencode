import { For, Show, createMemo } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useTheme } from "../../context/theme"
import { useSessionSurface } from "./surface-registry"

export function StatusBar() {
  const theme = useTheme().theme
  const surf = useSessionSurface()
  const list = createMemo(() => surf.slot("session.status"))

  return (
    <Show when={list().length > 0}>
      <box
        flexShrink={0}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={theme.backgroundPanel}
      >
        <box flexDirection="row" gap={2}>
          <For each={list()}>{(item) => <Dynamic component={item.render} />}</For>
        </box>
      </box>
    </Show>
  )
}
