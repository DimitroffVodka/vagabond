# Vagabond System Changelog — V14 Migration & Features

## V14 Compatibility Fixes

### Active Effect Modes (config.mjs, item-perk.mjs, level-up-dialog.mjs)
- Replaced all `CONST.ACTIVE_EFFECT_MODES.X` numeric constants with V14 string-based change types (`"add"`, `"override"`, `"multiply"`, `"custom"`, `"subtract"`, `"downgrade"`, `"upgrade"`) across ~40 locations
- Updated `item-perk.mjs` `effectMode` field from `NumberField` to `StringField` with string choices
- Added `migrateData()` to `item-perk.mjs` to convert old numeric mode values to strings

### Active Effect Phasing Fix (actor.mjs)
- **Root cause**: V14 introduced phased AE application ("initial" and "final" phases) with tracking via `_completedActiveEffectPhases`. The Vagabond `prepareBaseData()` override did not call `super.prepareBaseData()`, which skipped V14's `_clearData()` that resets the phase tracking Set between `prepareData()` cycles.
- **Fix**: Added `super.prepareBaseData()` call — resolves "ActiveEffect application phase already completed" errors that broke actor creation, character builder preview actors, and all data preparation.

### Active Effect Change Type (actor.mjs)
- Updated `getRollDataWithItemEffects()` to use V14's `change.type` (string) instead of deprecated `change.mode` (numeric). Without this fix, on-use item effects (weapon-specific bonuses) silently failed because string switch cases never matched numeric mode values.

### Item Sheet Lock Toggle Fix (item-sheet.mjs)
- Removed pre-submit `this.submit()` call from `_onToggleLock` that caused V14 validation errors ("VagabondItem must be constructed with a DataModel or Object"). V14's stricter `cleanData` validation during form submission was incompatible with the programmatic submit. The lock toggle now directly updates the locked field.

## New Features

### Brutal Weapon Property (item.mjs)
- Implemented the Brutal property: on critical hits, adds 1 extra damage die matching the weapon's die size to the damage formula
- Located in `rollDamage()` after the crit stat bonus section
- Reads die size from `weapon.system.currentDamage` (e.g., d8 weapon adds +1d8 on crit)

### Cleave Weapon Property (chat-card.mjs, damage-helper.mjs)
- Implemented the Cleave property: when 2+ targets are selected, deals half damage to each target
- With 1 target: full damage as normal
- **chat-card.mjs**: Detects Cleave + 2+ targets in `createActionCard()`, passes `isCleave` flag to damage buttons. Adds "Cleave (half dmg each)" tag to the chat card in `weaponAttack()`.
- **damage-helper.mjs**: `createSaveButtons()` encodes `data-cleave="true"` on all damage/save buttons. Smart damage distribution via `_distributeCleave()`: ceil half goes to the lower-HP target (capped at their current HP to avoid overkill waste), floor half to the other, preserving total damage. Armor/saves applied independently to each share.

### Brawl & Grapple/Shove System (roll-handler.mjs, chat-card.mjs, vagabond.mjs, actor-character.mjs, active-effect.mjs)
- **Pre-roll intent dialog**: Brawl weapons show Damage/Grapple/Shove choice before rolling. Shield weapons show Damage/Shove only. Intent declared pre-roll so traits like Beefy can grant Favor.
- **Size check**: Grapple/Shove only available against targets your size or smaller (small → medium → large → huge → giant → colossal)
- **Grapple**: On hit, applies Restrained condition to target. No damage dealt.
- **Shove**: On hit, shows Push 5' / Prone buttons in chat card. Push calculates direction away from attacker and moves token 1 grid square. Prone applies the Prone condition.
- **Orc Beefy trait support**: Added `system.brawlCheckFavor` BooleanField + AE attribute choice. When true, Grapple/Shove checks automatically gain Favor.
- **Shield Shove**: Shield weapons get a Damage/Shove pre-roll dialog (no Grapple option).
- **Fisticuffs (Pugilist)**: Added `system.fisticuffs` BooleanField + AE attribute choice. When true and attack had Favor: post-hit Grapple/Shove buttons appear alongside the damage button, allowing the player to choose after seeing the hit.
- **chat-card.mjs**: Shows Grapple/Shove intent tag. Applies Restrained on grapple hit. Shows Push/Prone buttons on shove hit. Fisticuffs post-hit buttons when conditions met.
- **vagabond.mjs**: Handlers for Push 5', Prone, and Fisticuffs Grapple/Shove buttons.

