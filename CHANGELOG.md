# Changelog

## Phase 11: Item Drop System, Light Tracker Multiplayer, Crawler Bar Overhaul

### Item Drop System
- **Drag-and-drop items to canvas** — players can drag any item from their inventory onto the map to drop it on the ground
- **Dropped item tokens** — items appear as small 0.5-size tokens with the item's icon, hoverable name
- **Pick up items** — right-click a dropped item token, click the hand icon to add it to your character's inventory
- **Full multiplayer support** — players relay actions via socket to the GM client; works for all permission levels
- **Chat notifications** — "Player dropped Item" / "Player picked up Item" messages

### Light Tracker Multiplayer
- **Player torch drag-and-drop** — players can now drag torches from inventory onto the canvas (socket relay to GM)
- **Player torch pickup** — players can pick up dropped torches via TokenHUD hand button
- **Moveable dropped torches** — dropped light tokens now have Owner permission so all players can reposition them
- **Douse/re-light dropped torches** — Light Tracker app now shows dropped torches with toggle button (wind to douse, fire to re-light)
- **Doused torches persist in tracker** — doused dropped torches stay visible instead of disappearing
- **Socket enabled** — system.json `socket: true` to enable client-to-client communication

### Crawler Bar Overhaul
- **Reorganized button layout** — Combat moved next to Add Tokens, Clock moved after Lights, before Rest
- **Merged Encounter buttons** — Enc. Check and Encounter! combined into single "Encounter" button (left-click: roll d6, right-click: options menu with threshold, instant encounter, table builder)
- **Instant Encounter** — right-click Encounter opens Random Encounter GUI on Roll Tables tab and auto-clicks Roll
- **Combat bar improvements** — Add Tokens and Delete Encounter buttons added to combat state bar
- **Font update** — all crawler UI now uses "Germania" serif font
- **Removed Drop Table zone** — table management handled through Encounter right-click menu
- **Removed Lights button** — now covered by Vagabond Tools in the base system
- **WebM token fallback** — tokens using .webm textures fall back to actor portrait in crawl strip

### Bug Fixes
- **Morale chat card** — fixed white-on-white text (set explicit dark color)
- **Consumable weapons** — items with `isConsumable: true` now properly consumed even if equipmentType is weapon (fixes Frigid Azote, etc.)
- **Light tracker context menu** — fixed selector polling for wrong class name (`.inventory-context-menu` → `.vagabond-context-menu`)

---

## Phase 10: Classic Sheet, Class Features, Attack Pipeline Refactor

### Classic Character Sheet
- Alternative wide landscape layout registered via Sheet Configuration dialog
- 3-column layout with collapsible sections (Skills, Attacks, Inventory, Features, Traits, Perks, Effects)
- Resizable window, saves/quick-row positioning, fatigue visual indicators

### Class Features
- **Bard**: Virtuoso, Song of Rest, Starstruck, Bravado, Climax, Awe-Inspiring
- **Dancer**: Step Up, Double Time, Choreographer (one-check Favor), Fleet of Foot, Don't Stop Me Now, Flash of Beauty

### Attack Pipeline Refactor
- Single `performWeaponAttack()` function shared by character sheet and crawler bar
- All class features, favor modifiers, range validation, brawl intents, imbue, and consumption in one place
- Eliminates "works on sheet but not crawler" bugs permanently

---

## Phase 9: Alchemy System Port, Magic Ward, Crawler Decouple

---

## Phase 8: Relic Forge Overhaul, Resistance System & Magical Weapons

### New Features

