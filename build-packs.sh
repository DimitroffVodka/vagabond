#!/usr/bin/env bash
# Build compendium packs from JSON source files.
# Usage: bash build-packs.sh
# Requires: npx @foundryvtt/foundryvtt-cli (auto-installed via npx)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building compendium packs from JSON sources..."

# Top-level packs
for pack in ancestries classes perks starting-packs creation-notes; do
  echo "  Packing $pack..."
  npx @foundryvtt/foundryvtt-cli package pack "$pack" --in packs/_source/"$pack" --out packs
done

# Items subdirectory packs
for pack in alchemical-items armor gear relics spells weapons; do
  echo "  Packing items/$pack..."
  npx @foundryvtt/foundryvtt-cli package pack "$pack" --in packs/_source/"$pack" --out packs/items
done

# Characters subdirectory packs
for pack in bestiary humanlike; do
  echo "  Packing characters/$pack..."
  npx @foundryvtt/foundryvtt-cli package pack "$pack" --in packs/_source/"$pack" --out packs/characters
done

echo "Done! All packs rebuilt from source."
