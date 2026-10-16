#!/bin/bash
# Claude Code status line: saves rate-limit data to ~/.claude/usage.json for the
# desktop widget, then prints a status line.
#
# If you had a status line before installing, install.sh saved its command to
# ~/.claude/statusline-previous.sh and its output is printed unchanged.

input=$(cat)

usage="$HOME/.claude/usage.json"
# rate_limits only appears for Claude.ai subscribers, after the session's first API response.
if echo "$input" | jq -e '.rate_limits.five_hour or .rate_limits.seven_day' >/dev/null 2>&1; then
  tmp="$usage.$$.tmp"
  echo "$input" | jq --argjson now "$(date +%s)" '{
      five_hour: .rate_limits.five_hour,
      seven_day: .rate_limits.seven_day,
      updated_at: $now
    }' >"$tmp" 2>/dev/null && mv "$tmp" "$usage" || rm -f "$tmp"
fi

previous="$HOME/.claude/statusline-previous.sh"
if [ -x "$previous" ]; then
  echo "$input" | "$previous"
  exit
fi

# Default output: model · folder · 5h usage
model=$(echo "$input" | jq -r '.model.display_name // empty')
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
five=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
out="$model"
[ -n "$dir" ] && out="$out · ${dir##*/}"
[ -n "$five" ] && out="$out · 5h $(printf '%.0f' "$five")%"
echo "$out"
