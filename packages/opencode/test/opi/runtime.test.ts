import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Bus } from "../../src/bus"
import { TuiEvent } from "../../src/cli/cmd/tui/event"
import { Instance } from "../../src/project/instance"
import { OpiLoader } from "../../src/opi/loader"
import { Opi } from "../../src/opi"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionStatus } from "../../src/session/status"
import { ToolRegistry } from "../../src/tool/registry"
import type { Tool } from "../../src/tool/tool"
import { tmpdir } from "../fixture/fixture"

const zodURL = import.meta.resolve!("zod")

async function write(file: string, text: string) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await Bun.write(file, text)
}

const ctx: Tool.Context = {
  sessionID: "ses_test",
  messageID: "msg_test",
  callID: "call_test",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

function userMessage(sessionID: string, id: string): MessageV2.User {
  return {
    id,
    sessionID,
    role: "user",
    time: { created: 1 },
    agent: "build",
    model: {
      providerID: "opencode",
      modelID: "gpt-5",
    },
  }
}

function assistantMessage(sessionID: string, id: string, completed?: number): MessageV2.Assistant {
  return {
    id,
    sessionID,
    role: "assistant",
    time: {
      created: 1,
      completed,
    },
    parentID: "msg_user",
    modelID: "gpt-5",
    providerID: "opencode",
    mode: "build",
    agent: "build",
    path: {
      cwd: "/tmp",
      root: "/tmp",
    },
    cost: 0.25,
    tokens: {
      input: 10,
      output: 20,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0,
      },
    },
  }
}

function toolPart(
  sessionID: string,
  status: MessageV2.ToolPart["state"]["status"],
  tool = "bash",
): MessageV2.ToolPart {
  return {
    id: `part_${tool}_${status}`,
    messageID: "msg_tool",
    sessionID,
    type: "tool",
    tool,
    callID: `call_${tool}`,
    state:
      status === "running"
        ? {
            status: "running",
            input: {},
            title: tool,
            metadata: {},
            time: { start: 1 },
          }
        : {
            status: "completed",
            input: {},
            output: "ok",
            title: tool,
            metadata: {},
            time: { start: 1, end: 2 },
          },
  }
}

