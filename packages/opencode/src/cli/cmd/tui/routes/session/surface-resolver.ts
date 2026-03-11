import type { Component } from "solid-js"

export type SessionSlot =
  | "session.header.leading"
  | "session.header.trailing"
  | "session.sidebar.top"
  | "session.sidebar.bottom"

export type SessionSurface = {
  id: string
  slot: SessionSlot
  order: number
  render: Component
}

type Move = {
  type: "move"
  id: string
  slot: SessionSlot
  order?: number
  before?: string
  after?: string
}

type Hide = {
  type: "hide"
  id: string
}

type Add = {
  type: "add"
  surface: SessionSurface & {
    before?: string
    after?: string
  }
}

type Replace = {
  type: "replace"
  id: string
  surface: {
    render: Component
    slot?: SessionSlot
    order?: number
    before?: string
    after?: string
  }
}

export type SessionContribution = Move | Hide | Add | Replace

type Item = SessionSurface & {
  seq: number
  hidden?: boolean
  before?: string
  after?: string
}

function insert(map: Map<string, Item>, item: SessionSurface & { seq: number; before?: string; after?: string }) {
  if (map.has(item.id)) throw new Error(`duplicate session surface: ${item.id}`)
  map.set(item.id, item)
}

function anchor(list: Item[]) {
  const out = list.toSorted((a, b) => a.order - b.order || a.seq - b.seq)

  for (const item of [...out]) {
    if (!item.before && !item.after) continue
    if (item.before && item.after) throw new Error(`session surface ${item.id} cannot define both before and after`)

    const id = item.before ?? item.after!
    const from = out.findIndex((x) => x.id === item.id)
    const [next] = out.splice(from, 1)
    const to = out.findIndex((x) => x.id === id)
    if (to < 0) throw new Error(`unknown session surface anchor: ${id}`)
    out.splice(item.before ? to : to + 1, 0, next)
  }

  return out
}

export function resolveSessionSurface(base: SessionSurface[], ops: SessionContribution[]) {
  const map = new Map<string, Item>()

  base.forEach((item, seq) => insert(map, { ...item, seq }))

  let seq = base.length
  for (const op of ops) {
    if (op.type === "add") {
      insert(map, { ...op.surface, seq })
      seq += 1
      continue
    }

    const item = map.get(op.id)
    if (!item) throw new Error(`unknown session surface: ${op.id}`)

    if (op.type === "hide") {
      item.hidden = true
      continue
    }

    if (op.type === "move") {
      item.slot = op.slot
      item.order = op.order ?? item.order
      item.before = op.before
      item.after = op.after
      continue
    }

    item.render = op.surface.render
    item.slot = op.surface.slot ?? item.slot
    item.order = op.surface.order ?? item.order
    item.before = op.surface.before
    item.after = op.surface.after
  }

  return [...map.values()].filter((item) => !item.hidden)
}

export function selectSessionSurface(
  list: Array<SessionSurface & { seq?: number; before?: string; after?: string }>,
  slot: SessionSlot,
) {
  return anchor(
    list
      .filter((item) => item.slot === slot)
      .map((item, seq) => ({
        ...item,
        seq: item.seq ?? seq,
      })),
  )
}
