import z from "zod"
import { defineExtension, defineTool } from "opencode/opi"

export default defineExtension((opi) => {
  opi.registerTool(
    "hello",
    defineTool({
      description: "Greets a name from an opi extension",
      args: {
        name: z.string().optional(),
      },
      async execute({ name }) {
        return `hello ${name ?? "world"}`
      },
    }),
  )
})
