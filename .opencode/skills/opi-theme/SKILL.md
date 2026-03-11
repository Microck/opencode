---
name: opi-theme
description: Modify the opi fork theme system or fork-only visual palette. Use whenever the user mentions opi theme, 7075, colors, theme registry, custom theme JSON, or wants the fork to look different from upstream without changing the whole upstream design system.
---

# opi theme

Use this skill for fork-only visual identity work, especially the 7075 theme path.

## Primary files

- `packages/opencode/src/cli/cmd/tui/context/theme.tsx` - theme registry, loading, and resolution
- `packages/opencode/src/cli/cmd/tui/context/theme/7075.json` - built-in fork theme asset
- `.opencode/themes/` - repo-local custom theme files
- `docs/opi-change-tracker.md` - records the fork-only theme/config overlay

## External paths that matter

- `~/.config/opi-xdg/opencode/tui.json`
- `~/.config/opi-xdg/opencode/themes/7075.json`

## Working rules

- If the request is about the built-in palette list, edit `theme.tsx` and the relevant JSON file together.
- If the request is about repo-local theme overrides, prefer `.opencode/themes/`.
- If the request is about the opi-only user setup, coordinate with `opi-launcher-config`.
- Keep the fork-specific look separate from upstream defaults when possible.

## Verify

- `cd packages/opencode && bun run typecheck`
- If the change is visual, also verify by launching the TUI and checking the affected theme manually.
