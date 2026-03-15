# Vagabond System Changelog — V14 Migration & Features

## Dancer Class Features (dancer-helper.mjs, roll-handler.mjs, combat.mjs, config.mjs)

### Step Up (L1) — Grant Ally a 2nd Action + Reflex Save Buff
- **Activation**: Use a relic item named "Step Up" from inventory (or `/stepup` chat command). Intercepted in `roll-handler.mjs` `useItem()` before normal item handling.
- **Ally selection dialog**: Shows all PC tokens on the scene (excluding the Dancer) with checkboxes. Double Time (L10) increases max selectable allies from 1 to 2.
- **Ally buff**: Sets `flags.vagabond.stepUpBonusAction` flag on selected allies. Expires at next round.
- **Dancer buff**: Sets `system.stepUpActive = true` — grants 2d20kh on Reflex Saves until start of next turn. Expires at next round.
- **Choreographer (L6)**: Ally gains Favor on first check with the granted Action. Dancer and ally gain +10ft Speed for the Round.
- **Double Time (L10)**: Allows selecting up to 2 allies instead of 1.
- **Chat card**: Shows Step Up tag, Choreographer/Double Time tags when applicable. Displays buffed allies as targets with portraits.

### Round-Based Buff Expiry (combat.mjs, dancer-helper.mjs)
- `combat.mjs` `endCombat()` override clears all Step Up and Virtuoso buffs when combat ends.
- `combat.mjs` `nextRound()` calls `_expireRoundBuffs(newRound)` to expire round-based buffs.
- `expireStepUpBuffsByRound()` / `expireStepUpBuffs()`: Full cleanup of all Step Up and Choreographer flags and system fields.

### Relic Item Intercepts (roll-handler.mjs)
- `useItem()` checks for class feature relic items before normal item handling:
  - Items named "Step Up" + actor has `hasStepUp` → triggers `performStepUp()`
  - Items named "Virtuoso" + actor has `hasVirtuoso` → triggers `performVirtuoso()`

### Virtuoso Status Effect Registration (config.mjs)
- Registered `virtuoso-inspiration`, `virtuoso-resolve`, `virtuoso-valor` status IDs so `toggleStatusEffect()` works without "Invalid status ID" errors.

### Compendium Pack Source Control (.gitignore, build-packs.sh)
- Unpacked all 13 compendium packs to editable JSON source files in `packs/_source/`
- Added Step Up and Virtuoso relic items to the relics compendium
- `.gitignore` updated to ignore LevelDB binaries, track only JSON sources
- `build-packs.sh` rebuilds all LevelDB packs from JSON sources via `fvtt-cli`

### Files Modified/Created
| File | Change |
|------|--------|
| `module/helpers/dancer-helper.mjs` | **NEW** — Step Up, Choreographer, Double Time logic + expiry helpers |
| `module/sheets/handlers/roll-handler.mjs` | Relic item intercepts for Step Up and Virtuoso in `useItem()` |
| `module/documents/combat.mjs` | `endCombat()` override, `_expireRoundBuffs()`, `nextRound()` buff expiry |
| `module/helpers/config.mjs` | Virtuoso status IDs registered |
| `packs/_source/` | **NEW** — JSON source files for all 13 compendium packs |
| `.gitignore` | LevelDB ignored, JSON sources tracked |
| `build-packs.sh` | **NEW** — Pack rebuild script |

---

## Active Effects Compendium

### New "Effect" Item Type (item-effect.mjs, system.json, item-sheet.mjs)
- Added `effect` item type — lightweight container whose sole purpose is to carry Active Effects
- Data model includes `category` (condition / buff / debuff / weapon / armor / material / classFeature / misc) and `durationHint` fields
- Full item sheet support with Details + Effects tabs
- Registered in `system.json` documentTypes, data models, and item sheet PARTS

