# Changelog

## Countdown Dice & Burning/Status System (Phase 1 + 2)

### New Features

#### Weapon Properties: Burning & Status
- **New "Burning" weapon property** — weapons can now apply a Burning countdown die on hit. The die rolls each round, dealing its result as damage (fire, acid, poison, etc.) to the target.
- **New "Status" weapon property** — weapons can now apply a status condition (Blinded, Dazed, Frightened, etc.) on hit, tracked by a countdown die that removes the condition when it expires.
- **Combined Burning + Status** — a single weapon can have both properties. One shared countdown die tracks both the burning damage and the status condition, removing both when it expires.
- **On-Hit Effects UI** — selecting Burning or Status on a weapon reveals a new configuration section:
  - **Countdown Die** dropdown (d4–d12) — shared between Burning and Status
  - **Burning Damage Type** dropdown (Fire, Acid, Shock, Poison, Cold, Necrotic, Psychic, Magical) — only visible when Burning is selected
  - **On-Hit Status** dropdown (15 conditions) — only visible when Status is selected
- **Relic Power support** — `onHitBurningDice` schema field on characters allows Active Effects from relics to grant on-hit burning (falls back to fire damage type).

#### Countdown Dice: Combat Integration
- **Auto-roll at round start** — all countdown dice (burning and plain timers) automatically roll when the GM advances to the next round. No more forgetting to roll tracking dice.
- **Burning damage on roll** — when a linked burning die rolls, it deals its result as damage through the full damage pipeline (respects armor, immunities, weaknesses). A chat card shows the breakdown.
- **Die expiry cleanup** — when a burning/status die expires (d4 rolls 1), the linked status conditions are automatically removed from the target token.
- **Combat end cleanup** — ending combat deletes all countdown dice and removes their linked statuses. A notification confirms the cleanup.
- **NPC death cleanup** — when an NPC drops to 0 HP, any countdown dice linked to that NPC are automatically deleted and their statuses removed.
- **Duplicate prevention** — hitting a target that's already burning with the same damage type upgrades the existing die (d4 to d6) instead of creating a duplicate. Different damage types create separate dice.

### Technical Details

#### Files Modified (9 files, +718 lines)

| File | Changes |
|------|---------|
| `module/ui/countdown-dice-overlay.mjs` | Added `_cleanupLinkedEffects()`, `_applyLinkedDamage()`, `skipAnimation` param to `_onRollDice()`, cleanup on delete |
| `module/documents/combat.mjs` | Added `endCombat()` override, enhanced `nextRound()`, added `_autoRollAllCountdownDice()`, `_cleanupAllCountdownDice()`, `cleanupDiceForToken()` |
| `module/helpers/damage-helper.mjs` | Added `checkOnHitBurning()`, `_applyBurningDie()`, `_applyStatusDie()`, wired into save-based and direct damage application |
| `module/helpers/config.mjs` | Added `burningDamageTypes`, `spellEffectTypes`, `onHitStatusConditions`, "Burning"/"Status" to `weaponProperties` + `weaponPropertyHints` |
| `module/vagabond.mjs` | Added `updateActor` hook for NPC death — auto-marks defeated, applies dead status, cleans up linked dice |
| `module/data/actor-character.mjs` | Added `onHitBurningDice` StringField for relic power Active Effects |
| `templates/item/details-parts/equipment-details.hbs` | Added On-Hit Effects UI section with conditional Burning/Status dropdowns |
| `lang/en.json` | Added "Burning" and "Status" entries for Property names and PropertyHints |
| `.gitignore` | Added LevelDB pack exclusions (prevents tracking runtime database files) |

#### Data Flow
```
Weapon Hit → checkOnHitBurning() → _applyBurningDie() / _applyStatusDie()
  → Creates CountdownDice JournalEntry with linkedStatusEffect flag
  → Applies status to target token
  → Posts chat card

Round Start → _autoRollAllCountdownDice() → _onRollDice(dice, skipAnimation=true)
  → _applyLinkedDamage() deals burning damage through calculateFinalDamage()
  → On roll of 1: shrinks die or deletes + _cleanupLinkedEffects()

Combat End → _cleanupAllCountdownDice() → deletes all dice, removes all statuses
NPC Death → cleanupDiceForToken() → deletes linked dice, removes statuses
```

#### Flag Structure
```javascript
// On the CountdownDice JournalEntry:
flags.vagabond.linkedStatusEffect = {
  status: 'burning',           // Primary status condition
  label: 'Burning (Fire)',     // Display label
  damageType: 'fire',          // Damage type for burning
  statusCondition: 'dazed',    // Additional status (Burning+Status combo)
  tokenIds: ['tokenId123'],    // Linked target token IDs
  sceneId: 'sceneId456'        // Scene where targets exist
}

// On the weapon item:
flags.vagabond.onHitBurning = {
  dieType: 'd6',               // Countdown die size
  damageType: 'fire',          // Burning damage type
  statusCondition: 'dazed'     // On-hit status condition
}
```

### Bug Fixes
- **Fixed race condition in auto-roll** — countdown dice that expired during auto-roll (d4 rolling 1) previously caused `JournalEntry does not exist` errors because the 2500ms animation delay conflicted with the sequential roll loop. Auto-roll now uses `skipAnimation=true` to apply changes immediately.
