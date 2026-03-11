import { createMemo, createSignal, onCleanup } from "solid-js"
import { Bus } from "@/bus"
import { Opi } from "@/opi"
import { useSessionSurfaceBuiltin } from "@/opi/builtin"
import { createStatus, createWidget } from "@/opi/render"
import type { SessionContribution } from "./surface-resolver"

export function useSessionSurfaceLocal() {
  const [tick, setTick] = createSignal(0)
  const off = Bus.subscribe(Opi.Event.Updated, () => setTick((value) => value + 1))
  onCleanup(off)
  const builtin = useSessionSurfaceBuiltin()

  return createMemo<SessionContribution[]>(() => {
    tick()
    const status = Opi.status().map(([key, text], i) => ({
      type: "add" as const,
      surface: {
        id: `opi.status.${key}`,
        slot: "session.status" as const,
        order: 1000 + i,
        render: createStatus(text),
      },
    }))
    const widget = Opi.widgets().map(([key, input], i) => ({
      type: "add" as const,
      surface: {
        id: `opi.widget.${key}`,
        slot: "session.sidebar.top" as const,
        order: 900 + i,
        render: createWidget(key, input),
      },
    }))
    return [...builtin(), ...Opi.session(), ...widget, ...status]
  })
}