### Effects Compendium Pack (effects-compendium.mjs, system.json)
- New "Active Effects" compendium pack (type: Item, path: packs/effects)
- Organized under Vagabond > Effects folder in the compendium sidebar
- Population helper at `vagabond.EffectsCompendium.populate()` — creates all effect items in the compendium
- Run `vagabond.EffectsCompendium.populate({ force: true })` in the console to regenerate

### Compendium Contents (104 drag-and-drop effect items)
- **Status Conditions (19):** All Vagabond conditions — Dazed, Prone, Frightened, Sickened, Confused, Vulnerable, Blinded, Invisible, Restrained, Incapacitated, Paralyzed, Unconscious, Dead, Berserk, Burning, Charmed, Focusing, Fatigued, Suffocating
- **Combat Buffs (34):** Favored/Hindered (All Rolls), Damage +1/+2/-2, Armor +1/+2, Speed +10ft/-10ft, Stat +1/-1 for all 6 stats, Save +1 for Reflex/Endure/Will, HP +5/+10/+1 per level
- **Weapon Enhancements (13):** Keen (Crit 19+), Melee/Ranged Damage Die +1 Step, Melee/Ranged Crit Range -1, +1 Weapon Damage, +1d4 Weapon Damage, Relic Weapon +1/+2/+3, Strike +d4/+d6/+d8
- **Relic Enchantments:** Trinket +1/+2/+3 (spell dmg), Protection +1/+2/+3 (all saves), Swiftness I/II/III (+5/+10/+15 Speed)
- **Cursed Items (6):** Weakness -1/-2/-3 (weapon dmg), Vulnerability -1/-2/-3 (armor)
- **Material Bonuses (3):** Adamant (Weapon +1 dmg), Adamant (Armor +1), Mythral (+1 slot)
- **Armor Properties (3):** Relic Armor +1/+2/+3
- **Ancestry Traits (5):** Orc Hulking (+2 slots), Dwarf Tough (+1 HP/lvl), Elf Naturally Attuned (spellcaster), Nimble (+5 speed), Draken Scale (+1 armor)
- **Perk Effects (5):** Tough (+1 HP/lvl), Pack Mule (+2 slots), Metamagic (+1 mana), Secret of Mana (+mana/lvl), Magical Secret (spellcaster)
- **Class Features (22):** Barbarian (Rage, Damage Reduction, Rip and Tear, Aggressor, Fearmonger, Mindless Rancor, Bloodthirsty), Rogue (Sneak Attack 1-3d4, Lethal Weapon, Evasive), Bard (Bravado, Climax), Brawl (Check Favor, Fisticuffs), Sorcerer (Spell-Slinger Lv2/Lv10), Merchant (Deep Pockets), Wizard (Sculpt Spell Lv2/Lv10)
- **Gear Effects (1):** Backpack (+2 slots)
- All effects sourced from existing compendium data include proper `applicationMode` flags (when-equipped, on-use, permanent)

### Files Modified
| File | Change |
|------|--------|
| `module/data/item-effect.mjs` | **NEW** — Effect item data model |
| `module/data/_module.mjs` | Export VagabondEffect |
| `module/helpers/effects-compendium.mjs` | **NEW** — Compendium definitions + populate() helper |
| `module/vagabond.mjs` | Register effect data model + EffectsCompendium global |
| `module/sheets/item-sheet.mjs` | PARTS, _configureRenderOptions, _preparePartContext, tab config |
| `templates/item/details-parts/effect-details.hbs` | **NEW** — Effect item sheet template |
| `system.json` | documentTypes.Item.effect, packs entry, packFolders entry |
| `lang/en.json` | TYPES.Item.effect label |

---

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

