# claude-widget

A small [Übersicht](https://tracesof.net/uebersicht/) desktop widget for macOS: one dark, translucent card in the middle of your screen that shows:

- **Now Playing**: the current Apple Music track with album art and previous / play-pause / next buttons. Stays visible while paused; hidden when Music isn't running or nothing is loaded.
- **This Week in Music**: the cover of your top song, minutes listened with a Mon–Sun mini chart, plays, top artist, top song and top genre this week, from [music-wrapped](https://github.com/amdpaan/music-wrapped). Click it to open the Music Wrapped home page (this week so far and every report). Hidden if music-wrapped isn't installed.
- **Classes**: your weekly timetable. Shows the class in progress (progress bar, time left) or the next one (countdown), then the rest of today's classes. After the last class of the day, and on weekends, it shows the next class day instead (e.g. "Next: Tomorrow 8:00 AM, ABC101" or "Next: Monday 8:00 AM, ABC101").
- **Home Network**: styled after the net-watch dashboard. Its pixel owl Pip shows the mood (keeping watch, "!" for a new device, asleep when you're away), with a one-line headline such as "All quiet at home" and tinted cards for devices online, known (labeled) and unknown. It comes from [net-watch](https://github.com/amdpaan/net-watch), a separate home network scanner. Click it to open the net-watch dashboard (when its login agent is installed). The counts fade when they're older than 30 minutes, e.g. away from home. Hidden if net-watch isn't installed.
- **Wi-Fi Heatmap**: your study spots from [wifi-heatmap](https://github.com/amdpaan/wifi-heatmap), a separate campus Wi-Fi logger. Its pixel antenna-bot shows the mood (sparking in a great spot, drooping in a dead zone) with its chest bars lit by the signal. While you log a place it shows the live signal, ping and loss; otherwise the best spot with its score and the dead zones. Click it to open the wifi-heatmap dashboard (when its login agent is installed). Hidden if wifi-heatmap isn't installed.
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
- [music-wrapped](https://github.com/amdpaan/music-wrapped) (optional, for This Week in Music)
- [net-watch](https://github.com/amdpaan/net-watch) (optional, for Home Network)
- [wifi-heatmap](https://github.com/amdpaan/wifi-heatmap) (optional, for Wi-Fi Heatmap)

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
- `room` may be empty for an online class; the widget then shows "Online". A leading "Makmal", "Bilik" or "Dewan" is dropped to keep it short.

## Permissions

| Permission | Why | Where |
| --- | --- | --- |
| **Automation → Übersicht → Music** | Read the current track and control playback | macOS asks the first time the widget runs while Music is open. If you denied it, enable it in System Settings → Privacy & Security → Automation. |

No other permissions are needed. CPU and RAM come from Node's `os` module and `vm_stat`. Claude data comes from files in `~/.claude`, plus Claude Code's login token in the Keychain for the background usage refresh. macOS may ask once whether `security` can access it.

## How the Claude usage data works

The widget reads `~/.claude/usage.json`, which gets written in two ways:

1. **Status line.** Claude Code passes `rate_limits` (5-hour and 7-day `used_percentage` and `resets_at`) to the status line command, and `statusline/statusline.sh` saves them. This only happens in terminal `claude` sessions, after the session's first API response. A redraw that carries the same numbers as that session's last save is skipped, so an idle session can't mark old numbers as just updated.
2. **Background refresh.** When the data is more than 3 minutes old, `bin/usage-refresh.sh` reads Claude Code's login token from the macOS Keychain (`Claude Code-credentials`) and calls `api.anthropic.com/api/oauth/usage`, the endpoint behind Claude Code's `/usage` command. This keeps the bars current when you use the desktop app or aren't using Claude at all. The token is never saved, printed, or passed on a command line, and it is only sent to `api.anthropic.com`. The endpoint is undocumented and may change. If the call fails, the old data stays and the "updated … ago" label shows how old it is.

A bar is greyed out once its reset time has passed, until fresh data arrives.

"Today" runs `npx ccusage@20 daily --json --by-agent` in the background, at most once every 5 minutes, and shows only the Claude Code numbers. The first run can take a few seconds while npx downloads ccusage.

Cached data (album art, CPU sample, ccusage output) lives in `~/Library/Caches/claude-widget`.

## Battery and resources

- **Plugged in:** data refreshes every 2 seconds.
- **On battery:** `bin/data.sh` reuses its last output for up to 10 seconds, so Node starts at most every 10 seconds. The skipped runs cost about 0.01 s of CPU each. Pressing a music button always fetches fresh data. To change the interval, edit `BATTERY_INTERVAL` in `bin/data.sh`.
- **Memory:** Übersicht uses about 200 MB in total (app, background server and web view). Each data run peaks at about 50 MB for about 0.2 s, then exits.

## Customising

- **Position**: edit `top` / `right` in `className` at the top of `widget.jsx`. The default is the top-right corner, just under the menu bar (`top: 48px; right: 16px;`). To center it instead, use `top: 50%; left: 50%; transform: translate(-50%, -50%);`.
- **Transparency**: change the alpha in the `card` background (`rgba(24, 24, 28, 0.85)`).
- The card deliberately has no `backdrop-filter` blur. In Übersicht's WebKit, the blur flickers on and off when the card re-renders every 2 seconds.

Übersicht reloads the widget automatically when you save a file, so there's no need to restart it.

## Troubleshooting

- **No widgets listed, and "Open Widgets Folder" does nothing**: Übersicht's background server didn't start. Quit Übersicht (use Activity Monitor if it won't quit) and open it again.
- **This Week in Music doesn't appear**: it needs `~/Library/Application Support/music-wrapped/summary.json`. Install music-wrapped, or run `music-wrapped summary` to create the file.
- **Home Network doesn't appear**: it needs `~/Library/Application Support/net-watch/summary.json`, which net-watch writes after each scan of your home network. Run `netwatch scan` at home once.
- **Wi-Fi Heatmap doesn't appear**: it needs `~/Library/Application Support/wifi-heatmap/summary.json`, which wifi-heatmap writes while you log a place. Run `wifi-heatmap summary` once.
- **Now Playing never appears**: allow Übersicht to control Music in System Settings → Privacy & Security → Automation.
- **Claude bars say "no data" or stay stale**: run `./bin/usage-refresh.sh ~/.claude/usage.json /tmp/x.lock` and check `~/.claude/usage.json`. If that does nothing, sign in to Claude Code again (the token may have expired) or send a message in a terminal `claude` session.

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