### Vanguard Shove Size Override (actor-character.mjs, roll-handler.mjs)
- Added `system.shoveSizeOverride` StringField + AE attribute choice. Auto-detected from class features containing "considered Large for Shoves" (Level 4) or "considered Huge for Shoves" (Level 8).
- Shove size checks use `Math.max(realSize, shoveSizeOverride)` so Vanguard can shove creatures up to their override size. Grapple still uses real size.

### NPC Status Immunities for Grapple/Shove (chat-card.mjs, vagabond.mjs)
- All Grapple and Shove handlers now check `targetActor.system.statusImmunities` before applying Restrained or Prone.
- Immune targets show a shield icon message (e.g., "Floating Eye is immune to Prone!") instead of applying the condition.
- Applied to: direct Brawl Grapple, direct Brawl Prone, Fisticuffs Grapple, and Fisticuffs Shove handlers.

### Prone Melee-Only Fix (actor-character.mjs, item.mjs, config.mjs)
- Added `system.incomingMeleeAttacksModifier` StringField. Prone now uses this instead of the global `incomingAttacksModifier`, so only melee attacks get Favor against prone targets (not ranged).
- Updated Prone status effect in config.mjs to use `system.incomingMeleeAttacksModifier` with `type: "override"`.
- Updated `rollAttack()` in item.mjs to only check the melee modifier when `this.system.range === 'close'`.

### Bully Perk (actor-character.mjs, roll-handler.mjs, chat-card.mjs, vagabond.mjs, active-effect.mjs)
- **Perk detection**: Added `system.hasBully` BooleanField. Auto-detected from perk items named "Bully" via `_detectTraitAndFeatureFlags()`.
- **Conditional Favor**: Bully grants Favor on Grapple/Shove checks only when target is **strictly smaller** than attacker. Does not stack with Orc Beefy (which covers all same-size-or-smaller).
- **Grappled Creature weapon**: On successful Grapple (both direct Brawl and Fisticuffs), if attacker has Bully, auto-creates a temporary weapon item named "[Target] (Grappled)" — Brawl, 2H, d8, close range. Uses the grappled creature's actor image as the weapon icon.
- **Grappler tracking**: Restrained AE now created manually (instead of `toggleStatusEffect`) with `flags.vagabond.grappledBy` storing the grappler's actor ID. Enables auto-cleanup.
- **Dual damage**: When the Bully weapon hits a target, the same damage roll is also applied to the grappled creature's HP, with a chat message showing the dual damage.
- **Auto-cleanup**: `deleteActiveEffect` hook detects when Restrained with `grappledBy` flag is removed, and auto-deletes the matching Bully weapon from the grappler's inventory.

