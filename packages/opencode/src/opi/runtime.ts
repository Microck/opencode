import path from "path"
import { pathToFileURL } from "url"
import z from "zod"
import { NamedError } from "@opencode-ai/util/error"
import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { TuiEvent } from "@/cli/cmd/tui/event"
import type { SessionContribution } from "@/cli/cmd/tui/routes/session/surface-resolver"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionStatus } from "@/session/status"
import { Log } from "@/util/log"
import { Instance } from "@/project/instance"
import { OpiLoader } from "./loader"
import type { Component } from "solid-js"
import type { OpiApi, OpiEvent, OpiEventHandler, OpiExtension, OpiExtensionModule, OpiLoaded, OpiMeta, OpiToolDefinition, OpiCommand } from "./types"

type State = {
  phase: "init" | "ready"
  base: SessionContribution[]
  live: Map<string, SessionContribution>
  loaded: OpiLoaded[]
  tools: Map<string, { id: string; def: OpiToolDefinition }>
  commands: Map<string, OpiCommand>
  status: Map<string, string>
  widgets: Map<string, string[] | Component>
  handlers: Map<OpiEvent, Set<(input: any) => void | Promise<void>>>
  seen: {
    user: Set<string>
    assistant: Set<string>
    done: Set<string>
    tool: Map<string, string>
    busy: Set<string>
  }
  wired: boolean
}

const log = Log.create({ service: "opi" })

function warn(message: string, meta?: Record<string, unknown>) {
  log.warn(message, meta)
  void Bus.publish(Session.Event.Error, {
    error: new NamedError.Unknown({ message }).toObject(),
  })
}

function meta(file: string): OpiMeta {
  const dir = path.basename(path.dirname(file))
  return {
    id: dir === "extensions" ? path.basename(file, path.extname(file)) : dir,
    path: file,
    directory: Instance.directory,
    worktree: Instance.worktree,
  }
}

function pulse(state?: State) {
  if (state && state.phase !== "ready") return
  void Bus.publish(Opi.Event.Updated, {})
}

function has(state: State, id: string) {
  return state.live.has(id) || state.base.some((item) => (item.type === "add" ? item.surface.id : item.id) === id)
}

function set(state: State, key: string, op: SessionContribution) {
  if (state.phase === "init") {
    state.base.push(op)
    return
  }
  state.live.set(key, op)
  pulse(state)
}

function createState(): State {
  return {
    phase: "init",
    base: [],
    live: new Map(),
    loaded: [],
    tools: new Map(),
    commands: new Map(),
    status: new Map(),
    widgets: new Map(),
    handlers: new Map(),
    seen: {
      user: new Set(),
      assistant: new Set(),
      done: new Set(),
      tool: new Map(),
      busy: new Set(),
    },
    wired: false,
  }
}

function emit<Name extends OpiEvent>(state: State, name: Name, input: Parameters<OpiEventHandler<Name>>[0]) {
  const list = [...(state.handlers.get(name) ?? [])]
  return Promise.all(
    list.map((handler) =>
      Promise.resolve(handler(input)).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        warn(`Failed in opi event handler for ${name}: ${message}`, { event: name, err: message })
      }),
    ),
  )
}

function api(state: State, ext: OpiMeta): OpiApi {
  return {
    meta: ext,
    on(name, handler) {
      const set = state.handlers.get(name) ?? new Set()
      set.add(handler as (input: any) => void | Promise<void>)
      state.handlers.set(name, set)
    },
    registerTool(id, tool) {
      state.tools.set(id, { id, def: tool })
    },
    registerCommand(name, command) {
      state.commands.set(name, command)
    },
    ui: {
      addSurface(surface) {
        set(state, surface.id, { type: "add", surface })
      },
      moveSurface(id, input) {
        set(state, id, { type: "move", id, ...input })
      },
      hideSurface(id) {
        set(state, id, { type: "hide", id })
      },
      setStatus(key, text) {
        if (!text) {
          state.status.delete(key)
          pulse(state)
          return
        }
        state.status.set(key, text)
        pulse(state)
      },
      setWidget(key, input) {
        if (!input) {
          state.widgets.delete(key)
          pulse(state)
          return
        }
        state.widgets.set(key, input)
        pulse(state)
      },
      notify(input) {
        const info = typeof input === "string" ? { message: input } : input
        void Bus.publish(TuiEvent.ToastShow, {
          title: info.title,
          message: info.message,
          variant: info.variant ?? "info",
          duration: info.duration,
        })
      },
      replaceSurface(id, input) {
        set(state, id, { type: "replace", id, surface: input })
      },
    },
  }
}

