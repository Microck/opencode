---
name: opi-events
description: Modify opi extension event hooks or lifecycle wiring. Use whenever the user mentions opi events, opi.on(...), session.start, session.end, idle, message.user, message.assistant, tool.call, tool.result, or wants extensions to react to runtime/bus activity.
---

# opi events

This skill covers the event side of the opi extension system.

## Primary files

- `packages/opencode/src/opi/types.ts` - event names and handler typing
- `packages/opencode/src/opi/runtime.ts` - bus subscriptions and event emission to extensions
- `packages/opencode/src/session/status.ts` - source of busy and idle transitions
- `packages/opencode/src/session/message-v2.ts` - source of message and tool events
- `packages/opencode/test/opi/runtime.test.ts` - event coverage and regression checks

## Working rules

- Add or rename public events in `types.ts` and `runtime.ts` together.
- Trace bus sources before changing event semantics. The public event should match an actual runtime transition.
- If the request is really about widget/status side effects after an event, also load `opi-widgets`.

## Verify

- `cd packages/opencode && bun test test/opi/runtime.test.ts`
- `cd packages/opencode && bun run typecheck`