#### Relic Forge Overhaul — Matches Official Naming Procedure
- **Removed tier selector** — no more Minor/None/Major. Each power tier is now its own entry (e.g. Lifesteal I, Lifesteal II, Lifesteal III) matching the official spreadsheet exactly.
- **99 powers across 11 categories** — Ace (6), Bane (3), Bonus (12), Cursed (10), Movement (14), Protection (3), Resistance (4), Senses (8), Strike (3), Utility (29). Removed Fabled (pre-made relics, not forge powers).
- **Per-power cost system** — each power has a gold cost. Total item cost = base item cost + sum of power costs. Displayed in the forge header and per power card.
- **Official naming convention** — prefix (`"Brutal Longsword"`), suffix (`"Longsword of Climbing"`), and wrap (`"Dragon's Bane Longsword"`) patterns with `{input}` placeholder replacement. Metal suffix appended for special metals.
- **Dropdown inputs for Bane/Protection** — Niche (bestiary compendium actors), Specific (29 hardcoded subtypes), General (8 Being Types). Store Spell uses spell compendium dropdown.
- **Compendium cache** — bestiary + spell names loaded once per forge session for dropdown population.
- **Forge auto-sets magical metal** — weapons forged with common/no metal are upgraded to `'magical'` automatically.

#### Resistance System (Game-Wide)
- **New `system.resistances` ArrayField** on both character and NPC data models.
- **Damage pipeline integration** — resistance halves damage (`Math.floor(damage / 2)`) after immunity check, before armor.
- **Equipment AE flag support** — relic resistance powers store `flags.vagabond.damageResistance` on Active Effects since Foundry AE mode ADD doesn't append to arrays. The damage pipeline scans all equipped item effects for these flags.
- **NPC sheet UI** — locked mode shows resistance tags with damage type icons. Unlocked mode shows checkbox group under "Resistances (½ Damage)" with tag display and remove buttons.

#### Physical Immunity & Resistance — Magical Weapon Bypass
- **Physical defined** — Blunt, Piercing, or Slashing damage from non-magical weapons.
- **`_isWeaponMagical()` helper** — a weapon is magical if it has: (1) special metal (not none/common), (2) any Active Effects, or (3) `relicForge` flag from the forge.
- **Bypasses both immunity and resistance** — magical weapons ignore Physical immunity and Physical resistance entirely.
- **New `'magical'` metal type** — 1× cost multiplier, no stat changes, exists solely to mark items as magical. The forge sets this automatically.

#### Relic Power Functionality (37 powers wired up)
- **Bane (Niche/Specific/General)** — bonus damage dice vs matching NPC creature types.
- **Cursed (Anger/Cowardice/Gullibility)** — `autoFailSaveVs` schema fields for auto-failing specific save types.
- **Cursed (Doom)** — `healingCappedPerDie` schema field caps healing per die rolled.
- **Movement (8 types)** — Blinking, Climbing, Clinging, Flying, Levitation, Waterwalk, Webwalk set `movement.*` schema fields.
- **Protection (Niche/Specific/General)** — grants Favor on saves vs matching creature types.
- **Resistance (Bravery/Clarity/Repulsing)** — `favorOnSaveVs` schema fields for Favor on specific save types.
- **Senses (all 8)** — Nightvision, Echolocation, Telepathy, True-Seeing, Detection, Sense Life, Sense Valuables, Tremors set `senses.*` schema fields.
- **Utility (Lifesteal I/II/III)** — heals on kill via `onKillHealDice` flag (1d8/2d8/3d8).
- **Utility (Manasteal I/II/III)** — restores mana on kill via `onKillManaDice` flag.
- **Utility (Ambassador)** — `speakAllLanguages` schema field.
- **Utility (Aqua Lung)** — `breatheUnderwater` schema field.
- **Utility (Warning)** — `cannotBeSurprised` schema field.

### Technical Details

#### Modified Files (14 files)