describe("opi extensions", () => {
  test("discovers global and local extensions in precedence order", async () => {
    await using tmp = await tmpdir({ git: true })
    const global = path.join(tmp.path, "global")
    const root = path.join(tmp.path, ".opi")
    const child = path.join(tmp.path, "packages", "demo", ".opi")

    await write(path.join(global, "extensions", "global.ts"), "export default () => {}\n")
    await write(path.join(root, "extensions", "alpha.ts"), "export default () => {}\n")
    await write(path.join(root, "extensions", "beta", "index.ts"), "export default () => {}\n")
    await write(path.join(child, "extensions", "gamma.ts"), "export default () => {}\n")

    const files = await OpiLoader.discover({
      global: [global],
      local: [root, child],
    })

    expect(files.map((file) => path.relative(tmp.path, file))).toMatchInlineSnapshot(`
[
  "global/extensions/global.ts",
  ".opi/extensions/alpha.ts",
  ".opi/extensions/beta/index.ts",
  "packages/demo/.opi/extensions/gamma.ts",
]
`)
  })

  test("loads local extensions into session contributions", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await write(
          path.join(dir, ".opi", "extensions", "hide-getting-started.ts"),
          [
            "export default (opi) => {",
            '  opi.ui.hideSurface("core.sidebar-getting-started")',
            '  opi.ui.moveSurface("core.sidebar-version", { slot: "session.sidebar.top", order: 50 })',
            "}",
            "",
          ].join("\n"),
        )
        await write(
          path.join(dir, ".opi", "extensions", "custom-badge.ts"),
          [
            "export default (opi) => {",
            "  opi.ui.addSurface({",
            '    id: "demo.badge",',
            '    slot: "session.header.leading",',
            "    order: 150,",
            '    render: () => null,',
            '    after: "core.session-primary",',
            "  })",
            "}",
            "",
          ].join("\n"),
        )
        await write(path.join(dir, ".opi", "extensions", "broken.ts"), "throw new Error('boom')\n")
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Opi.init()

        expect(Opi.loaded().map((item) => item.id)).toMatchInlineSnapshot(`
[
  "custom-badge",
  "hide-getting-started",
]
`)

        expect(
          Opi.session().map((item) =>
            item.type === "add"
              ? { type: item.type, id: item.surface.id, slot: item.surface.slot, after: item.surface.after }
              : item.type === "hide"
                ? { type: item.type, id: item.id }
                : item.type === "move"
                  ? { type: item.type, id: item.id, slot: item.slot, order: item.order }
                  : { type: item.type, id: item.id },
          ),
        ).toMatchInlineSnapshot(`
[
  {
    "after": "core.session-primary",
    "id": "demo.badge",
    "slot": "session.header.leading",
    "type": "add",
  },
  {
    "id": "core.sidebar-getting-started",
    "type": "hide",
  },
  {
    "id": "core.sidebar-version",
    "order": 50,
    "slot": "session.sidebar.top",
    "type": "move",
  },
]
`)
      },
    })
  })

  test("supports events, widgets, status, and notifications", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await write(
          path.join(dir, ".opi", "extensions", "events.ts"),
          [
            "export default (opi) => {",
            '  opi.on("session.start", ({ sessionID }) => opi.ui.setStatus("run", `busy ${sessionID}`))',
            '  opi.on("tool.result", ({ part }) => {',
            '    opi.ui.setWidget("last-tool", [part.tool, part.state.status])',
            '    opi.ui.notify({ message: `done ${part.tool}`, variant: "success" })',
            "  })",
            '  opi.on("idle", () => opi.ui.setStatus("run", undefined))',
            "}",
            "",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const toast: string[] = []
        const off = Bus.subscribe(TuiEvent.ToastShow, (evt) => {
          toast.push(`${evt.properties.variant}:${evt.properties.message}`)
        })

        await Opi.init()
        await Bus.publish(SessionStatus.Event.Status, {
          sessionID: "ses_live",
          status: { type: "busy" },
        })

        expect(Opi.status()).toMatchInlineSnapshot(`
[
  [
    "run",
    "busy ses_live",
  ],
]
`)

        await Bus.publish(MessageV2.Event.PartUpdated, {
          part: toolPart("ses_live", "completed"),
        })

        expect(Opi.widgets().map(([key, input]) => [key, Array.isArray(input) ? input : "component"])).toMatchInlineSnapshot(`
[
  [
    "last-tool",
    [
      "bash",
      "completed",
    ],
  ],
]
`)
        expect(toast).toMatchInlineSnapshot(`
[
  "success:done bash",
]
`)

        await Bus.publish(SessionStatus.Event.Status, {
          sessionID: "ses_live",
          status: { type: "idle" },
        })

        expect(Opi.status()).toEqual([])
        off()
      },
    })
  })

  test("supports user assistant tool-call and session-end events", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await write(
          path.join(dir, ".opi", "extensions", "events-all.ts"),
          [
            "export default (opi) => {",
            '  opi.on("message.user", ({ message }) => opi.ui.setStatus("user", message.id))',
            '  opi.on("message.assistant", ({ message }) => opi.ui.setStatus("assistant", message.id))',
            '  opi.on("tool.call", ({ part }) => opi.ui.setWidget("tool-call", [part.tool, part.state.status]))',
            '  opi.on("session.end", ({ message }) => opi.ui.setStatus("end", message.id))',
            "}",
            "",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Opi.init()

        await Bus.publish(MessageV2.Event.Updated, {
          info: userMessage("ses_live", "msg_user"),
        })
        await Bus.publish(MessageV2.Event.Updated, {
          info: assistantMessage("ses_live", "msg_assistant"),
        })
        await Bus.publish(MessageV2.Event.PartUpdated, {
          part: toolPart("ses_live", "running", "glob"),
        })
        await Bus.publish(MessageV2.Event.Updated, {
          info: assistantMessage("ses_live", "msg_assistant", 2),
        })

        expect(Opi.status()).toMatchInlineSnapshot(`
[
  [
    "user",
    "msg_user",
  ],
  [
    "assistant",
    "msg_assistant",
  ],
  [
    "end",
    "msg_assistant",
  ],
]
`)
        expect(Opi.widgets()).toMatchInlineSnapshot(`
[
  [
    "tool-call",
    [
      "glob",
      "running",
    ],
  ],
]
`)
      },
    })
  })

  test("registers new extension tools", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await write(
          path.join(dir, ".opi", "extensions", "hello.ts"),
          [
            `import z from '${zodURL}'`,
            "export default (opi) => {",
            '  opi.registerTool("hello", {',
            "    description: 'hello tool',",
            "    args: { name: z.string().optional() },",
            "    execute: async ({ name }) => `hello ${name ?? 'world'}` ,",
            "  })",
            "}",
            "",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Opi.init()
        const ids = await ToolRegistry.ids()
        expect(ids).toContain("hello")

        const tool = (await ToolRegistry.tools({ providerID: "opencode", modelID: "gpt-5" })).find(
          (item) => item.id === "hello",
        )
        expect(tool).toBeDefined()
        expect(tool!.parameters.safeParse({ name: "opi" }).success).toBeTrue()

        const out = await tool!.execute({ name: "opi" }, ctx)
        expect(out.output).toBe("hello opi")
      },
    })
  })

  test("registers extension tools and allows overrides", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await write(
          path.join(dir, ".opi", "extensions", "tools.ts"),
          [
            `import z from '${zodURL}'`,
            "export default (opi) => {",
            '  opi.registerTool("bash", {',
            "    description: 'override bash',",
            "    args: { flag: z.string().optional() },",
            "    execute: async ({ flag }) => `opi bash ${flag ?? 'ok'}` ,",
            "  })",
            "}",
            "",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Opi.init()
        const ids = await ToolRegistry.ids()
        expect(ids.filter((id) => id === "bash")).toHaveLength(1)

        const tool = (await ToolRegistry.tools({ providerID: "opencode", modelID: "gpt-5" })).find(
          (item) => item.id === "bash",
        )
        expect(tool).toBeDefined()
        expect(tool!.description).toBe("override bash")
        expect(tool!.parameters.safeParse({ flag: "done" }).success).toBeTrue()

        const out = await tool!.execute({ flag: "done" }, ctx)
        expect(out.output).toBe("opi bash done")
      },
    })
  })
})
