import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.moveSurface("core.sidebar-version", {
    slot: "session.sidebar.top",
    order: 50,
  })
})
