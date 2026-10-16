#!/bin/bash
# Links the widget into Übersicht and installs the Claude Code status line.
# Safe to run more than once.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd -P)"
WIDGETS="$HOME/Library/Application Support/Übersicht/widgets"
LINK="$WIDGETS/claude-widget"
SETTINGS="$HOME/.claude/settings.json"
STATUSLINE="$HOME/.claude/statusline-widget.sh"
PREVIOUS="$HOME/.claude/statusline-previous.sh"

command -v jq >/dev/null || { echo "jq is required (brew install jq)"; exit 1; }
chmod +x "$REPO"/bin/*.sh "$REPO"/statusline/*.sh

# 1. Widget symlink
mkdir -p "$WIDGETS"
if [ -e "$LINK" ] && [ ! -L "$LINK" ]; then
  echo "$LINK exists and is not a symlink; remove it first."; exit 1
fi
ln -sfn "$REPO" "$LINK"
echo "Linked widget: $LINK -> $REPO"

# 2. Status line script
ln -sfn "$REPO/statusline/statusline.sh" "$STATUSLINE"
mkdir -p "$HOME/.claude"
[ -f "$SETTINGS" ] || echo '{}' >"$SETTINGS"

current=$(jq -r '.statusLine.command // empty' "$SETTINGS")
if [ "$current" = "$STATUSLINE" ] || [ "$current" = "~/.claude/statusline-widget.sh" ]; then
  echo "Status line already installed."
else
  if [ -n "$current" ]; then
    # Keep the existing status line's output: our script pipes its input to this wrapper.
    printf '#!/bin/bash\n%s\n' "$current" >"$PREVIOUS"
    chmod +x "$PREVIOUS"
    echo "Kept your existing status line command in $PREVIOUS"
  fi
  cp "$SETTINGS" "$SETTINGS.bak"
  jq --arg cmd "~/.claude/statusline-widget.sh" '.statusLine = ((.statusLine // {}) + {type: "command", command: $cmd})' \
    "$SETTINGS.bak" >"$SETTINGS"
  echo "Status line set in $SETTINGS (backup: $SETTINGS.bak)"
fi

[ -f "$REPO/timetable.json" ] || echo "Note: copy timetable.example.json to timetable.json and fill in your classes."
echo "Done. Übersicht picks up the widget automatically (or use Übersicht > Refresh All Widgets)."
