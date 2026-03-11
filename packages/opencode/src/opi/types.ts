import type { Component } from "solid-js"
import type z from "zod"
import type { ToolContext as PluginToolContext, ToolDefinition } from "@opencode-ai/plugin"
import type { SessionContribution, SessionSlot, SessionSurface } from "@/cli/cmd/tui/routes/session/surface-resolver"
import type { MessageV2 } from "@/session/message-v2"

export type OpiSurface = SessionSurface & {
  before?: string
  after?: string
}

export interface OpiUI {
  addSurface(surface: OpiSurface): void
  moveSurface(
    id: string,
    input: {
      slot: SessionSlot
      order?: number
      before?: string
      after?: string
    },
  ): void
  hideSurface(id: string): void
  setStatus(key: string, text: string | undefined): void
  setWidget(key: string, input: string[] | Component | undefined): void
  notify(input: string | { title?: string; message: string; variant?: "info" | "success" | "warning" | "error"; duration?: number }): void
  replaceSurface(
    id: string,
    input: {
      render: Component
      slot?: SessionSlot
      order?: number
      before?: string
      after?: string
    },
  ): void
}

export interface OpiMeta {
  id: string
  path: string
  directory: string
  worktree: string
}

export interface OpiApi {
  meta: OpiMeta
  ui: OpiUI
  on<Name extends OpiEvent>(name: Name, handler: OpiEventHandler<Name>): void
  registerTool(id: string, tool: OpiToolDefinition): void
}

export type OpiExtension = (opi: OpiApi) => void | Promise<void>

export type OpiExtensionModule = {
  default?: OpiExtension
}

export type OpiLoaded = OpiMeta

export type OpiToolDefinition = ToolDefinition
export type OpiToolContext = PluginToolContext

export type OpiEventMap = {
  "session.start": { sessionID: string }
  "session.end": { sessionID: string; message: MessageV2.Assistant }
  idle: { sessionID: string }
  "message.user": { message: MessageV2.User }
  "message.assistant": { message: MessageV2.Assistant }
  "tool.call": { part: MessageV2.ToolPart }
  "tool.result": { part: MessageV2.ToolPart }
}

export type OpiEvent = keyof OpiEventMap
export type OpiEventHandler<Name extends OpiEvent> = (input: OpiEventMap[Name]) => void | Promise<void>

export function defineTool<Args extends z.ZodRawShape>(tool: {
  description: string
  args: Args
  execute(args: z.infer<z.ZodObject<Args>>, context: OpiToolContext): Promise<string>
}) {
  return tool
}

export function defineExtension(extension: OpiExtension) {
  return extension
}
