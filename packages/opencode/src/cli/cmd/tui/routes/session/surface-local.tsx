import { createMemo } from "solid-js"
import type { SessionContribution } from "./surface-resolver"

export function useSessionSurfaceLocal() {
  return createMemo<SessionContribution[]>(() => [])
}
