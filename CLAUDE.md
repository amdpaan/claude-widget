# claude-widget

Übersicht desktop widget (macOS, Apple Silicon): Now Playing (Apple Music), This Week in Music, class timetable, Home Network (net-watch), CPU/RAM, Claude Code usage. See README.md for user-facing docs.

## Layout

- `widget.jsx`: the only widget file, with UI and styles. Übersicht loads it through the symlink `~/Library/Application Support/Übersicht/widgets/claude-widget` → this repo. The command path depends on that symlink name.
- `bin/data.sh`: Übersicht runs it every 2 s. It adds Node locations to PATH, then runs `bin/data.cjs`. On battery it reuses the last output for `BATTERY_INTERVAL` (10 s); `--force` skips that (the music buttons use it).
- `bin/data.cjs`: collects everything and prints one JSON object: `music`, `wrapped`, `netwatch`, `classes`, `system`, `claude`.
- `wrapped` reads `~/Library/Application Support/music-wrapped/summary.json` (written by the separate music-wrapped repo after each play/report). If its `week_start` isn't this week's Monday, it reports zeros instead of last week's data. Shows the top song's cover (`artwork/<pid>.jpg` from the music-wrapped data folder, as a data URI), minutes, a Mon–Sun minutes chart (`daily_minutes`, today highlighted), top artist, top song and top genre. All newer fields may be missing in older summary files. The section is hidden when the file doesn't exist. Clicking it opens the music-wrapped home page (`reports/index.html`, falling back to `reports/weekly/latest.html`); the user asked for the home page instead of the weekly report (17 Oct 2026).
- `netwatch` (data) reads `~/Library/Application Support/net-watch/summary.json`, written by the separate, private net-watch repo after each scan of the user's home network: `online, known, unknown, new_today, last_scan` (epoch s), `on_home_network` (bool or null), `generated_at`. Known = labeled by the user. `dashboard` is `http://127.0.0.1:8765/` only when `~/Library/LaunchAgents/com.netwatch.serve.plist` exists (otherwise there may be no server, so clicking does nothing). Hidden when the file doesn't exist. net-watch is private, so the public README names it without a link.
- `NetWatch` (section; added 17 Oct 2026 at the user's request, restyled the same day to match net-watch's redesigned dashboard): `Pip`, net-watch's original pixel owl (16×16 `PIP` map drawn as SVG rects in the dashboard's dark-mode colours; static, no animation), in a mood: `away` when off-home or the last scan is > 30 min old, `alert` when `newToday` > 0, else `idle`. Then a serif headline ("All quiet at home", "1 new device today", "Away from home", "Not scanning right now") and three tinted cards (online `#7bc28e`, known `#78a6d6`, unknown `#d9ae55`) that get the shared `stale` style when the counts are old. **Pip's art also lives in net-watch** (`netwatch/web/app.js` `OWL`); keep the two in sync.
- Section order in `render`: Now Playing, This Week in Music, Classes, Home Network, System, Claude Usage. Optional sections (Now Playing, This Week in Music, Home Network) are hidden when their data is missing.
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
# A section with fake data: point HOME at a scratch folder holding e.g. Library/Application Support/net-watch/summary.json
HOME=<scratch> CLAUDE_WIDGET_CACHE=<scratch>/cache node bin/data.cjs | jq .netwatch
```

Visual checks: there's no Chrome, and Übersicht only shows real data. Render `widget.jsx` in a scratch HTML page instead: React 18 + ReactDOM + Babel standalone (UMD from cdnjs), a tiny `css` tagged-template shim standing in for `uebersicht` (it must expand `& + &`), strip the `import`/`export` lines, then call `render({data}, () => {})` with fake data (e.g. from the URL hash). Screenshot it with a small WKWebView tool. Check each state of the section you changed (e.g. Home Network: normal, new device, away).

## Git / privacy

- `timetable.json` is personal and git-ignored; `timetable.example.json` holds fake data. Never commit real course codes, rooms, or group names.
- Commit with the GitHub noreply email set in this repo's git config, not a personal email. No absolute `/Users/...` paths in tracked files; use `$HOME` or `~`.
- Remote: `origin` → github.com/amdpaan/claude-widget (public), branch `main`. **Ask before pushing.** Before a push, check only the added lines, as its own step: `git diff origin/main..HEAD | grep '^+' | grep -i -E 'gmail|/Users/|192\.168\.|token'` (anything found stops the push), and check `git log origin/main..HEAD --format='%ae'` is the noreply address.
- This file is tracked and public: keep personal details (real devices, addresses, timetable contents) out of it.
- Unofficial fan project: don't use Claude/Anthropic logos or Anthropic's mascot. The pixel characters here (Pip from net-watch) are original.
