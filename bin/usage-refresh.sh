#!/bin/bash
# Background refresh of the 5-hour / weekly rate limits, so the widget doesn't depend
# on a Claude Code CLI session running the status line. Usage: usage-refresh.sh <usage-file> <lock-file>
#
# Reads Claude Code's OAuth token from the macOS Keychain and calls the (undocumented)
# endpoint behind Claude Code's /usage command. The token is never written to disk,
# printed, or passed on a command line. If anything fails, the old usage file is kept.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
out="$1"
lock="$2"
trap 'rm -f "$lock"' EXIT

token=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null |
  jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
[ -n "$token" ] || exit 0

tmp="$out.$$.tmp"
# Header comes from stdin (-H @-) so the token doesn't show up in `ps`.
printf 'Authorization: Bearer %s\n' "$token" |
  curl -sf -m 15 https://api.anthropic.com/api/oauth/usage \
    -H @- -H "anthropic-beta: oauth-2025-04-20" 2>/dev/null |
  jq -e --argjson now "$(date +%s)" '
    select(.five_hour.utilization != null or .seven_day.utilization != null) |
    def win: if . and .utilization != null then { used_percentage: .utilization, resets_at } else null end;
    { five_hour: (.five_hour | win), seven_day: (.seven_day | win), updated_at: $now, source: "api" }
  ' >"$tmp" 2>/dev/null && mv "$tmp" "$out" || rm -f "$tmp"
