import { describe, expect, test } from "bun:test"
import type { Component } from "solid-js"
import {
  resolveSessionSurface,
  selectSessionSurface,
  type SessionContribution,
  type SessionSurface,
} from "../../../src/cli/cmd/tui/routes/session/surface-resolver"

const empty: Component = () => null

function item(id: string, slot: SessionSurface["slot"], order: number): SessionSurface {
  return {
    id,
    slot,
    order,
    render: empty,
  }
}

function shape(list: SessionSurface[]) {
  return list.map((item) => ({
    id: item.id,
    slot: item.slot,
    order: item.order,
  }))
}

describe("session surface", () => {
  test("applies add move hide and replace", () => {
    const base = [
      item("core.title", "session.header.leading", 100),
      item("core.context", "session.header.trailing", 200),
      item("core.version", "session.sidebar.bottom", 300),
    ]
    const extra: SessionContribution[] = [
      {
        type: "add",
        surface: {
          id: "fork.badge",
          slot: "session.header.leading",
          order: 150,
          render: empty,
        },
      },
      {
        type: "move",
        id: "core.context",
        slot: "session.header.leading",
        after: "fork.badge",
      },
      {
        type: "replace",
        id: "core.title",
        surface: {
          render: empty,
          order: 50,
        },
      },
      {
        type: "hide",
        id: "core.version",
      },
    ]

    const list = resolveSessionSurface(base, extra)

    expect(shape(selectSessionSurface(list, "session.header.leading"))).toMatchInlineSnapshot(`
[
  {
    "id": "core.title",
    "order": 50,
    "slot": "session.header.leading",
  },
  {
    "id": "fork.badge",
    "order": 150,
    "slot": "session.header.leading",
  },
  {
    "id": "core.context",
    "order": 200,
    "slot": "session.header.leading",
  },
]
`)
    expect(shape(selectSessionSurface(list, "session.sidebar.bottom"))).toMatchInlineSnapshot(`[]`)
  })

  test("fails on unknown ids", () => {
    expect(() =>
      resolveSessionSurface([item("core.title", "session.header.leading", 100)], [
        {
          type: "hide",
          id: "core.missing",
        },
      ]),
    ).toThrow("unknown session surface: core.missing")
  })

  test("fails on duplicate adds", () => {
    expect(() =>
      resolveSessionSurface([item("core.title", "session.header.leading", 100)], [
        {
          type: "add",
          surface: {
            id: "core.title",
            slot: "session.header.leading",
            order: 200,
            render: empty,
          },
        },
      ]),
    ).toThrow("duplicate session surface: core.title")
  })

  test("anchors surfaces with before", () => {
    const base = [
      item("one", "session.sidebar.top", 100),
      item("two", "session.sidebar.top", 200),
      item("three", "session.sidebar.top", 300),
    ]
    const extra: SessionContribution[] = [
      {
        type: "move",
        id: "three",
        slot: "session.sidebar.top",
        before: "one",
      },
    ]

    expect(shape(selectSessionSurface(resolveSessionSurface(base, extra), "session.sidebar.top"))).toMatchInlineSnapshot(`
[
  {
    "id": "three",
    "order": 300,
    "slot": "session.sidebar.top",
  },
  {
    "id": "one",
    "order": 100,
    "slot": "session.sidebar.top",
  },
  {
    "id": "two",
    "order": 200,
    "slot": "session.sidebar.top",
  },
]
`)
  })

  test("lets later ops hide and replace extension-provided surfaces", () => {
    const extra: SessionContribution[] = [
      {
        type: "add",
        surface: {
          id: "core.sidebar-mcp",
          slot: "session.sidebar.top",
          order: 300,
          render: empty,
        },
      },
      {
        type: "add",
        surface: {
          id: "core.sidebar-todo",
          slot: "session.sidebar.top",
          order: 500,
          render: empty,
        },
      },
      {
        type: "hide",
        id: "core.sidebar-mcp",
      },
      {
        type: "replace",
        id: "core.sidebar-todo",
        surface: {
          render: empty,
          slot: "session.sidebar.bottom",
          order: 50,
        },
      },
    ]

    const list = resolveSessionSurface([], extra)

    expect(shape(selectSessionSurface(list, "session.sidebar.top"))).toMatchInlineSnapshot(`[]`)
    expect(shape(selectSessionSurface(list, "session.sidebar.bottom"))).toMatchInlineSnapshot(`
[
  {
    "id": "core.sidebar-todo",
    "order": 50,
    "slot": "session.sidebar.bottom",
  },
]
`)
  })
})
