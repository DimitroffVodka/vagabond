#!/usr/bin/env bash
# Rebuild the `effects` compendium pack from JSON sources.
#
# Edit JSON files under `packs/_source/effects/` (one file per effect, organized
# into compendium-folder subdirectories), then run this script to rebuild the
# leveldb at `packs/effects/`.
#
# Usage: bash build-effects-pack.sh
# Requires: npx (auto-installs @foundryvtt/foundryvtt-cli on first run)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Stable IDs are baked into source JSONs by the unpack step. Re-running pack
# preserves them. To re-derive IDs from the EFFECT_DEFINITIONS in
# module/helpers/effects-compendium.mjs instead, run populate({ force: true })
# in a Foundry world and then re-unpack with:
#   npx @foundryvtt/foundryvtt-cli@3 package unpack effects \
#     --in <foundry-data>/Data/systems/vagabond/packs \
#     --out packs/_source/effects --type System --id vagabond \
#     --folders --omitVolatile

echo "Packing effects compendium from packs/_source/effects → packs/effects ..."
rm -rf packs/effects
npx --yes @foundryvtt/foundryvtt-cli@3 package pack effects \
  --in packs/_source/effects \
  --out packs \
  --type System \
  --id vagabond \
  --recursive

echo "Done. Verify packs/effects contains: CURRENT, MANIFEST-*, *.log, *.ldb"
ls packs/effects | head -10
