import { defineExtension } from "opencode/opi"

export default defineExtension((opi) => {
  const seen = new Map<string, number>()

  function render() {
    const total = [...seen.values()].reduce((sum, value) => sum + value, 0)
    opi.ui.setStatus("cost", `cost $${total.toFixed(4)}`)
  }

  opi.on("session.start", () => {
    seen.clear()
    render()
  })

  opi.on("message.assistant", ({ message }) => {
    seen.set(message.id, message.cost)
    render()
  })
})