| File | Changes |
|------|---------|
| `module/helpers/relic-powers.mjs` | Complete rewrite — 99 powers, 11 categories, per-power costs, nameFormat system, dropdown inputs, `requiresInput`/`inputType`/`inputSource` |
| `module/applications/relic-forge.mjs` | Removed tier selector, added compendium cache, `_computeName()` with prefix/suffix/wrap, `_computeCostDisplay()`, dropdown resolution, auto-magical metal |
| `templates/apps/relic-forge.hbs` | Removed tier section, added cost display, power cost tags, conditional select/input for dropdown powers |
| `module/helpers/damage-helper.mjs` | `_isWeaponMagical()`, Physical immunity bypass, resistance system (halve before armor), equipped item AE flag scanning |
| `module/data/actor-character.mjs` | Added `system.resistances` ArrayField, movement/senses/save modifier schema fields |
| `module/data/actor-npc.mjs` | Added `system.resistances` ArrayField |
| `module/data/base-equipment.mjs` | Added `'magical'` to metal choices with 1× multiplier |
| `module/helpers/config.mjs` | Added `'magical'` to damage type/metal configs |
| `module/sheets/actor-sheet.mjs` | Registered `removeResistance` action |
| `module/sheets/handlers/npc-immunity-handler.mjs` | Added `removeResistance()` method |
| `templates/actor/npc-content.hbs` | Resistance UI — locked display + unlocked checkboxes + tag remove buttons |
| `templates/item/header.hbs` | Added magical metal display |
| `css/vagabond.css` | Forge font size bump (0.7→0.85-1rem), preview-cost, power-cost-tag, power-input-row, item-meta styles |
| `lang/en.json` | Added resistance/magical metal localization strings |

---

## Phase 7: Weapon Properties, Crit Choice, Dice Tooltips & Relic Forge

### New Features

#### Complete Weapon Property Mechanics (11/11)
- **Cleave** — Damage splits between 2 targets. Smart HP-aware distribution: ceil half goes to the lower-HP target (capped at their HP), remainder to the other. Chat tag shows "Cleave (½ dmg each)".
- **Brutal** — On crit, rolls 1 extra damage die (same type as weapon damage). Respects crit choice system.
- **Entangle** — On hit, offers Grapple intent (same as Brawl). Does NOT grant Shove (unlike Shield). Dialog title reads "Entangle Attack".
- Previously implemented: Brawl, Finesse, Keen, Long, Near, Ranged, Shield, Thrown.

#### Target Count Validation
- **Weapons require at least 1 target** — attacks are blocked entirely with a warning if no target is selected.
- **Max 1 target** for normal weapons, **max 2 for Cleave** — excess targets are trimmed with a notification.
- Non-Cleave weapons no longer deal full damage to multiple targets.

#### Crit Choice System
- **Crits are now a choice**: Take Luck OR Forgo Luck for a Benefit.
  - **Attack/Cast crits** — Benefit = deal bonus damage equal to your stat.
  - **Save crits** — Benefit = negate all damage from the save.
- **Generic skill crits** (non-combat) auto-grant Luck with no choice needed.
- **Max Luck auto-benefit** — if already at full Luck pool, automatically takes Benefit (no dialog).
- **Chat card** announces the chosen benefit.
- **Flag stored on ChatMessage** (`critChoice`) so the damage button knows whether to add stat damage.

#### Dice Hover Tooltips
- **Damage dice** — hovering shows formula + individual results (e.g. "2d6 → [4, 2]").
- **Roll dice** — hovering shows full formula, breakdown per die group, and total.
- Visual cursor changes to `help` on hover.

#### Relic Forge (ApplicationV2)
- **Drag-drop base item** — drop any equipment item (weapon, armor, gear) onto the forge. Items keep their original type (weapons stay weapons, armor stays armor).
- **Tier selector** — Minor / (None) / Major. The tier scales power values automatically (e.g. Striking gives +1/+2/+3 damage by tier).
- **Power browser** — 81 pre-defined relic powers across 17 categories (Damage, Bonus, On-Hit, On-Kill, Critical, Ace Property, Stat Bonus, Bane, Protection, Resistance, Movement, Senses, Light, Stealth, Cursed, Fabled, Utility).
- **Category filter tabs** — filter the browser by category or view all.
- **Custom power builder** — create ad-hoc powers with custom AE key/mode/value.
- **Relic naming** — auto-generates name: `[Tier Prefix] [Power Labels...] [Base Item Name]` (e.g. "Minor Striking Light Hammer").
- **Forge button** — creates the relic item with all selected powers as Active Effects, stores forge metadata in flags, posts a chat card.
- **Scene control button** — "Relic Forge" gem icon in Vagabond Tools sidebar (GM-only).

