import { SplitBorder } from "@tui/component/border"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useSessionSurface } from "./surface-registry"

export function Header() {
  const theme = useTheme().theme
  const dims = useTerminalDimensions()
  const surf = useSessionSurface()
  const narrow = createMemo(() => dims().width < 80)
  const left = createMemo(() => surf.slot("session.header.leading"))
  const right = createMemo(() => surf.slot("session.header.trailing"))

  return (
    <box flexShrink={0}>
      <box
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={1}
        {...SplitBorder}
        border={["left"]}
        borderColor={theme.border}
        flexShrink={0}
        backgroundColor={theme.backgroundPanel}
      >
        <box flexDirection={narrow() ? "column" : "row"} justifyContent="space-between" gap={1} width="100%">
          <box flexDirection="column" gap={1} flexGrow={1}>
            <For each={left()}>{(item) => <Dynamic component={item.render} />}</For>
          </box>
          <Show when={right().length > 0}>
            <box flexDirection="column" gap={1} flexShrink={0}>
              <For each={right()}>{(item) => <Dynamic component={item.render} />}</For>
            </box>
          </Show>
        </box>
      </box>
    </box>
  )
}
