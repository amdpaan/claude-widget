#!/bin/bash
# Übersicht runs commands with a minimal PATH; add the usual Node locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.local/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd -P)"
exec node "$DIR/data.cjs"
