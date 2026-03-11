# pi-codex-usage → opi Migration

This is the opi port of [`@calesennett/pi-codex-usage`](https://www.npmjs.com/package/@calesennett/pi-codex-usage).

## What It Does

Shows Codex (and Codex Spark) API usage in the opi footer with auto-refresh every 60 seconds:
- 5-hour window usage percentage
- 7-day window usage percentage  
- Reset countdown timer
- Color-coded status based on remaining quota

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/codex-usage-mode` | `left`, `used`, or `toggle` | Change display mode |
| `/codex-usage-reset-window` | `5h`, `7d`, or `toggle` | Change reset countdown window |

### Tab Completion

Both commands support tab completion for their arguments:
- Type `/codex-usage-mode ` then press Tab to see options
- Type `/codex-usage-reset-window ` then press Tab to see options

## Installation

Copy this file to your opi extensions directory:

```bash
# Project-local
cp codex-usage.ts ~/.opi/extensions/

# Or global
cp codex-usage.ts ~/.config/opi-xdg/opencode/extensions/
```

## Configuration

Commands are interactive - no environment variables needed! Just type the command and use tab completion.

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
- Commands → Now using opi's `registerCommand` API with tab completion!

### What Changed

1. **Command System**: Pi's `pi.registerCommand()` → opi's `opi.registerCommand()` ✅ Now working!
2. **Settings Persistence**: Not yet implemented (commands are stateful but don't persist)
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

### What's New in opi

- ✅ **Interactive Commands**: Full command support with `/command-name args` syntax
- ✅ **Tab Completion**: Command arguments show completions when you press Tab
- ✅ **Real-time Updates**: Commands immediately update the status display

### What's Missing

- Settings persistence across sessions (commands work but don't save state)
- Model-specific usage (requires `model_select` event equivalent)

### Future Improvements

To achieve full parity with the Pi version:

1. **Add Settings Persistence**: Save command state to a file
2. **Add Model Detection**: opi would need to expose model selection events

## Files Changed

- Created: `.opi/extensions/codex-usage.ts`
- Created: `.opi/extensions/README-codex-usage.md` (this file)

## Testing

1. Ensure you have auth credentials available
2. Launch opi in a project with this extension
3. Try commands:
   - Type `/codex-usage-mode ` and press Tab to see completions
   - Type `/codex-usage-mode left` to set mode
   - Type `/codex-usage-mode toggle` to flip between modes
   - Type `/codex-usage-reset-window ` and press Tab to see completions
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

**Commands not working**
- Make sure you're typing the full command with `/` prefix
- Check that the extension loaded without errors
- Try `/help` to see available commands

**Wrong model shown**
- Spark model detection requires model selection events
- Currently defaults to standard "Codex" label
