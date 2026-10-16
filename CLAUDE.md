# claude-widget

Übersicht desktop widget (macOS, Apple Silicon): Now Playing (Apple Music), class timetable, CPU/RAM, Claude Code usage. See README.md for user-facing docs.

## Layout

- `widget.jsx`: the only widget file, with UI and styles. Übersicht loads it through the symlink `~/Library/Application Support/Übersicht/widgets/claude-widget` → this repo. The command path depends on that symlink name.
- `bin/data.sh`: Übersicht runs it every 2 s. It adds Node locations to PATH, then runs `bin/data.cjs`. On battery it reuses the last output for `BATTERY_INTERVAL` (10 s); `--force` skips that (the music buttons use it).
- `bin/data.cjs`: collects everything and prints one JSON object: `music`, `wrapped`, `classes`, `system`, `claude`.
- `wrapped` reads `~/Library/Application Support/music-wrapped/summary.json` (written by the separate music-wrapped repo after each play/report). If its `week_start` isn't this week's Monday, it reports zeros instead of last week's data. The section is hidden when the file doesn't exist.
- `bin/ccusage-refresh.sh`: background `npx ccusage@20 daily --json --by-agent`, at most every 5 min. Only the `claude` agent row is used.
- `lib/classes.cjs`: timetable logic, always in Asia/Kuala_Lumpur time. Shows current / next / "Next: Tomorrow|<Weekday>".
- `bin/usage-refresh.sh`: background rate-limit refresh when `usage.json` is over 3 min old. Reads the Claude Code OAuth token from Keychain and calls the undocumented `api.anthropic.com/api/oauth/usage`. Never print, log, or put the token in argv (curl gets it via `-H @-`).
- `statusline/statusline.sh`: Claude Code status line. Saves `rate_limits` to `~/.claude/usage.json` (only when that session's `rate_limits` changed since its last save; per-session copies in `~/Library/Caches/claude-widget/statusline/`) and passes through to `~/.claude/statusline-previous.sh` if it exists.
- `install.sh`: creates the symlinks and sets `statusLine` in `~/.claude/settings.json` (the command uses `~`, not an absolute path).

## Rules learned the hard way

- **No `backdrop-filter`** on the card. In Übersicht's WebKit it flickers on every re-render. Use a plain rgba background.
- **Helper scripts must not end in `.js`/`.jsx`/`.coffee`.** Übersicht loads those as widgets. Use `.cjs` or `.sh`.
- **Cache goes in `~/Library/Caches/claude-widget`**, never inside the repo. Writing files in the widgets folder every 2 s can trigger reloads.
- **Übersicht reloads on file save.** No restart needed. If no widgets are listed at all, its Node server didn't start: kill the app by PID and reopen it.
- **`rate_limits`** (`five_hour` / `seven_day`, each with `used_percentage` and `resets_at` in epoch seconds) only appear in status line input after the session's first API response, and only in CLI sessions (the desktop app doesn't run the status line). That's why `usage-refresh.sh` exists.
- **Music artwork** is exported once per track via AppleScript, resized with `sips`, and sent as a data URI.

## Testing

```sh
./bin/data.sh --force | jq 'del(.music.art)'
node -e 'console.log(require("./lib/classes.cjs").classesStatus(require("./timetable.json"), new Date("2026-10-20T13:15:00+08:00")))'
curl -s http://127.0.0.1:41416/state/ | jq '.widgets | keys'   # widgets Übersicht has loaded
```

## Git / privacy

- `timetable.json` is personal and git-ignored; `timetable.example.json` holds fake data. Never commit real course codes, rooms, or group names.
- Commit with the GitHub noreply email set in this repo's git config, not a personal email. No absolute `/Users/...` paths in tracked files; use `$HOME` or `~`.
- Remote: `origin` → github.com/amdpaan/claude-widget (public), branch `main`.
- Unofficial fan project: don't use Claude/Anthropic logos.
