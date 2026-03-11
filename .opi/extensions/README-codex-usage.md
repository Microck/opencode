# pi-codex-usage → opi Migration

This is the opi port of [`@calesennett/pi-codex-usage`](https://www.npmjs.com/package/@calesennett/pi-codex-usage).

## What It Does

Shows Codex (and Codex Spark) API usage in the opi footer/status bar:
- 5-hour window usage percentage
- 7-day window usage percentage  
- Reset countdown timer
- Color-coded status based on remaining quota

## Differences from Pi Version

| Feature | Pi Version | opi Version |
|---------|-----------|-------------|
| **Display Mode** | `/codex-usage-mode` command | Environment variable `OPI_CODEX_USAGE_MODE` |
| **Reset Window** | `/codex-usage-reset-window` command | Environment variable `OPI_CODEX_USAGE_WINDOW` |
| **Settings Persistence** | `settings.json` file | Environment variables only |
| **Commands** | Built-in command system | Not available (use env vars) |
| **Auto-refresh** | Every 60 seconds | Every 60 seconds |
| **Model Detection** | `model_select` event | Not implemented (defaults to standard Codex) |

## Installation

Copy this file to your opi extensions directory:

```bash
# Project-local
cp codex-usage.ts ~/.opi/extensions/

# Or global
cp codex-usage.ts ~/.config/opi-xdg/opencode/extensions/
```

## Configuration

Set environment variables before running opi:

```bash
# Display mode: "left" (default) or "used"
export OPI_CODEX_USAGE_MODE=left

# Reset countdown window: "7d" (default) or "5h"
export OPI_CODEX_USAGE_WINDOW=7d
```

Or add to your shell profile:

```bash
echo 'export OPI_CODEX_USAGE_MODE=left' >> ~/.bashrc
echo 'export OPI_CODEX_USAGE_WINDOW=7d' >> ~/.bashrc
```

## Authentication

**IMPORTANT**: This extension requires ChatGPT authentication credentials. The Pi version reads from `~/.pi/agent/auth.json`, but opi doesn't have access to this file.

You'll need to either:

1. **Copy auth file** (if you have Pi installed):
   ```bash
   mkdir -p ~/.opi
   cp ~/.pi/agent/auth.json ~/.opi/codex-auth.json
   ```

2. **Set auth via environment** (not yet implemented - requires extension modification):
   ```bash
   export OPI_CODEX_ACCESS_TOKEN="your-token"
   export OPI_CODEX_ACCOUNT_ID="your-account-id"
   ```

3. **Modify the extension** to read from your preferred auth source

## Status Display

Example outputs:

```
# Mode: left, Window: 7d
Codex 5h:81% left 7d:64% left (7d:↺22h28m)

# Mode: used, Window: 5h
Codex 5h:19% used 7d:36% used (5h:↺3h42m)

# Spark model
Codex Spark 5h:75% left 7d:60% left (7d:↺18h15m)
```

Color coding:
- **Green** (>25% left): Healthy quota
- **Yellow** (10-25% left): Getting low
- **Red** (<10% left): Critical

## Migration Notes

### What Translated Directly

- Usage fetching logic → Same API, same refresh interval
- Status formatting → Nearly identical
- Percentage calculations → Unchanged
- Color-coding logic → Adapted to use theme colors

### What Changed

1. **No Command System**: opi doesn't have Pi's command registration (`pi.registerCommand`). Configuration is via environment variables instead.

2. **No Settings Persistence**: Pi has built-in settings management. opi extensions don't have this yet, so we use env vars.

3. **Event Mapping**:
   - `session_start` → `session.start`
   - `turn_end` → `message.assistant`
   - `session_shutdown` → `session.end`
   - `model_select` → Not available (would need custom implementation)
   - `session_switch` → Not available (could use session.start with logic)

4. **Auth Path**: Changed from Pi's `~/.pi/agent/auth.json` to expecting `~/.opi/codex-auth.json`

5. **UI API**: 
   - `ctx.ui.setStatus(id, text)` → `opi.ui.setStatus(key, text)`
   - `ctx.ui.notify(text, type)` → `opi.ui.notify({ message, variant })`

### What's Missing

- Interactive commands (`/codex-usage-mode`, `/codex-usage-reset-window`)
- Settings persistence across sessions
- Tab completion for commands
- Model-specific usage (requires `model_select` event equivalent)

### Future Improvements

To achieve full parity with the Pi version:

1. **Add Tool Registration**: opi supports `opi.registerTool()` - could expose mode/window switching as tools
2. **Add Settings API**: opi could add a settings persistence API similar to Pi
3. **Add Command API**: opi could add a command registration system
4. **Model Detection**: opi would need to expose model selection events

## Files Changed

- Created: `.opi/extensions/codex-usage.ts`
- Created: `.opi/extensions/README-codex-usage.md` (this file)

## Testing

1. Ensure you have auth credentials available
2. Set environment variables if you want non-default modes
3. Launch opi in a project with this extension
4. Look for the Codex status in the footer

## Troubleshooting

**Status shows "Codex unavailable"**
- Check that auth credentials are accessible
- Verify you have internet connectivity
- Check the API endpoint is reachable

**Status not appearing**
- Make sure the extension file is in the correct location
- Check opi logs for loading errors
- Verify `opi.extensions` is enabled

**Wrong model shown**
- Spark model detection requires model selection events
- Currently defaults to standard "Codex" label
