#!/bin/bash
# Übersicht runs this every 2 seconds. On battery, reuse the last output for up to
# BATTERY_INTERVAL seconds so Node only starts every 10 seconds.
# Pass --force (used after the music buttons) to always collect fresh data.
BATTERY_INTERVAL=10

CACHE="${CLAUDE_WIDGET_CACHE:-$HOME/Library/Caches/claude-widget}"
LAST="$CACHE/last-output.json"

if [ "$1" != "--force" ] && [ -f "$LAST" ] &&
  [ $(($(date +%s) - $(stat -f %m "$LAST"))) -lt "$BATTERY_INTERVAL" ] &&
  pmset -g ps | head -1 | grep -q "Battery Power"; then
  cat "$LAST"
  exit
fi

# Übersicht runs commands with a minimal PATH; add the usual Node locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd -P)"
out=$(node "$DIR/data.cjs") || exit $?
mkdir -p "$CACHE"
printf '%s' "$out" >"$LAST.$$" && mv "$LAST.$$" "$LAST"
printf '%s' "$out"
