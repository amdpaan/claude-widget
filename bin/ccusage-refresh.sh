#!/bin/bash
# Background refresh of today's ccusage numbers. Usage: ccusage-refresh.sh <out-file> <lock-file>
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/bin:$PATH"
out="$1"
lock="$2"
trap 'rm -f "$lock"' EXIT

today=$(TZ=Asia/Kuala_Lumpur date +%Y%m%d)
tmp="$out.$$.tmp"
if npx -y ccusage@20 daily --json --by-agent --since "$today" -z Asia/Kuala_Lumpur >"$tmp" 2>/dev/null &&
  jq -e . "$tmp" >/dev/null 2>&1; then
  mv "$tmp" "$out"
else
  rm -f "$tmp"
  # Keep the old result but stop retrying for another TTL period.
  [ -f "$out" ] && touch "$out"
fi
