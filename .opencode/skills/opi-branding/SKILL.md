---
name: opi-branding
description: Modify opi branding, naming, or fork presentation. Use whenever the user mentions the opi logo, README presentation, fork messaging, brand copy, or wants to change how the fork is presented without touching package-level upstream docs.
---

# opi branding

This skill covers repo-level opi identity, not upstream package documentation.

## Primary files

- `README.md` - root fork presentation
- `docs/opi-logo.png` - current opi logo asset
- `docs/opi-change-tracker.md` - records major fork-only branding changes

## Working rules

- Prefer the root `README.md` for fork messaging.
- Do not make drive-by changes to package-level `README.md` files unless the user explicitly asks.
- Keep opi copy honest: it is a fork-first workflow tool, not a separate product unless the user decides to position it that way.

## Verify

- Re-read `README.md` for tone and accuracy.
- If assets change, verify the referenced asset path still exists.