#### Relic Powers Database (81 powers, 16 tier-scaled)
- **Damage**: Striking (+flat damage), Strike (+bonus damage dice)
- **Bonus**: Armor, Protection (all saves), Trinket (spell damage), Weapon (attack bonus)
- **On-Hit**: Burning (countdown die)
- **On-Kill**: Lifesteal, Manasteal
- **Critical**: Keen (crit threshold -1)
- **Ace Properties**: Brutal, Cleave, Long, Entangle, Thrown, Keen (adds weapon property)
- **Stat Bonuses**: +1 to any of 6 stats
- **Bane**: General/Niche/Specific (+1d6/2d6/3d6 vs creature type)
- **Ward**: General/Niche/Specific (Favor on saves vs creature type)
- **Resistance**: Condition saves (Bravery, Clarity, Repulsing) + typed damage (Fire, Cold, Lightning, Poison, Necrotic, Radiant)
- **Movement**: Climb, Fly, Levitate, Waterwalk, Blink, Clinging, Displacement, Webwalk, Swiftness (tier-scaled speed), Jumping (tier-scaled multiplier)
- **Senses**: Darksight, Echolocation, Telepathy, True-Seeing, Detection, Sense Life, Sense Valuables
- **Light**: Radiant, Moonlit, Darkness (tier-scaled range)
- **Stealth**: Invisibility I (action-limited), Invisibility II (permanent)
- **Cursed**: Anger, Cowardice, Gullibility (auto-fail saves), Doom (healing cap), Vulnerability (armor penalty), Weakness (damage penalty)
- **Fabled**: Vorpal, Vicious, Benediction, Soul Eater, Blasting, Precision, Wish-Granting
- **Utility**: Warning, Loyalty, Store Spell, Aqua Lung, After-Image, Ambassador, Holding (inventory slots), Infinite, Unique

### Bug Fixes
- **Cleave dealing full damage to all targets** — `rollDamageFromButton()` wasn't reading stored targets from the button, and `postDamageResult()` wasn't passing them to `createActionCard()`. Fixed the full data chain.
- **Item sheet crash on delete** — race condition where `close()` called `submit()` after item already removed from EmbeddedCollection. Added `_destroyed` and `id` existence checks.
- **Crits gave both Luck AND stat damage** — now correctly a choice per rules.
- **Non-Cleave weapons hitting multiple targets for full damage** — target count validation now enforces 1 target max (2 for Cleave).

### Technical Details

#### New Files (3 files)

| File | Description |
|------|-------------|
| `module/helpers/relic-powers.mjs` | Relic powers database (81 powers, 17 categories, tier-scaled values) |
| `module/applications/relic-forge.mjs` | Relic Forge ApplicationV2 (drag-drop, tier selector, power browser, custom builder) |
| `templates/apps/relic-forge.hbs` | Relic Forge Handlebars template (three-column layout) |

#### Modified Files (6 files)

| File | Changes |
|------|---------|
| `module/helpers/damage-helper.mjs` | Cleave distribution (`_distributeCleave`), Brutal extra die, crit choice flag reading, cleave-aware save handling |
| `module/helpers/chat-card.mjs` | Cleave tag, crit choice system (`_grantLuckOnCrit` rewrite, `_postCritChoiceCard`), `critChoice` flag storage |
| `module/sheets/handlers/roll-handler.mjs` | Target count validation, Entangle support, grapple/shove eligibility |
| `module/sheets/item-sheet.mjs` | Delete race condition fix (`_destroyed` checks) |
| `module/vagabond.mjs` | Relic Forge import/registration, scene control button, dice hover tooltips |
| `css/vagabond.css` | Relic Forge styles (~200 lines), tooltip cursor styles |