### Barbarian Class Features (actor-character.mjs, item.mjs, damage-helper.mjs, roll-handler.mjs, chat-card.mjs, vagabond.mjs, config.mjs, active-effect.mjs)
- **Rage (L1)**: While Berserk + Light/No Armor: damage dice upsize by 1 step on valid die ladder (d4→d6→d8→d10→d12), dice explode on max face value, and incoming damage reduced by 1 per damage die (min 1 die for flat damage). Works in both auto-roll and deferred "Roll Damage" paths. "Go Berserk?" prompt appears on all damage intake paths (PC attack, save rolls, Apply Direct) if the target has Rage but isn't yet Berserk.
- **Rip and Tear (L10)**: Upgrades Rage — damage reduction becomes 2 per die, and +1 flat bonus per damage die dealt.
- **Aggressor (L2)**: +10 foot speed bonus during the first round of combat. Automatically applied in `_calculateCombatValues()` when `game.combat.round === 1`. Fixed execution order: `_detectTraitAndFeatureFlags()` now runs before `_calculateCombatValues()` so the Aggressor flag is set before speed is calculated.
- **Fearmonger (L4)**: When an enemy is killed via Apply Direct or auto-apply save damage, all NPC tokens within 30ft with HD < attacker's Level become Frightened. Frightened auto-expires at the next round change via `updateCombat` hook.
- **Mindless Rancor (L6)**: Charmed and Confused status immunities auto-populated on the character. Added `statusImmunities` field to `actor-character.mjs` (was NPC-only).
- **Bloodthirsty (L8)**: Auto-Favor on weapon attacks when any targeted token is missing HP. Checked in roll-handler before Luck spending dialog. Fixed: resolves targets via canvas token first (`canvas.tokens.get(tokenId).actor`) instead of `game.actors.get(actorId)`, which failed for unlinked NPC tokens whose synthetic actor HP differs from the world actor.
- **Schema fields**: `hasRage`, `rageDamageReduction`, `hasRipAndTear`, `hasAggressor`, `hasFearmonger`, `hasMindlessRancor`, `hasBloodthirsty`, `statusImmunities` — all auto-detected from class feature names. Critical code paths (damage calculation, save handling, Apply Direct) use inline class feature detection for reliability, while schema flags are used for display/chat tags.
- **Damage chain**: Incoming dice count threaded through `data-dice-count` HTML attribute → `calculateFinalDamage(incomingDiceCount)` for Rage DR. Flat damage (0 dice) treated as minimum 1 die.
- **Die size validation**: All die upsizing (Rage, `dieSizeBonus`, spell die size) now clamp to valid TTRPG dice sizes `[4, 6, 8, 10, 12]` using nearest-match instead of raw arithmetic.
- **Chat tags**: Rage/Rip and Tear (fire icon) and Bloodthirsty (droplet icon) tags shown on weapon attack cards. Save result cards now show Rage DR as a separate line item (🔥 fire icon) distinct from armor (🛡 shield icon).
- **Berserk status**: Description updated to note Rage automation. Mechanical effects handled by code checks, not AE changes.
- **AE choices**: All seven Barbarian fields + character `statusImmunities` added to Active Effect attribute list.
- **Bug fix — typeless damage (`"-"`) bypassing Rage DR**: NPC actions default to `damageType: "-"` (typeless). The `calculateFinalDamage()` function had an early `return` for typeless damage that only applied armor and exited — completely skipping Rage DR. Fix: moved Rage DR to the top of `calculateFinalDamage()` so it runs before any early returns for typeless/weakness/immunity paths. **Pattern to watch for**: any future damage reduction mechanic added to `calculateFinalDamage()` must be placed before the typeless early return at the top, or it will silently fail on all NPC attacks that use the default `"-"` damage type.

