#!/usr/bin/env bash
# sync-shared.sh — show drift between tunnelmind-site and alloy-site shared files,
# with optional --apply flag to copy a specific file.
#
# Usage:
#   ./scripts/sync-shared.sh            # show diffs only
#   ./scripts/sync-shared.sh --apply    # interactively apply each changed file

set -euo pipefail

SITE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ALLOY_ROOT="${ALLOY_SITE:-$(cd "$SITE_ROOT/../alloy-site" && pwd)}"

if [[ ! -d "$ALLOY_ROOT" ]]; then
  echo "ERROR: alloy-site not found at $ALLOY_ROOT"
  echo "Set ALLOY_SITE=/path/to/alloy-site to override."
  exit 1
fi

# Files that should stay in sync (source: tunnelmind-site, dest: alloy-site)
declare -A PAIRS=(
  ["src/lib/supabase.js"]="src/lib/supabase.js"
  ["src/components/shared/TopNav.jsx"]="src/components/shared/TopNav.jsx"
)

APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

DRIFTED=0

for SRC_REL in "${!PAIRS[@]}"; do
  DEST_REL="${PAIRS[$SRC_REL]}"
  SRC="$SITE_ROOT/$SRC_REL"
  DEST="$ALLOY_ROOT/$DEST_REL"

  if [[ ! -f "$SRC" ]]; then
    echo "SKIP $SRC_REL — not found in tunnelmind-site"
    continue
  fi

  if [[ ! -f "$DEST" ]]; then
    echo "NEW  $DEST_REL — missing in alloy-site"
    DRIFTED=$((DRIFTED + 1))
    if $APPLY; then
      cp "$SRC" "$DEST"
      echo "     → copied"
    fi
    continue
  fi

  if diff -q "$SRC" "$DEST" > /dev/null 2>&1; then
    echo "OK   $SRC_REL"
  else
    echo "DIFF $SRC_REL"
    diff --color=always "$SRC" "$DEST" || true
    DRIFTED=$((DRIFTED + 1))
    if $APPLY; then
      read -rp "     Copy tunnelmind-site → alloy-site? [y/N] " yn
      if [[ "${yn,,}" == "y" ]]; then
        cp "$SRC" "$DEST"
        echo "     → copied"
      fi
    fi
  fi
done

echo ""
if [[ $DRIFTED -eq 0 ]]; then
  echo "✓ All shared files in sync."
else
  echo "⚠ $DRIFTED file(s) differ."
  $APPLY || echo "  Run with --apply to interactively sync."
fi

# Note: auth.js is intentionally NOT synced here.
# tunnelmind-site has GitHub OAuth + tier detection; alloy-site has a simpler
# version. Sync manually after reviewing:
#   diff tunnelmind-site/src/lib/auth.js alloy-site/src/lib/auth.js
# tierDetection.js IS synced (see PAIRS above) — tier logic must stay identical.

exit $(( DRIFTED > 0 ? 1 : 0 ))
