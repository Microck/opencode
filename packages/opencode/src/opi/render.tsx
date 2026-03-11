import { For, Show, type Component } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useTheme } from "@/cli/cmd/tui/context/theme"

function title(key: string) {
  return key.replaceAll(/[._-]+/g, " ")
}

export function createStatus(text: string) {
  const result: Component = () => {
    const theme = useTheme().theme
    return <text fg={theme.textMuted}>{text}</text>
  }
  return result
}

export function createWidget(key: string, input: string[] | Component) {
  const result: Component = () => {
    const theme = useTheme().theme
    return (
      <box flexDirection="column">
        <text fg={theme.text}>
          <b>{title(key)}</b>
        </text>
        <Show when={Array.isArray(input)} fallback={<Dynamic component={input as Component} />}>
          <box flexDirection="column">
            <For each={input as string[]}>{(line) => <text fg={theme.textMuted}>{line}</text>}</For>
          </box>
        </Show>
      </box>
    )
  }
  return result
}