### Bard Class Features (actor-character.mjs, item.mjs, vagabond.mjs, bard-helper.mjs, damage-helper.mjs, roll-handler.mjs, spell-handler.mjs, roll-builder.mjs, downtime-app.mjs, active-effect.mjs)
- **Virtuoso (L1)**: Bard performs a Performance Check to grant the Group one benefit for 1 Round. Triggered by using an equipment item named "Virtuoso" from inventory (or `/virtuoso` chat command as backup). Three choices:
  - **Inspiration**: d6 bonus to Healing rolls (via `system.virtuosoHealingBonus`)
  - **Resolve**: Favor on all Saves (via `system.virtuosoSavesFavor` — contextual, doesn't affect attacks)
  - **Valor**: Favor on Attack and Cast Checks (via `system.virtuosoAttacksFavor` — contextual, doesn't affect saves)
  - Group = all PC-type actors. Buffs auto-expire at round change and combat end.
- **Well-Versed (L1)**: Ignores Perk prerequisites during character creation and level-up. Automated in both `level-up-dialog.mjs` and `perks-step-manager.mjs`:
  - Prerequisite checks detect Well-Versed from class `levelFeatures` and override `met: true` while preserving the actual prereq data.
  - Perks the Bard wouldn't normally qualify for show a purple "Prerequisite waived" indicator (music note icon) instead of being hidden or locked.
  - Original prerequisites still display so players can see what's normally required.
  - "Show All" checkbox hidden when Well-Versed is active (unnecessary since all perks are visible).
  - "Perk" feature entries (mechanical perk-grant slots) hidden from the Features display on the character sheet for all classes.
- **Song of Rest (L2)**: During a Breather, if any PC has Song of Rest, all PCs gain bonus HP equal to (Bard's Presence + Bard Level) and a Studied Die. Integrated into `downtime-app.mjs` Breather handler. Chat card shows Song of Rest contribution separately.
- **Starstruck (L4)**: After a successful Virtuoso performance, if the Bard has Starstruck, a follow-up dialog lets them choose a status (Berserk, Charmed, Confused, or Frightened) to apply to a targeted Near Enemy. Duration tracked via a visible Cd4 countdown die on screen — the GM rolls it each round, and when it expires (d4 rolls 1), the linked status effect is automatically removed from affected actors. Starstruck link data (`status` + `actorIds`) stored on the countdown die's journal flags for auto-cleanup on deletion.
- **Starstruck Enhancement (L10)**: Starstruck affects ALL Near Enemies (NPC tokens within 30ft) instead of a single target. Auto-detected when class is Bard and level >= 10 with Starstruck feature.
- **Bravado (L6)**: Will Saves can't be Hindered while not Incapacitated. Applied in both the damage-helper save path (combat saves) and the generic roll-handler save path (character sheet saves). Overrides both system-level and conditional Hinder.
- **Climax (L8)**: Favor dice and bonus dice granted by the Bard can Explode. When a Bard with Climax uses Virtuoso, all PCs get `system.grantedDiceCanExplode = true`. The d6 Favor die in d20 rolls then explodes on 6 (max face) using `_manuallyExplodeDice`. Applied in `roll-builder.mjs` `evaluateRoll()` and `buildAndEvaluateD20WithRollData()`.
- **Starstruck auto-removal on countdown die expiry**: When the Cd4 countdown die expires and is deleted, a `deleteJournalEntry` hook checks for `flags.vagabond.starstruckLink` data and automatically removes the linked status effect from all affected actors. Posts a chat notification confirming removal.
- **Schema fields**: `hasVirtuoso`, `hasSongOfRest`, `hasStarstruck`, `hasBravado`, `hasClimax`, `hasStarstruckEnhancement`, `bardLevel`, `virtuosoSavesFavor`, `virtuosoAttacksFavor`, `virtuosoHealingBonus`, `grantedDiceCanExplode` — all auto-detected from class feature names. Feature detection uses `includes()` for flexible name matching.
- **AE choices**: All Bard fields added to Active Effect attribute list.
- **New file**: `module/helpers/bard-helper.mjs` — contains all Virtuoso/Starstruck logic (performVirtuoso, handleStarstruck, expiry helpers).

### Relic Power Automation — Burning, Lifesteal, Manasteal (actor-character.mjs, damage-helper.mjs, countdown-dice-overlay.mjs, effects-compendium.mjs, active-effect.mjs)
- **Event-driven AE fields**: New schema fields that Active Effects can target, with system code reacting at specific game events (on-kill, on-hit, on-countdown-roll). AEs control the values; code reacts to them.
- **Lifesteal (on-kill heal)**: `system.onKillHealDice` ArrayField — when a kill occurs, rolls the accumulated dice formulas and heals the attacker (capped at max HP). Multiple AE sources stack (e.g. two Lifesteal items). Tiers: I = 1d8, II = 2d8, III = 3d8. Chat card shows heal amount.
- **Manasteal (on-kill mana restore)**: `system.onKillManaDice` ArrayField — on kill, rolls dice and restores mana (capped at max, only if spellcaster). Multiple sources stack. Tiers: I = 1d4, II = 2d4, III = 3d4. Chat card shows mana restored.
- **Burning (on-hit countdown die)**: `system.onHitBurningDice` StringField — on weapon hit dealing damage, applies Burning status to the target and creates a Countdown Die (Cd4/Cd6/Cd8) on the canvas. The countdown die roll result IS the burning damage — no separate damage roll. Tiers: I = Cd4, II = Cd6, III = Cd8. Override mode so higher tier replaces lower.
- **Countdown die integration**: Burning uses the built-in Vagabond Countdown Dice system. When the die is clicked/rolled, `_applyLinkedDamage()` in `countdown-dice-overlay.mjs` applies the roll result as fire damage to the target. When the die expires (rolls 1 and shrinks below d4), the linked Burning status is auto-removed.
- **Generic `linkedStatusEffect` flag**: Countdown dice now support a generic `linkedStatusEffect` flag (alongside the existing `starstruckLink`). `_cleanupLinkedEffects()` checks both flags, enabling any future status effect to be linked to a countdown die for auto-cleanup on expiry.
- **`_resetBonuses()` integration**: All three new fields reset in `prepareBaseData()` before AEs apply (onKillHealDice → [], onKillManaDice → [], onHitBurningDice → '').
- **Damage application wiring**: `checkOnKillEffects()` and `checkOnHitBurning()` called from all 3 damage application points in `damage-helper.mjs` (direct apply, save damage auto-apply, save damage manual apply).
- **AE attribute choices**: All three fields added to Active Effect attribute dropdown with descriptive labels.
- **Effects compendium**: Burning I/II/III, Lifesteal I/II/III, and Manasteal I/II/III updated from flag-only reminders to real AE-driven automation. Run `vagabond.EffectsCompendium.populate({ force: true })` to regenerate.

### Life Spell Revive Mechanic (spell-handler.mjs)
- **0-dice (0 mana) cast**: Revives a dead target — sets HP to 1, removes Dead/Unconscious status, adds 1 Fatigue. Only works on targets with the Dead condition; no effect otherwise. Posts a "Life — Revive" chat card. Virtuoso Inspiration does NOT apply.
- **1+ dice cast**: Heals for Xd6 per mana spent. Virtuoso Inspiration adds bonus d6 as normal.
- **Healing spells default to 0 dice**: `_getSpellState()` and post-cast reset now start healing/recover/recharge spells at 0 dice instead of 1, so base cast costs 0 mana.
- **No "Roll Damage" button at 0 dice**: Chat card correctly omits the damage/healing button when no dice are rolled.
- **"Roll Healing" button label**: `createDamageButton()` in `damage-helper.mjs` now shows context-appropriate labels — "Roll Healing" (heart icon) for healing, "Roll Recovery" for recover, "Roll Recharge" for recharge.

### System Compatibility
- Updated `system.json` `compatibility.verified` from `"13.351"` to `"14.356"`.

### V14 ContextMenu Deprecation Fix (vagabond.mjs, combat-tracker.mjs)
- Replaced deprecated `condition` property with `visible` on all ContextMenuEntry definitions (Fluke Reroll, Force Critical, combat tracker entries) to resolve V14 deprecation warnings.

## Compendium Updates

### Bard Class Feature Names (packs/classes, item-class.mjs)
- Fixed Level 8 feature from "Awe-Inspiring" to **Climax** with correct description ("Favor and bonus dice you grant can Explode.")
- Fixed Level 10 feature from "Encore" to **Starstruck Enhancement** with correct description
- Added `migrateData()` auto-fix in `item-class.mjs` to rename legacy feature names on load, so existing characters are corrected automatically
- Detection code also matches old names ("awe-inspiring", "encore") as fallback safety net

### Weapon Damage Types (packs/items/weapons)
- Updated all 47 weapons in the LevelDB compendium with correct `damageType`, `damageTypeOneHand`, and `damageTypeTwoHands` values (blunt, piercing, slashing) from source spreadsheet
- Previously all weapons had `damageType: "-"` (none)

### Relic Compendium (vagabond-relics.json — external)
- Migrated 30 effect modes from numeric `2` to string `"add"`
- Fixed 3 Strike items: changed `system.universalDamageBonus` to `system.universalWeaponDamageDice` with correct values (1d4/1d6/1d8)
- Added Utility - Holding (Rank) effect with `system.inventory.bonusSlots`
- Added Ace - Keen effect with `system.meleeCritBonus` and `system.finesseCritBonus` set to `-1`

### Flanking — Automated Vulnerable Detection (flanking-helper.mjs, vagabond.mjs, active-effect.mjs)
- **Auto-detection**: When 2+ allied tokens are Close (≤5ft edge-to-edge) to a foe, that foe automatically gains the Vulnerable (Flanked) condition. Removed when flanking conditions no longer met.
- **Flag-based effect identification**: Uses `flags.vagabond.flankingEffect: true` instead of `origin` field (which is unreliable in V14) to find and manage flanking effects on actors.
- **Effect data**: Applies Hinder to the flanked target's rolls, Favor on incoming attacks, and Favor on incoming saves via AE changes (`system.favorHinder`, `system.incomingAttacksModifier`, `system.outgoingSavesModifier`).
- **Duration for icon visibility**: Effects include `duration: { rounds: 99, startRound: 0 }` so token icons display when token effect display is set to "If Temporary".
- **Distance calculation**: Edge-to-edge Chebyshev distance using token bounding box grid coordinates.
- **Hook**: Uses `updateToken` hook (not `refreshToken` which causes infinite debounce loops) with 100ms debounce.
- **Token refresh**: Force `token.renderFlags.set({ refreshEffects: true })` after apply/remove to update token overlays immediately.
- **System setting**: `flankingEnabled` (Boolean, default true). GM can toggle in system settings.
- **New file**: `module/helpers/flanking-helper.mjs`

### Morale — Automated NPC Morale Checks (morale-helper.mjs, vagabond.mjs)
- **Triggers**: Automatic morale checks fire when: (1) first NPC death in a group, (2) half the NPC group is defeated, (3) the leader (highest Threat Level NPC) is defeated, (4) a solo NPC drops to half HP.
- **Leader detection**: Finds the highest-TL living NPC as the "leader" whose Morale stat is used for the check.
- **Roll**: 2d6 ≤ Morale = pass (group holds), otherwise fail (retreat/surrender).
- **No Morale value**: NPCs without a Morale stat fight to the death — shown with skull-crossbones icon.
- **GM-only**: Results whispered only to GMs via `ChatMessage.create` with whisper filter.
- **State tracking**: Tracks `initialNPCCount`, `isSolo`, `firstDeathFired`, `halfGroupFired`, `halfHPFired`, `leaderDefeatedFired` to prevent duplicate triggers.
- **Manual check**: `MoraleHelper.manualCheck(reason)` for GM-triggered checks.
- **System setting**: `moraleEnabled` (Boolean, default true).
- **New file**: `module/helpers/morale-helper.mjs`

### Auto-Defeat — NPCs at 0 HP (vagabond.mjs)
- **Auto-mark defeated**: When an NPC's HP drops to 0 via `updateActor` hook, the system automatically marks their combatant as defeated and applies the Dead status effect.
- **Enables morale triggering**: This was required because the Morale helper listens for `updateCombatant` with `changes.defeated === true`, which wasn't firing when NPCs hit 0 HP without manual defeat marking.

### Light Tracker — Torch/Lantern/Candle Burn Tracking (light-tracker.mjs, vagabond.mjs, light-tracker.hbs, _light-tracker.scss)
- **Ported from vagabond-crawler module**: Full light source tracking with system-native integration (no module dependency).
- **Light sources**: Torch, Lantern (Hooded), Lantern (Bullseye), Candle — all with 1-hour (3600s) burn time.
- **Toggle from inventory**: Right-click context menu on light source items in character sheet to Light/Extinguish.
- **Stack splitting**: Lighting a torch from a stack (e.g., 5 torches) splits off 1 as a separate lit item, reducing the stack by 1. Prevents issues with drag-and-drop of stacked lit items.
- **Token light emission**: Lit items automatically configure token light settings (bright/dim radius, color, animation).
- **Drop on canvas**: Drag a light source from inventory to the canvas to create a small dropped-light token. Retains lit state and remaining time.
- **Pick up from canvas**: Token HUD button on dropped light tokens lets GM assign the light to a character, creating an inventory item and deleting the canvas token.
- **Real-time burn**: `setInterval` accumulates seconds, flushed to `game.time.advance()` every 6 seconds. `updateWorldTime` hook deducts burn time from all lit items.
- **Burn out**: Consumables (torch, candle) are consumed when time runs out. Lanterns show "needs refueling" message. Chat notifications for all burn-out events.
- **GM Tracker Panel**: `LightTrackerApp` (ApplicationV2 + HandlebarsApplicationMixin) showing all lit light sources with progress bars, time remaining, and douse buttons. Time Passes controls to add/subtract minutes.
- **Scene control button**: "Light Tracker" button (fire icon) in Vagabond Tools toolbar for GM access.
- **Socket support**: Player-initiated actions (drop, pickup) forwarded to GM via `system.vagabond` socket channel.
- **Crawler module deferral**: Skips initialization if `vagabond-crawler` module is active to avoid duplication.
- **System setting**: `lightTrackingEnabled` (Boolean, default true).
- **New files**: `module/helpers/light-tracker.mjs`, `templates/apps/light-tracker.hbs`, `src/scss/apps/_light-tracker.scss`

### Token Effect Icon Visibility Fixes (vagabond.mjs, damage-helper.mjs, chat-card.mjs)
- **Root cause**: Effects without a `duration` property don't show icons on tokens when token effect display is set to "If Temporary" (Foundry's `ActiveEffect#isTemporary` checks for duration).
- **Restrained (Grapple)**: Added `duration: { rounds: 99, startRound: 0 }` to Restrained effects created by Grapple/Brawl (two locations in `vagabond.mjs`).
- **Frightened (Fearmonger)**: Added `duration: { rounds: 1, startRound: currentRound }` to the Frightened effect applied by Barbarian Fearmonger in `damage-helper.mjs`.
- **Restrained (Grapple in chat-card.mjs)**: Added duration to the Restrained effect created via chat card grapple handler.

### Weapon Property Range & Targeting Distance (target-helper.mjs, roll-handler.mjs, chat-card.mjs, _chat-cards.scss)
- **Distance measurement**: `TargetHelper.distanceFt(tokenA, tokenB)` — edge-to-edge Chebyshev distance in feet, supports multi-square tokens. Uses `(gap + 1) * gridDist` formula to match Foundry's ruler (adjacent = 5ft, 1 gap = 10ft, etc.).
- **Range bands**: `TargetHelper.getDistanceBand(distFt)` — classifies distance as Close (≤5ft), Near (5–30ft), or Far (>30ft).
- **Pre-attack range validation**: `TargetHelper.validateWeaponRange()` checks weapon range + properties against target distance before the attack roll:
  - **Melee** (`range=close`): blocked if target > 5ft. With **Long** property: blocked if target > 10ft.
  - **Thrown** property: melee weapon can attack up to Near normally, Far with automatic Hinder.
  - **Ranged** property: automatic Hinder when target is Close (≤5ft).
  - **Near** property / `range=near`: blocked if target is Far (>30ft).
  - **Far** (`range=far`): no restriction.
- **Range Hinder integration**: Range-based Hinder applied to favor/hinder calculation before the roll — cancels Favor or applies Hinder as appropriate.
- **Chat card tag**: Shows Close/Near/Far range band on attack cards with contextual icon (fist/walking/binoculars). Hindered attacks show "(Hindered)" in red.
- **Out-of-range blocking**: Warns and cancels the attack if target is beyond weapon reach.
- **No-target fallback**: Attacks without targets skip range validation (for GMs who don't use targeting).
- **Distance formula fix**: Fixed edge-to-edge distance calculation in both `target-helper.mjs` and `flanking-helper.mjs` — was off by 5ft (adjacent tokens returned 0ft instead of 5ft). Flanking threshold updated from `> 0` to `> 5` to match.

### System V14-Only Declaration (system.json)
- Updated `compatibility.minimum` from `"13"` to `"14"` — the system uses V14-only APIs throughout (DialogV2, ApplicationV2, string-based AE types, `foundry.dice.terms.DiceTerm`, `renderFlags.set()`, `roll.evaluate()` without `{async: true}`).

## Files Modified

| File | Changes |
|------|---------|
| `module/documents/actor.mjs` | `super.prepareBaseData()`, `change.type` fix |
| `module/documents/item.mjs` | Brutal weapon property |
| `module/helpers/config.mjs` | All AE mode constants → strings |
| `module/helpers/chat-card.mjs` | Cleave detection/tag, Brawl/Shield Grapple/Shove, Fisticuffs, Restrained duration fix |
| `module/helpers/damage-helper.mjs` | Cleave data attribute, damage halving, Fearmonger Frightened duration fix |
| `module/helpers/flanking-helper.mjs` | **New** — Automated flanking detection and Vulnerable application; distance formula fix |
| `module/helpers/morale-helper.mjs` | **New** — Automated NPC morale checks |
| `module/helpers/light-tracker.mjs` | **New** — Light source burn tracking, canvas drop/pickup, GM tracker panel |
| `module/sheets/item-sheet.mjs` | Lock toggle submit fix |
| `module/applications/level-up-dialog.mjs` | AE mode constant → string |
| `module/data/item-perk.mjs` | effectMode field type + migration |
| `module/vagabond.mjs` | Push/Prone/Grapple/Shove handlers, Bully cleanup, Flanking/Morale/Light init, auto-defeat hook, scene controls, Restrained duration fix |
| `module/helpers/target-helper.mjs` | Distance measurement, range band classification, weapon range validation |
| `module/sheets/handlers/roll-handler.mjs` | Pre-roll Brawl/Shield intent dialog, Bully conditional Favor, weapon range validation + Hinder |
| `module/data/actor-character.mjs` | `brawlCheckFavor`, `fisticuffs`, `hasBully`, `shoveSizeOverride`, `incomingMeleeAttacksModifier` fields, perk detection |
| `module/documents/active-effect.mjs` | AE attribute choices for brawl/bully fields |
| `module/documents/item.mjs` | Melee-only incoming attacks modifier, `attackerFavorHinder` tracking |
| `packs/items/weapons/` | Damage types (LevelDB) |
| `templates/apps/light-tracker.hbs` | **New** — Light Tracker GM panel template |
| `src/scss/apps/_light-tracker.scss` | **New** — Light Tracker styles |
| `src/scss/components/_chat-cards.scss` | Morale check chat card styles, range hinder tag style |
| `system.json` | `compatibility.minimum` → `"14"` |
