# claude-widget

A small [Übersicht](https://tracesof.net/uebersicht/) desktop widget for macOS: one dark, translucent card in the middle of your screen that shows:

- **Now Playing**: the current Apple Music track with album art and previous / play-pause / next buttons. Hidden when Music isn't running or nothing is loaded.
- **Classes**: your weekly timetable. Shows the class in progress (progress bar, time left) or the next one (countdown), then the rest of today's classes. After the last class of the day, and on weekends, it shows the next class day instead.
- **System**: CPU usage and RAM used / total.
- **Claude Usage**: your Claude Code 5-hour and weekly rate-limit usage with reset countdowns, plus today's token count and cost from [ccusage](https://github.com/ryoppippi/ccusage).

> **Disclaimer:** This is an unofficial fan project. It is not affiliated with, endorsed by, or supported by Anthropic.

## Requirements

- macOS (built and tested on Apple Silicon)
- [Übersicht](https://tracesof.net/uebersicht/)
- Node.js (Homebrew, Volta, or `/usr/local` installs are found automatically)
- `jq` (included with macOS 15 and later; otherwise `brew install jq`)
- Claude Code with a Claude.ai subscription (Pro / Max / Team) for the rate-limit bars
- Apple Music (optional)

## Setup

```sh
git clone <this repo> ~/Projects/claude-widget
cd ~/Projects/claude-widget
cp timetable.example.json timetable.json   # then edit it with your classes
./install.sh
```

`install.sh`:

1. Symlinks this folder to `~/Library/Application Support/Übersicht/widgets/claude-widget`, so Übersicht loads the widget straight from the repo. The symlink must keep that name, because `widget.jsx` uses it to find its scripts.
2. Symlinks `statusline/statusline.sh` to `~/.claude/statusline-widget.sh` and sets it as Claude Code's `statusLine` in `~/.claude/settings.json`, after backing that file up to `settings.json.bak`.
   If you already had a status line, its command is moved to `~/.claude/statusline-previous.sh`. The new script still prints that command's output unchanged and only adds the step that saves usage data.

Then open Übersicht. The widget appears on its own; if it doesn't, choose **Refresh All Widgets** from Übersicht's menu-bar icon.

### Timetable format

`timetable.json` (git-ignored) has a `classes` array:

```json
{ "day": "Monday", "start": "08:00", "end": "10:00", "code": "ABC101",
  "name": "Course name", "room": "Lab A1", "group": "GRP1A" }
```

- `day`: a full English weekday name.
- `start` and `end`: 24-hour `HH:MM`, read in **Asia/Kuala_Lumpur** time. To use another timezone, change `TZ` in `lib/classes.cjs` and in `bin/ccusage-refresh.sh` / `bin/data.cjs`.
- `room` may be empty, in which case it's hidden. A leading "Makmal", "Bilik" or "Dewan" is dropped to keep it short.

## Permissions

| Permission | Why | Where |
| --- | --- | --- |
| **Automation → Übersicht → Music** | Read the current track and control playback | macOS asks the first time the widget runs while Music is open. If you denied it, enable it in System Settings → Privacy & Security → Automation. |

No other permissions are needed. CPU and RAM come from Node's `os` module and `vm_stat`. Claude data comes from files in `~/.claude`.

## How the Claude usage data works

Claude Code passes `rate_limits` (5-hour and 7-day `used_percentage` and `resets_at`) to the status line command. `statusline/statusline.sh` writes them to `~/.claude/usage.json`, along with an `updated_at` timestamp, and the widget reads that file.

Claude Code only adds `rate_limits` after the session's first API response. Opening Claude Code is not enough: **send at least one message** to refresh `usage.json`. A bar is greyed out once its reset time has passed, until fresh data arrives.

"Today" runs `npx ccusage@20 daily --json --by-agent` in the background, at most once every 5 minutes, and shows only the Claude Code numbers. The first run can take a few seconds while npx downloads ccusage.

Cached data (album art, CPU sample, ccusage output) lives in `~/Library/Caches/claude-widget`.

## Testing

```sh
./bin/data.sh | jq 'del(.music.art)'      # everything the widget sees
node -e 'console.log(require("./lib/classes.cjs").classesStatus(require("./timetable.json"), new Date("2026-10-20T13:15:00+08:00")))'
```

## Uninstall

```sh
rm "$HOME/Library/Application Support/Übersicht/widgets/claude-widget" ~/.claude/statusline-widget.sh
# then remove or restore "statusLine" in ~/.claude/settings.json (backup: settings.json.bak)
```

## License

MIT. See [LICENSE](LICENSE).