---

## Phase 6: Spell Status Conditions, Imbue Delivery & Focus Mechanics

### New Features

#### Spell Status Condition System
- **Spell effect automation** — spells can now apply status conditions (Blinded, Dazed, Frightened, Burning, etc.) to targets on a successful cast.
- **Effect Type field** — each spell declares its effect type: `flavor` (descriptive only) or `statusEffect` (applies a condition).
- **Status Condition selector** — dropdown on the spell sheet to pick which condition is applied, using the shared `onHitStatusConditions` config.
- **Crit Continual** — checkbox flag: if enabled and the cast is a critical success, the status becomes Continual (persists indefinitely without Focus).
- **Burning spells with countdown dice** — spells with `statusCondition: 'burning'` and a `countdownDie` (d4–d12) create a countdown die through the existing burning system (`VagabondDamageHelper.checkOnHitBurning()`).
- **Non-burning countdown statuses** — spells with a countdown die but a non-burning status (e.g., Blinded d6) create a countdown die that removes the status on expiry.
- **Immunity checks** — respects target `statusImmunities` before applying conditions.

#### Imbue Spell Delivery
- **Imbue delivery type** — casters can store a spell on an equipped weapon of a willing target. The spell resolves when the weapon hits.
- **Self-imbue on hostile target** — if the caster has a hostile NPC selected, Imbue targets the caster's own weapon (never imbues enemy weapons).
- **Ally imbue on friendly target** — if a friendly token is selected, prompts to pick one of that ally's equipped weapons to imbue.
- **Multi-weapon dialog** — if the target has multiple equipped weapons, a dialog lets you choose which one to imbue.
- **Imbue flag on weapon** — stores spell data (`spellId`, `casterId`, `damageType`, `damageDice`, `statusCondition`, `countdownDie`, etc.) as `flags.vagabond.imbue` on the weapon item.
- **Imbue delivery on hit** — when attacking with an imbued weapon, the chat card shows imbue damage and/or status effect buttons. Non-Focused imbues are one-shot (flag cleared after hit); Focused imbues persist.
- **Imbue tag in chat** — weapon attack cards display an "Imbue: SpellName" tag when the weapon is imbued.

#### Focus Maintenance System
- **Interactive Focus upkeep** — at each round start, the system posts chat cards for casters Focusing spells on hostile NPCs, with "Roll Cast Check" and "Drop Focus" buttons.
- **Per-spell Cast Checks** — each focused spell gets its own Cast Check and 1 mana cost, regardless of how many targets that spell affects.
- **Friendly/self Focus is free** — Focus on friendly targets (character type) persists silently with no mana or check required.
- **Hostile Focus requires Cast Check** — d20 vs casting skill difficulty. Pass = 1 mana deducted + effects maintained. Fail = all effects from that spell removed.
- **Optional extra damage** — on a passed Focus check, an optional "Spend Mana for Damage" button appears (1d6 per mana spent, up to remaining mana).
- **Automatic mana check** — if the caster has no mana, Focus and its statuses are auto-removed with a chat notification.
- **Continual statuses** — statuses marked Continual bypass all Focus processing (no cost, no check, persist until manually ended).
- **Combat end cleanup** — all spell-inflicted statuses and tracking flags are cleared when combat ends.

#### Remote/Imbue Target Count Validation
- **Target count enforcement** — for count-based deliveries (Remote, Imbue), the system validates that the number of selected targets doesn't exceed what the caster has paid for (base + delivery increases).
- **Clear feedback** — warns with the exact count mismatch and tells the player to increase delivery to add more targets.

### Technical Details

#### New Schema Fields (`item-spell.mjs`)

