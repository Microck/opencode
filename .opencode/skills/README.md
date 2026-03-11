# opi repo skills

These repo-local skills help OpenCode route opi-specific requests to the right files.

- `opi-pointer` - first stop for generic opi requests; routes to the narrower skills
- `opi-header` - session header and header slots
- `opi-footer` - footer/status bar and status-slot rendering
- `opi-sidebar` - session sidebar layout, widgets, and migrated built-ins
- `opi-session-surface` - low-level surface slots, ordering, add/move/hide/replace behavior
- `opi-extensions` - opi extension loader, runtime, events, tools, docs, and examples
- `opi-widgets` - extension widgets, status items, render helpers, and footer/sidebar projection
- `opi-events` - extension event hooks and bus wiring for session, message, and tool lifecycle events
- `opi-tools` - extension tool registration, overrides, and tool registry integration
- `opi-theme` - fork-only theme work, especially the 7075 theme path and theme registry
- `opi-branding` - README, logo, and opi-specific presentation
- `opi-launcher-config` - launcher, XDG overlay, and fork-specific config setup

These live under `.opencode/skills/` so the repo can auto-discover them without extra config.