### Rogue Class Features (actor-character.mjs, roll-handler.mjs, item.mjs, damage-helper.mjs, chat-card.mjs, active-effect.mjs)
- **Sneak Attack (L1)**: Favored attacks add extra d4s to damage (1d4 at L1, 2d4 at L4, 3d4 at L7, 4d4 at L10). Tracked per round via `game.combat.round` — only first Favored attack per round applies (unless Lethal Weapon). Outside combat, always applies. Sneak Attack dice also pierce armor equal to the number of dice rolled.
- **Lethal Weapon (L6)**: Removes the once-per-round restriction on Sneak Attack — all Favored attacks get the extra dice.
- **Unflinching Luck (L2/L8)**: After spending Luck for Favor, auto-rolls d12 (d10 at L8). If result < remaining Luck, the Luck point is refunded. Chat message shows the roll and outcome.
- **Evasive (L4)**: Ignores Hinder on Reflex Saves (even in heavy armor). On a successful Dodge save, removes TWO highest damage dice instead of one.
- **Pre-roll Luck spending dialog**: Weapon attacks without Favor show a "Spend 1 Luck for Favor?" dialog when the actor has Luck available. Spending Luck upgrades the roll (hinder→none, none→favor). Closing the dialog cancels the attack.
- **Schema fields**: `sneakAttackDice`, `hasLethalWeapon`, `unflinchingLuckDie`, `hasEvasive` — auto-detected from class feature names in `_detectTraitAndFeatureFlags()`.
- **Damage chain**: Sneak dice count threaded through `roll.sneakAttackDice` → `createSaveButtons(sneakDice)` → `data-sneak-dice` HTML attribute → `calculateFinalDamage(sneakDice)` for armor pierce.
- **Chat card**: Sneak Attack tag with eye-slash icon shown on Favored attacks when sneak dice are available.
- **AE choices**: All four Rogue fields added to Active Effect attribute list.
- **Luck prompt setting**: Client-scoped "Prompt Luck Spending" setting (default on) lets each player toggle the pre-attack Luck dialog on/off.
- **Bug fixes**: Fixed Unflinching Luck detection (feature name includes `(d12)`/`(d10)` suffix — changed to `startsWith` match). Fixed Sneak Attack not firing outside combat (round tracking `0 !== 0` was always false). Fixed Sneak Attack not applying when using deferred "Roll Damage" button path — `favorHinder` now passed through button context.

### V14 ContextMenu Deprecation Fix (vagabond.mjs, combat-tracker.mjs)
- Replaced deprecated `condition` property with `visible` on all ContextMenuEntry definitions (Fluke Reroll, Force Critical, combat tracker entries) to resolve V14 deprecation warnings.

## Compendium Updates

### Weapon Damage Types (packs/items/weapons)
- Updated all 47 weapons in the LevelDB compendium with correct `damageType`, `damageTypeOneHand`, and `damageTypeTwoHands` values (blunt, piercing, slashing) from source spreadsheet
- Previously all weapons had `damageType: "-"` (none)

### Relic Compendium (vagabond-relics.json — external)
- Migrated 30 effect modes from numeric `2` to string `"add"`
- Fixed 3 Strike items: changed `system.universalDamageBonus` to `system.universalWeaponDamageDice` with correct values (1d4/1d6/1d8)
- Added Utility - Holding (Rank) effect with `system.inventory.bonusSlots`
- Added Ace - Keen effect with `system.meleeCritBonus` and `system.finesseCritBonus` set to `-1`

## Files Modified

| File | Changes |
|------|---------|
| `module/documents/actor.mjs` | `super.prepareBaseData()`, `change.type` fix |
| `module/documents/item.mjs` | Brutal weapon property |
| `module/helpers/config.mjs` | All AE mode constants → strings |
| `module/helpers/chat-card.mjs` | Cleave detection/tag, Brawl/Shield Grapple/Shove, Fisticuffs |
| `module/helpers/damage-helper.mjs` | Cleave data attribute, damage halving |
| `module/sheets/item-sheet.mjs` | Lock toggle submit fix |
| `module/applications/level-up-dialog.mjs` | AE mode constant → string |
| `module/data/item-perk.mjs` | effectMode field type + migration |
| `module/vagabond.mjs` | Push/Prone/Grapple/Shove button handlers, Bully weapon cleanup hook |
| `module/sheets/handlers/roll-handler.mjs` | Pre-roll Brawl/Shield intent dialog, Bully conditional Favor |
| `module/data/actor-character.mjs` | `brawlCheckFavor`, `fisticuffs`, `hasBully`, `shoveSizeOverride`, `incomingMeleeAttacksModifier` fields, perk detection |
| `module/documents/active-effect.mjs` | AE attribute choices for brawl/bully fields |
| `module/documents/item.mjs` | Melee-only incoming attacks modifier, `attackerFavorHinder` tracking |
| `packs/items/weapons/` | Damage types (LevelDB) |
