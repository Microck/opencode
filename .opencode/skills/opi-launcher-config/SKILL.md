---
name: opi-launcher-config
description: Modify the opi launcher command, XDG overlay, or fork-specific shared setup. Use whenever the user mentions the opi launcher, ~/.local/bin/opi, opi-xdg, shared config, fork bootstrapping, or wants to change how the fork reuses the normal OpenCode setup.
---

# opi launcher config

This skill covers the fork-specific bootstrap and config overlay paths that are not fully contained in repo source files.

## Primary repo files

- `docs/opi-change-tracker.md` - source of truth for how the launcher and overlay were set up
- `.opencode/opencode.jsonc` - repo-local opencode config overrides

## External paths that matter

- `~/.local/bin/opi`
- `/home/ubuntu/workspace/opencode-fork`
- `~/.config/opi-xdg/opencode`
- `~/.config/opi-xdg/opencode/tui.json`
- `~/.config/opi-xdg/opencode/themes/7075.json`

## Working rules

- Prefer reusing the normal OpenCode setup unless the user explicitly asks for isolation.
- Remember that many files in the opi overlay may be symlinked from `~/.config/opencode`.
- Be careful with destructive config changes because this skill often touches the live local setup.
- If the request is actually about theme behavior, also load `opi-theme`.

## Verify

- Confirm the target path exists before editing.
- If the launcher changes, run `opi --help` or the closest safe smoke test available.
