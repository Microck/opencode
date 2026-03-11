---
name: opi-pointer
description: Route opi-specific requests in the Microck fork to the correct area skill. Use whenever the user mentions opi, the fork, fork-only UI changes, repo-specific customization, or asks where a piece of opi behavior lives. This skill should be the first stop for broad opi requests before loading narrower skills like opi-header, opi-footer, opi-sidebar, opi-session-surface, opi-extensions, opi-widgets, opi-events, opi-tools, opi-theme, opi-branding, or opi-launcher-config.
---

# opi pointer

Use this skill to decide which narrower opi skill to load.

## Start here

- Read `docs/opi-change-tracker.md` first for the fork-only areas that already diverged from upstream.
- Prefer the most specific opi skill after that first pass.
- For mixed requests, load at most two narrower skills.

## Skill routing

| If the request is about... | Load this skill |
| --- | --- |
| top session bar, header, title row, leading/trailing header content | `opi-header` |
| footer, status line, bottom bar, status pills | `opi-footer` |
| sidebar panels, right column layout, MCP/Todo/Modified Files | `opi-sidebar` |
| slot definitions, add/move/hide/replace behavior, ordering logic | `opi-session-surface` |
| `.opi/extensions`, discovery, public API, examples, extension docs | `opi-extensions` |
| extension widgets, status items, render helpers | `opi-widgets` |
| extension event hooks, bus events, lifecycle wiring | `opi-events` |
| extension tool registration, overrides, and tool registry behavior | `opi-tools` |
| colors, themes, 7075, theme registry, opi visual identity in the TUI | `opi-theme` |
| README, logo, opi naming, fork presentation | `opi-branding` |
| launcher command, XDG overlay, shared setup, config paths | `opi-launcher-config` |

## Guardrails

- Prefer opi-specific files over upstream-generic cleanup.
- For non-trivial fork-only changes, update `docs/opi-change-tracker.md` in the same task.
- Do not edit generated instruction files just because the request is opi-related.
