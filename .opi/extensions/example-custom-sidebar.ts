import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  opi.ui.setWidget("tips", [
    "Try /model to switch providers",
    "Use /agents to inspect subagents",
    "Press ? for keybinds",
  ])
})
