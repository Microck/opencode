/** @jsxImportSource @opentui/solid */
import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.addSurface({
    id: "example.panel",
    slot: "session.sidebar.top",
    order: 50,
    render: () => (
      <box flexDirection="column">
        <text>
          <b>opi panel</b>
        </text>
        <text fg="#888888">Loaded from .opi/extensions/example-panel.tsx</text>
      </box>
    ),
  })
})