| Field | Type | Description |
|-------|------|-------------|
| `effectType` | StringField | `'flavor'` or `'statusEffect'` — categorizes spell effect for automation |
| `statusCondition` | StringField | Which condition to apply (from `onHitStatusConditions` config) |
| `critContinual` | BooleanField | If true + crit, status becomes Continual (no Focus needed) |
| `countdownDie` | StringField | Die type for countdown (d4–d12), used for burning and timed statuses |
| `countdownDamageType` | StringField | Damage type for countdown die (if different from spell's damage type) |

#### Modified Files (7 files)

| File | Changes |
|------|---------|
| `module/data/item-spell.mjs` | Added 5 new schema fields for spell status automation |
| `module/sheets/handlers/spell-handler.mjs` | Imbue delivery handler, `_applySpellStatusCondition()`, target count validation for count-based deliveries |
| `module/documents/combat.mjs` | `_cleanupAllSpellStatuses()`, `_processSpellStatuses()` (interactive Focus per-spell), `_dropFocusStatuses()` static method |
| `module/vagabond.mjs` | Button handlers: Imbue Damage, Imbue Status, Focus Maintain (Cast Check), Focus Drop, Focus Damage |
| `module/sheets/handlers/roll-handler.mjs` | Imbue detection on weapon attack, imbue data attached to `attackResult`, one-shot vs Focused imbue cleanup |
| `module/helpers/chat-card.mjs` | Imbue tag display, imbue damage/status buttons in weapon attack cards |
| `templates/item/details-parts/spell-details.hbs` | Effect Type, Status Condition, Crit Continual, Countdown Die UI (locked + unlocked views) |
| `lang/en.json` | Localization strings for all new spell fields |

#### Data Flow
```
Spell Cast (Status Effect)
  → _applySpellStatusCondition(spell, targets, isCritical)
  → Burning + countdownDie? → VagabondDamageHelper.checkOnHitBurning()
  → Non-burning + countdownDie? → checkOnHitBurning() with fake item
  → Simple status? → toggleStatusEffect() + track in spellStatuses flag

Imbue Cast
  → Hostile target selected → self-imbue caster's weapon
  → Friendly target selected → imbue ally's weapon (dialog if multiple)
  → Stores flags.vagabond.imbue on weapon item
  → On weapon hit: chat card shows imbue damage/status buttons
  → Non-Focused: imbue cleared after hit (one-shot)
  → Focused: imbue persists across hits

Focus at Round Start (_processSpellStatuses)
  → Continual → silently persist
  → Focused + friendly → silently persist, no cost
  → Focused + hostile → post interactive chat card per spell
    → "Roll Cast Check" → d20 vs DC, 1 mana, optional extra damage
    → "Drop Focus" → _dropFocusStatuses() removes statuses + Focus
  → Not Focused → auto-remove status
  → No mana → auto-remove status + Focus
```

#### Flag Structures
```javascript
// On target actor — tracks spell-inflicted statuses for Focus/cleanup:
flags.vagabond.spellStatuses = [{
  statusCondition: 'blinded',
  spellId: 'itemId123',
  spellName: 'Blind',
  casterId: 'actorId456',
  casterName: 'Wizard',
  continual: false,
  roundApplied: 3
}]

// On weapon item — imbued spell data:
flags.vagabond.imbue = {
  spellId: 'itemId123',
  spellName: 'Flame Blade',
  casterId: 'actorId456',
  damageType: 'fire',
  damageDice: 2,
  useFx: true,
  statusCondition: 'burning',
  countdownDie: 'd6',
  countdownDamageType: 'fire'
}
```

---

## Phase 4: Game Mechanics & Brawl/Grapple/Shove

### New Features

#### Flanking (Auto-Detect)
- **Automatic flanking detection** during combat — when 2+ allied tokens are Close (≤5 ft) to a foe, the foe becomes Vulnerable (Hindered attacks/saves, Favored incoming attacks).
- **Bidirectional** — heroes can flank NPCs and NPCs can flank heroes.
- **Size-aware** — the foe must be no more than one size larger than the flanking allies.
- **Smart cleanup** — flanking Vulnerable is tracked separately from manually-applied Vulnerable via a `flankingEffect` flag. Only the flanking-applied effect is removed when flanking ends.
- **Respects vagabond-crawler module** — defers to the module's flanking system if it's active.
- **Game setting** — `flankingEnabled` toggle in system settings (default: enabled).

#### Morale (Auto-Trigger)
- **Automatic morale checks** for NPCs during combat, triggered by:
  - First NPC death in the encounter
  - Half or more of the NPC group defeated
  - Leader killed (highest Threat Level among living NPCs)
  - Solo NPC (only combatant) reaching half HP
- NPCs with no morale value fight to the death.
- Results whispered to GM with a styled chat card showing individual pass/fail per NPC.
- State tracking resets on combat start.
- **Game setting** — `moraleEnabled` toggle (default: enabled).

#### Light Tracker
- **Torch/lantern/candle burn tracking** with real-time tick (1-second intervals, flush to world time every 20 seconds).
- **Supported light sources** — Torch, Lantern, Candle, Hooded Lantern, Bullseye Lantern (configurable fuel durations).
- **Context menu integration** — right-click inventory cards to Light or Extinguish items.
- **Canvas drop** — dropping a lit light source onto the canvas creates a temporary actor with light emission.
- **Token HUD pickup** — retrieve dropped light sources back to inventory.
- **GM panel** (`LightTrackerApp` using ApplicationV2) — view all party light sources, add/burn time, douse individual lights.
- **Stack splitting** — lighting a torch from a stack of 5 splits it into 4+1, lighting the single.
- **Socket support** — player actions route through GM for proper permission handling.
- **Game setting** — `lightTrackingEnabled` toggle (default: enabled).
- **Scene control button** — "Light Tracker" added to Vagabond Tools.

#### Stackable Consumables
- **Drag-drop stacking** — dragging identical consumables onto the same actor merges them by increasing quantity (matched by name, type, and image).
- **Quantity badge** — items with quantity > 1 display a `×N` badge on the inventory card.
- **Slot multiplication** — stacked items occupy `baseSlots × quantity` inventory slots.
- **Within-sheet stacking** — reordering items within the same actor also stacks matching items.

#### Weapon Range Validation
- **Melee weapons** blocked from attacking targets beyond 5 ft (10 ft with Long property).
- **Ranged property** — Hindered when attacking Close (≤5 ft) targets.
- **Thrown property** — melee weapon can attack at Near range; Hindered at Far range.
- **Near-range weapons** blocked beyond 30 ft.
- **Range band tag** in chat cards — shows Close/Near/Far with Hinder indicator.
- **Distance calculation** — edge-to-edge Chebyshev distance supporting multi-square tokens.

#### Brawl / Grapple / Shove System
- **Pre-roll intent dialog** — attacking with a Brawl or Shield weapon shows a dialog: Damage / Grapple / Shove (Shield weapons offer Damage / Shove only).
- **Size validation** — can only Grapple/Shove creatures your size or smaller. Shove uses a separate effective size for Vanguard overrides.
- **Grapple** — on hit, applies Restrained to the target with `grappledBy` flag tracking the grappler. Skips the damage button.
- **Shove** — on hit, shows Push 5' / Prone sub-choice. Push moves the target 1 grid square away from the attacker. Prone applies the Prone status.
- **Bully perk** — when grappling, auto-creates a "Grappled Creature" weapon (d8, 2H, Brawl property) on the attacker. The weapon is auto-deleted when Restrained is removed.
- **Fisticuffs (Pugilist)** — after a Favored hit with a Brawl weapon, shows post-hit Grapple/Shove buttons in the chat card (normal damage still applies).
- **Orc Beefy trait** — grants Favor on Grapple/Shove checks (auto-detected from ancestry traits).
- **Vanguard size override** — "considered Large/Huge for Shoves" (auto-detected from class feature descriptions).
- **Immunity checks** — respects `statusImmunities` for Restrained and Prone.
- **Prone status fix** — Prone now uses `incomingMeleeAttacksModifier` (melee-only Favor) instead of `incomingAttacksModifier` (all attacks Favored). This matches the Vagabond rulebook: Prone only benefits melee attackers, not ranged.

### Technical Details

#### New Files (4 files)

| File | Description |
|------|-------------|
| `module/helpers/flanking-helper.mjs` | Flanking detection, Vulnerable application/cleanup, debounced evaluation |
| `module/helpers/morale-helper.mjs` | Morale check triggers, leader detection, GM-whispered results |
| `module/helpers/light-tracker.mjs` | Light source tracking, real-time tick, canvas drop/pickup, GM panel |
| `templates/apps/light-tracker.hbs` | Light Tracker UI template |

#### Modified Files (8 files)

| File | Changes |
|------|---------|
| `module/vagabond.mjs` | Flanking/Morale/LightTracker init, 3 game settings, scene control button, Brawl Push/Prone/Grapple/Shove button handlers, Bully cleanup hook |
| `module/helpers/chat-card.mjs` | `brawlIntent` parameter, Grapple/Shove/Fisticuffs handling in `createActionCard`, brawl intent tag |
| `module/sheets/handlers/roll-handler.mjs` | Brawl intent dialog, size checks, Favor application, range validation block |
| `module/data/actor-character.mjs` | New fields: `incomingMeleeAttacksModifier`, `brawlCheckFavor`, `fisticuffs`, `shoveSizeOverride`, `hasBully`. New method: `_detectTraitAndFeatureFlags()` |
| `module/helpers/config.mjs` | Prone status: `incomingAttacksModifier` → `incomingMeleeAttacksModifier` |
| `module/helpers/target-helper.mjs` | `distanceFt()`, `getDistanceBand()`, `bandLabel()`, `validateWeaponRange()` |
| `module/documents/active-effect.mjs` | AE attribute choices for Brawl fields + `incomingMeleeAttacksModifier` |
| `module/sheets/handlers/inventory-handler.mjs` | Quantity badge display for stacked items |
| `module/sheets/actor-sheet.mjs` | Stackable drop logic in `_onDropItem()` |
| `module/data/base-equipment.mjs` | Slot multiplication for stacked items |
| `templates/actor/parts/inventory-card.hbs` | Quantity badge template |
| `css/vagabond.css` | Morale, Light Tracker, quantity badge, and range hinder tag styles |

#### Brawl Data Flow
```
Weapon Attack (Brawl/Shield property)
  → Size check: filter eligible Grapple/Shove targets
  → DialogV2: Damage / Grapple / Shove
  → Apply brawlCheckFavor / Bully Favor if applicable
  → Roll attack with modified favorHinder

On Hit:
  Grapple → createEmbeddedDocuments('ActiveEffect', Restrained + grappledBy flag)
          → Bully? createEmbeddedDocuments('Item', Grappled Creature weapon)
  Shove   → Chat buttons: Push 5' (move token) or Prone (toggleStatusEffect)
  Damage  → Normal damage button
          → Fisticuffs? Post-hit Grapple/Shove buttons

Cleanup:
  deleteActiveEffect hook → if Restrained removed, delete Bully weapon
```

#### Feature Detection (`_detectTraitAndFeatureFlags`)
```javascript
// Auto-detected from ancestry traits and class features:
Orc "Beefy" trait        → brawlCheckFavor = true
Pugilist "Fisticuffs"    → fisticuffs = true
Vanguard Shove overrides → shoveSizeOverride = 'large' / 'huge'
Bully perk               → hasBully = true
```

---

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
