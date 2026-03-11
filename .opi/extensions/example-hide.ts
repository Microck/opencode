import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.hideSurface("core.sidebar-getting-started")
})