async function run(state: State, ext: OpiMeta, fn: OpiExtension, track: boolean) {
  const ok = await Promise.resolve(fn(api(state, ext)))
    .then(() => true)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      warn(`Failed to run opi extension ${ext.path}: ${message}`, { file: ext.path, err: message })
      return false
    })

  if (!ok || !track) return
  state.loaded.push(ext)
}

async function load(file: string, state: State) {
  const mod = await import(pathToFileURL(file).href).catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    warn(`Failed to load opi extension ${file}: ${message}`, { file, err: message })
    return undefined
  })
  if (!mod) return

  const fn = (mod as OpiExtensionModule).default
  if (typeof fn !== "function") {
    warn(`Skipped opi extension ${file}: default export must be a function`, { file })
    return
  }

  await run(state, meta(file), fn, true)
}

function wire(state: State) {
  if (state.wired) return
  state.wired = true

  Bus.subscribe(SessionStatus.Event.Status, (evt) => {
    const { sessionID, status } = evt.properties
    if (status.type === "busy") {
      if (state.seen.busy.has(sessionID)) return
      state.seen.busy.add(sessionID)
      void emit(state, "session.start", { sessionID })
      return
    }
    if (status.type !== "idle") return
    state.seen.busy.delete(sessionID)
    void emit(state, "idle", { sessionID })
  })

  Bus.subscribe(MessageV2.Event.Updated, (evt) => {
    const { info } = evt.properties
    if (info.role === "user") {
      if (state.seen.user.has(info.id)) return
      state.seen.user.add(info.id)
      void emit(state, "message.user", { message: info })
      return
    }
    if (!state.seen.assistant.has(info.id)) {
      state.seen.assistant.add(info.id)
      void emit(state, "message.assistant", { message: info })
    }
    if (!info.time.completed || state.seen.done.has(info.id)) return
    state.seen.done.add(info.id)
    void emit(state, "session.end", { sessionID: info.sessionID, message: info })
  })

  Bus.subscribe(MessageV2.Event.PartUpdated, (evt) => {
    const { part } = evt.properties
    if (part.type !== "tool") return
    const prev = state.seen.tool.get(part.id)
    state.seen.tool.set(part.id, part.state.status)
    if (part.state.status === "running" && prev !== "running") {
      void emit(state, "tool.call", { part })
      return
    }
    if ((part.state.status === "completed" || part.state.status === "error") && prev !== part.state.status) {
      void emit(state, "tool.result", { part })
    }
  })
}

function reset(state: State) {
  state.phase = "init"
  state.base.length = 0
  state.live.clear()
  state.loaded.length = 0
  state.tools.clear()
  state.commands.clear()
  state.status.clear()
  state.widgets.clear()
  state.handlers.clear()
  state.seen.user.clear()
  state.seen.assistant.clear()
  state.seen.done.clear()
  state.seen.tool.clear()
  state.seen.busy.clear()
}

export namespace Opi {
  export const Event = {
    Updated: BusEvent.define("opi.updated", z.object({})),
  }

  const state = Instance.state<State>(() => createState())

  export function use() {
    return state()
  }

  export function session() {
    return [...state().base, ...state().live.values()]
  }

  export function loaded() {
    return state().loaded
  }

  export function tools() {
    return [...state().tools.values()]
  }

  export function commands() {
    return [...state().commands.entries()]
  }

  export function getCommand(name: string): OpiCommand | undefined {
    return state().commands.get(name)
  }

  export async function executeCommand(name: string, args: string): Promise<void> {
    const command = state().commands.get(name)
    if (!command) {
      throw new Error(`Command "${name}" not found`)
    }
    await command.handler(args)
  }

  export function status() {
    return [...state().status.entries()]
  }

  export function widgets() {
    return [...state().widgets.entries()]
  }

  export function collect(input: OpiExtension | OpiExtension[], ext?: Partial<OpiMeta>) {
    const ctx = createState()
    const meta = {
      id: ext?.id ?? "builtin",
      path: ext?.path ?? "<internal>",
      directory: ext?.directory ?? "",
      worktree: ext?.worktree ?? "",
    }

    for (const item of Array.isArray(input) ? input : [input]) {
      const result = item(api(ctx, meta))
      if (result && typeof (result as PromiseLike<void>).then === "function") {
        throw new Error(`opi.collect does not support async extensions: ${meta.id}`)
      }
    }

    return [...ctx.base, ...ctx.live.values()]
  }

  export async function init() {
    const ctx = state()
    reset(ctx)
    wire(ctx)

    for (const file of await OpiLoader.discover()) {
      await load(file, ctx)
    }

    ctx.phase = "ready"
    pulse(ctx)
    return ctx
  }
}
