/**
 * Active Effects Compendium — Population Helper
 *
 * Defines every effect item that belongs in the "effects" compendium and
 * provides a one-shot population method callable from a macro or the
 * system "ready" hook.
 *
 * Usage (macro):
 *   import { EffectsCompendium } from './module/helpers/effects-compendium.mjs';
 *   await EffectsCompendium.populate();
 *
 * Usage (console):
 *   vagabond.EffectsCompendium.populate();
 */

const SYSTEM_ID = 'vagabond';
const PACK_NAME = 'effects';

// ── Effect Definitions ─────────────────────────────────────────────────────
// Each entry becomes an Item of type "effect" with embedded Active Effects.
// The `effects` array uses Foundry V14 string-based change types:
//   "add", "subtract", "multiply", "override", "upgrade", "downgrade", "custom"

const EFFECT_DEFINITIONS = [

  // ══════════════════════════════════════════════════════════════════════════
  //  STATUS CONDITIONS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Dazed',
    img: 'icons/svg/sleep.svg',
    category: 'condition',
    description: "Can't Focus or Move unless it uses an Action to do so. Speed reduced to 0.",
    effects: [{
      name: 'Dazed',
      img: 'icons/svg/sleep.svg',
      statuses: ['dazed'],
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '-999' }
      ]
    }]
  },
  {
    name: 'Prone',
    img: 'icons/svg/falling.svg',
    category: 'condition',
    description: 'Speed = 0. Vulnerable to Melee Attacks and Dodge Checks.',
    effects: [{
      name: 'Prone',
      img: 'icons/svg/falling.svg',
      statuses: ['prone'],
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.incomingMeleeAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Frightened',
    img: 'icons/svg/hazard.svg',
    category: 'condition',
    description: '-2 penalty to all damage dealt.',
    effects: [{
      name: 'Frightened',
      img: 'icons/svg/hazard.svg',
      statuses: ['frightened'],
      changes: [
        { key: 'system.universalDamageBonus', mode: 2, value: '-2' }
      ]
    }]
  },
  {
    name: 'Sickened',
    img: 'icons/svg/poison.svg',
    category: 'condition',
    description: '-2 penalty to any healing received.',
    effects: [{
      name: 'Sickened',
      img: 'icons/svg/poison.svg',
      statuses: ['sickened'],
      changes: [
        { key: 'system.incomingHealingModifier', mode: 2, value: '-2' }
      ]
    }]
  },
  {
    name: 'Confused',
    img: 'icons/svg/daze.svg',
    category: 'condition',
    description: 'Checks and Saves have Hinder. Saves against its Actions have Favor.',
    effects: [{
      name: 'Confused',
      img: 'icons/svg/daze.svg',
      statuses: ['confused'],
      changes: [
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Vulnerable',
    img: 'icons/svg/downgrade.svg',
    category: 'condition',
    description: 'Attacks and saves have Hinder. Attacks targeting it have Favor. Saves against its attacks have Favor.',
    effects: [{
      name: 'Vulnerable',
      img: 'icons/svg/downgrade.svg',
      statuses: ['vulnerable'],
      changes: [
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Blinded',
    img: 'icons/svg/blind.svg',
    category: 'condition',
    description: "Can't see. Vulnerable.",
    effects: [{
      name: 'Blinded',
      img: 'icons/svg/blind.svg',
      statuses: ['blinded'],
      changes: [
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Invisible',
    img: 'icons/svg/invisible.svg',
    category: 'condition',
    description: "Can't be seen. Attackers act as Blinded (attacks Hindered).",
    effects: [{
      name: 'Invisible',
      img: 'icons/svg/invisible.svg',
      statuses: ['invisible'],
      changes: [
        { key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Restrained',
    img: 'icons/svg/net.svg',
    category: 'condition',
    description: 'Vulnerable + Speed = 0.',
    effects: [{
      name: 'Restrained',
      img: 'icons/svg/net.svg',
      statuses: ['restrained'],
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Incapacitated',
    img: 'icons/svg/unconscious.svg',
    category: 'condition',
    description: "Can't Focus, use Actions, or Move. Auto-fails Might and Dexterity checks. Vulnerable. Speed = 0.",
    effects: [{
      name: 'Incapacitated',
      img: 'icons/svg/unconscious.svg',
      statuses: ['incapacitated'],
      changes: [
        { key: 'system.autoFailStats', mode: 2, value: 'might' },
        { key: 'system.autoFailStats', mode: 2, value: 'dexterity' },
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Paralyzed',
    img: 'icons/svg/paralysis.svg',
    category: 'condition',
    description: 'Incapacitated + Speed = 0.',
    effects: [{
      name: 'Paralyzed',
      img: 'icons/svg/paralysis.svg',
      statuses: ['paralyzed'],
      changes: [
        { key: 'system.autoFailStats', mode: 2, value: 'might' },
        { key: 'system.autoFailStats', mode: 2, value: 'dexterity' },
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Unconscious',
    img: 'icons/svg/sleep.svg',
    category: 'condition',
    description: 'Blinded + Incapacitated + Prone. Close Attacks always Crit.',
    effects: [{
      name: 'Unconscious',
      img: 'icons/svg/sleep.svg',
      statuses: ['unconscious'],
      changes: [
        { key: 'system.autoFailStats', mode: 2, value: 'might' },
        { key: 'system.autoFailStats', mode: 2, value: 'dexterity' },
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' },
        { key: 'system.defenderStatusModifiers.closeAttacksAutoCrit', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Dead',
    img: 'icons/svg/skull.svg',
    category: 'condition',
    description: 'Automatically fails ALL rolls. Incapacitated. Speed = 0.',
    effects: [{
      name: 'Dead',
      img: 'icons/svg/skull.svg',
      statuses: ['dead'],
      changes: [
        { key: 'system.autoFailAllRolls', mode: 5, value: 'true' },
        { key: 'system.speed.bonus', mode: 2, value: '-999' },
        { key: 'system.favorHinder', mode: 5, value: 'hinder' },
        { key: 'system.incomingAttacksModifier', mode: 5, value: 'favor' },
        { key: 'system.outgoingSavesModifier', mode: 5, value: 'favor' }
      ]
    }]
  },

  // Non-automated status conditions (manual tracking / reminder items)
  {
    name: 'Berserk',
    img: 'icons/svg/terror.svg',
    category: 'condition',
    description: "Can't take Cast Action or Focus. Doesn't make Morale Checks. Can't be Frightened. Barbarian Rage: dice upsize, explode, and damage reduction while active.",
    effects: [{
      name: 'Berserk',
      img: 'icons/svg/terror.svg',
      statuses: ['berserk'],
      changes: []
    }]
  },
  {
    name: 'Burning',
    img: 'icons/svg/fire.svg',
    category: 'condition',
    description: 'Takes damage at the start of its turn. Can be ended by an appropriate action.',
    effects: [{
      name: 'Burning',
      img: 'icons/svg/fire.svg',
      statuses: ['burning'],
      changes: []
    }]
  },
  {
    name: 'Charmed',
    img: 'icons/svg/heal.svg',
    category: 'condition',
    description: "Can't willingly make an Attack Action targeting the one who Charmed it.",
    effects: [{
      name: 'Charmed',
      img: 'icons/svg/heal.svg',
      statuses: ['charmed'],
      changes: []
    }]
  },
  {
    name: 'Focusing',
    img: 'icons/svg/aura.svg',
    category: 'condition',
    description: 'Currently sustaining one or more spells through Focus.',
    effects: [{
      name: 'Focusing',
      img: 'icons/svg/aura.svg',
      statuses: ['focusing'],
      changes: []
    }]
  },
  {
    name: 'Fatigued',
    img: 'icons/svg/degen.svg',
    category: 'condition',
    description: "Each Fatigue occupies an Item Slot. At 3+ Fatigue, can't Rush. At 5 Fatigue, dies.",
    effects: [{
      name: 'Fatigued',
      img: 'icons/svg/degen.svg',
      statuses: ['fatigued'],
      changes: []
    }]
  },
  {
    name: 'Suffocating',
    img: 'icons/svg/stoned.svg',
    category: 'condition',
    description: "After not breathing for 1 minute, each round: Heroes roll d8 (if >= Might, gain 1 Fatigue), Enemies gain 1 Fatigue.",
    effects: [{
      name: 'Suffocating',
      img: 'icons/svg/stoned.svg',
      statuses: ['suffocating'],
      changes: []
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  COMBAT BUFFS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Favored (All Rolls)',
    img: 'icons/svg/upgrade.svg',
    category: 'buff',
    description: 'All d20 rolls have Favor (roll 2d20, take higher).',
    durationHint: 'Until removed',
    effects: [{
      name: 'Favored (All Rolls)',
      img: 'icons/svg/upgrade.svg',
      changes: [
        { key: 'system.favorHinder', mode: 5, value: 'favor' }
      ]
    }]
  },
  {
    name: 'Hindered (All Rolls)',
    img: 'icons/svg/downgrade.svg',
    category: 'debuff',
    description: 'All d20 rolls have Hinder (roll 2d20, take lower).',
    durationHint: 'Until removed',
    effects: [{
      name: 'Hindered (All Rolls)',
      img: 'icons/svg/downgrade.svg',
      changes: [
        { key: 'system.favorHinder', mode: 5, value: 'hinder' }
      ]
    }]
  },
  {
    name: 'Damage Bonus (+1)',
    img: 'icons/svg/sword.svg',
    category: 'buff',
    description: '+1 flat bonus to all damage dealt.',
    effects: [{
      name: 'Damage Bonus (+1)',
      img: 'icons/svg/sword.svg',
      changes: [
        { key: 'system.universalDamageBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Damage Bonus (+2)',
    img: 'icons/svg/sword.svg',
    category: 'buff',
    description: '+2 flat bonus to all damage dealt.',
    effects: [{
      name: 'Damage Bonus (+2)',
      img: 'icons/svg/sword.svg',
      changes: [
        { key: 'system.universalDamageBonus', mode: 2, value: '2' }
      ]
    }]
  },
  {
    name: 'Damage Penalty (-2)',
    img: 'icons/svg/hazard.svg',
    category: 'debuff',
    description: '-2 flat penalty to all damage dealt.',
    effects: [{
      name: 'Damage Penalty (-2)',
      img: 'icons/svg/hazard.svg',
      changes: [
        { key: 'system.universalDamageBonus', mode: 2, value: '-2' }
      ]
    }]
  },
  {
    name: 'Armor Bonus (+1)',
    img: 'icons/svg/shield.svg',
    category: 'buff',
    description: '+1 bonus to Armor value.',
    effects: [{
      name: 'Armor Bonus (+1)',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Armor Bonus (+2)',
    img: 'icons/svg/shield.svg',
    category: 'buff',
    description: '+2 bonus to Armor value.',
    effects: [{
      name: 'Armor Bonus (+2)',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '2' }
      ]
    }]
  },
  {
    name: 'Speed Bonus (+10ft)',
    img: 'icons/svg/wingfoot.svg',
    category: 'buff',
    description: '+10ft bonus to Speed.',
    effects: [{
      name: 'Speed Bonus (+10ft)',
      img: 'icons/svg/wingfoot.svg',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '10' }
      ]
    }]
  },
  {
    name: 'Speed Penalty (-10ft)',
    img: 'icons/svg/anchor.svg',
    category: 'debuff',
    description: '-10ft penalty to Speed.',
    effects: [{
      name: 'Speed Penalty (-10ft)',
      img: 'icons/svg/anchor.svg',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '-10' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  WEAPON ENHANCEMENTS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Weapon: Melee Damage Die +1 Step',
    img: 'icons/svg/combat.svg',
    category: 'weapon',
    description: 'Melee weapon damage die increases by one step (d4 -> d6 -> d8 -> d10 -> d12).',
    effects: [{
      name: 'Melee Damage Die +1 Step',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.meleeDamageDieSizeBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Weapon: Ranged Damage Die +1 Step',
    img: 'icons/svg/combat.svg',
    category: 'weapon',
    description: 'Ranged weapon damage die increases by one step.',
    effects: [{
      name: 'Ranged Damage Die +1 Step',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.rangedDamageDieSizeBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Weapon: Melee Crit Range -1',
    img: 'icons/svg/target.svg',
    category: 'weapon',
    description: 'Melee weapon critical hit threshold reduced by 1 (e.g. 20 -> 19).',
    effects: [{
      name: 'Melee Crit Range -1',
      img: 'icons/svg/target.svg',
      changes: [
        { key: 'system.meleeCritBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Weapon: Ranged Crit Range -1',
    img: 'icons/svg/target.svg',
    category: 'weapon',
    description: 'Ranged weapon critical hit threshold reduced by 1.',
    effects: [{
      name: 'Ranged Crit Range -1',
      img: 'icons/svg/target.svg',
      changes: [
        { key: 'system.rangedCritBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Weapon: +1 Weapon Damage',
    img: 'icons/svg/sword.svg',
    category: 'weapon',
    description: '+1 flat damage bonus to weapon attacks.',
    effects: [{
      name: '+1 Weapon Damage',
      img: 'icons/svg/sword.svg',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Weapon: +1d4 Weapon Damage',
    img: 'icons/svg/sword.svg',
    category: 'weapon',
    description: '+1d4 bonus dice to weapon damage.',
    effects: [{
      name: '+1d4 Weapon Damage',
      img: 'icons/svg/sword.svg',
      changes: [
        { key: 'system.universalWeaponDamageDice', mode: 2, value: '1d4' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SPELL ENHANCEMENTS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Spell: +1 Spell Damage',
    img: 'icons/svg/fire.svg',
    category: 'buff',
    description: '+1 flat damage bonus to spell damage.',
    effects: [{
      name: '+1 Spell Damage',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.universalSpellDamageBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Spell: Damage Die +1 Step',
    img: 'icons/svg/fire.svg',
    category: 'buff',
    description: 'Spell damage die increases by one step.',
    effects: [{
      name: 'Spell Damage Die +1 Step',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.spellDamageDieSizeBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Spell: Crit Range -1',
    img: 'icons/svg/target.svg',
    category: 'buff',
    description: 'Spell critical hit threshold reduced by 1.',
    effects: [{
      name: 'Spell Crit Range -1',
      img: 'icons/svg/target.svg',
      changes: [
        { key: 'system.spellCritBonus', mode: 2, value: '1' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  MATERIAL BONUSES (drag onto equipment items)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Material: Adamant (Weapon)',
    img: 'icons/svg/combat.svg',
    category: 'material',
    description: 'Adamant weapon: +1 damage. Occupies 1 extra slot. Cost x50.',
    effects: [{
      name: 'Adamant Weapon',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Material: Adamant (Armor)',
    img: 'icons/svg/shield.svg',
    category: 'material',
    description: 'Adamant armor: +1 Armor. Occupies 1 extra slot. Cost x50.',
    effects: [{
      name: 'Adamant Armor',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Material: Mythral',
    img: 'icons/svg/wingfoot.svg',
    category: 'material',
    description: 'Mythral: occupies 1 fewer slot (minimum 1). Cost x50.',
    effects: [{
      name: 'Mythral',
      img: 'icons/svg/wingfoot.svg',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '1' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  WEAPON PROPERTIES (from compendium weapons)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Weapon: Keen (Crit 19+)',
    img: 'icons/svg/target.svg',
    category: 'weapon',
    description: 'Keen property: critical hits on 19 or 20.',
    effects: [{
      name: 'Keen Property',
      img: 'icons/svg/target.svg',
      changes: [
        { key: 'system.critNumber', mode: 5, value: '19' }
      ],
      flags: { vagabond: { applicationMode: 'on-use' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC ENCHANTMENTS (from relic compendium)
  // ══════════════════════════════════════════════════════════════════════════

  // Weapon Damage Tiers
  {
    name: 'Bonus - Weapon +1',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted weapon: +1 damage to weapon attacks.',
    effects: [{
      name: '+1 Attack Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Weapon +2',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted weapon: +2 damage to weapon attacks.',
    effects: [{
      name: '+2 Attack Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Weapon +3',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted weapon: +3 damage to weapon attacks.',
    effects: [{
      name: '+3 Attack Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // Armor Tiers
  {
    name: 'Bonus - Armor +1',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted armor: +1 Armor bonus.',
    effects: [{
      name: 'Armor +1',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Armor +2',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted armor: +2 Armor bonus.',
    effects: [{
      name: 'Armor +2',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Armor +3',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted armor: +3 Armor bonus.',
    effects: [{
      name: 'Armor +3',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // Trinket (Spell Damage) Tiers
  {
    name: 'Bonus - Trinket +1',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted trinket: +1 spell damage.',
    effects: [{
      name: '+1 Spell Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalSpellDamageBonus', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Trinket +2',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted trinket: +2 spell damage.',
    effects: [{
      name: '+2 Spell Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalSpellDamageBonus', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Trinket +3',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted trinket: +3 spell damage.',
    effects: [{
      name: '+3 Spell Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalSpellDamageBonus', mode: 2, value: '3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // Protection (All Saves) Tiers
  {
    name: 'Bonus - Protection +1',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted protection: +1 to all saves (Reflex, Endure, Will).',
    effects: [{
      name: 'Protection +1',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '1' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '1' },
        { key: 'system.saves.will.bonus', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Protection +2',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted protection: +2 to all saves (Reflex, Endure, Will).',
    effects: [{
      name: 'Protection +2',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '2' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '2' },
        { key: 'system.saves.will.bonus', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Bonus - Protection +3',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted protection: +3 to all saves (Reflex, Endure, Will).',
    effects: [{
      name: 'Protection +3',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '3' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '3' },
        { key: 'system.saves.will.bonus', mode: 2, value: '3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // Swiftness Tiers
  {
    name: 'Movement - Swiftness I',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted swiftness: +5 feet to Speed.',
    effects: [{
      name: '+5 Speed',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '5' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Movement - Swiftness II',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted swiftness: +10 feet to Speed.',
    effects: [{
      name: '+10 Speed',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '10' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Movement - Swiftness III',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted swiftness: +15 feet to Speed.',
    effects: [{
      name: '+15 Speed',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '15' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // Strike Tiers (bonus damage dice)
  {
    name: 'Strike - Strike I',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted strike: +1d4 bonus weapon damage die.',
    effects: [{
      name: '+d4 Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageDice', mode: 2, value: '1d4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Strike - Strike II',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted strike: +1d6 bonus weapon damage die.',
    effects: [{
      name: '+d6 Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageDice', mode: 2, value: '1d6' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Strike - Strike III',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted strike: +1d8 bonus weapon damage die.',
    effects: [{
      name: '+d8 Dmg',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.universalWeaponDamageDice', mode: 2, value: '1d8' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CURSED ITEMS (from relic compendium)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Cursed - Weakness -1',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed weapon: -1 weapon damage.',
    effects: [{
      name: 'Weakness -1',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '-1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Cursed - Weakness -2',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed weapon: -2 weapon damage.',
    effects: [{
      name: 'Weakness -2',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '-2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Cursed - Weakness -3',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed weapon: -3 weapon damage.',
    effects: [{
      name: 'Weakness -3',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.universalWeaponDamageBonus', mode: 2, value: '-3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Cursed - Vulnerability -1',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed armor: -1 Armor.',
    effects: [{
      name: 'Vulnerability -1',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '-1' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Cursed - Vulnerability -2',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed armor: -2 Armor.',
    effects: [{
      name: 'Vulnerability -2',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '-2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Cursed - Vulnerability -3',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed armor: -3 Armor.',
    effects: [{
      name: 'Vulnerability -3',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '-3' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: HOLDING (bonus item slots)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Utility - Holding I',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted holding: grants +2 bonus Item Slots.',
    effects: [{
      name: 'Holding I',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Holding II',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted holding: grants +4 bonus Item Slots.',
    effects: [{
      name: 'Holding II',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Holding III',
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    category: 'relic',
    description: 'Enchanted holding: grants +6 bonus Item Slots.',
    effects: [{
      name: 'Holding III',
      img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '6' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: DISPLACEMENT
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Movement - Displacement',
    img: 'icons/magic/control/debuff-chains-ropes-purple.webp',
    category: 'relic',
    description: 'Sight-based attacks against the wearer are made as if the attacker is Blinded (attacks Hindered).',
    effects: [{
      name: 'Displacement',
      img: 'icons/magic/control/debuff-chains-ropes-purple.webp',
      changes: [
        { key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: INVISIBILITY
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Utility - Invisibility I',
    img: 'icons/svg/invisible.svg',
    category: 'relic',
    description: 'Skip Move to become Invisible until after taking an Action.',
    effects: [{
      name: 'Invisibility I',
      img: 'icons/svg/invisible.svg',
      statuses: ['invisible'],
      changes: [
        { key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'invisibility-i' } }
    }]
  },
  {
    name: 'Utility - Invisibility II',
    img: 'icons/svg/invisible.svg',
    category: 'relic',
    description: 'Wearer is permanently Invisible while equipped.',
    effects: [{
      name: 'Invisibility II',
      img: 'icons/svg/invisible.svg',
      statuses: ['invisible'],
      changes: [
        { key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'invisibility-ii' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: ACE WEAPON PROPERTIES
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Ace - Keen',
    img: 'icons/svg/target.svg',
    category: 'relic',
    description: 'Ace property: critical hit threshold reduced by 2 instead of 1 (e.g. 20 → 18).',
    effects: [{
      name: 'Ace - Keen',
      img: 'icons/svg/target.svg',
      changes: [
        { key: 'system.meleeCritBonus', mode: 2, value: '2' },
        { key: 'system.rangedCritBonus', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Ace - Brutal',
    img: 'icons/svg/combat.svg',
    category: 'relic',
    description: 'Ace property: deals an extra damage die from the Brutal property.',
    effects: [{
      name: 'Ace - Brutal',
      img: 'icons/svg/combat.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'ace-brutal', extraWeaponDie: true } }
    }]
  },
  {
    name: 'Ace - Thrown',
    img: 'icons/svg/combat.svg',
    category: 'relic',
    description: 'Ace property: deals an extra damage die when attacking by throwing it.',
    effects: [{
      name: 'Ace - Thrown',
      img: 'icons/svg/combat.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'on-use', relicPower: 'ace-thrown', extraWeaponDie: true } }
    }]
  },
  {
    name: 'Ace - Long',
    img: 'icons/svg/wingfoot.svg',
    category: 'relic',
    description: 'Ace property: weapon range is 10 feet further, rather than 5 feet further.',
    effects: [{
      name: 'Ace - Long',
      img: 'icons/svg/wingfoot.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'ace-long' } }
    }]
  },
  {
    name: 'Ace - Cleave',
    img: 'icons/svg/combat.svg',
    category: 'relic',
    description: 'Ace property: can deal full damage to two Targets.',
    effects: [{
      name: 'Ace - Cleave',
      img: 'icons/svg/combat.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'on-use', relicPower: 'ace-cleave' } }
    }]
  },
  {
    name: 'Ace - Entangle',
    img: 'icons/svg/net.svg',
    category: 'relic',
    description: 'Ace property: target is considered Vulnerable for ending the Restrained status.',
    effects: [{
      name: 'Ace - Entangle',
      img: 'icons/svg/net.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'on-use', relicPower: 'ace-entangle' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: RESISTANCE POWERS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Resistance - Bravery',
    img: 'icons/svg/holy-shield.svg',
    category: 'relic',
    description: 'Grants Favor on Saves against the Frightened status.',
    effects: [{
      name: 'Bravery',
      img: 'icons/svg/holy-shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'resistance-bravery', favorOnSaveVs: 'frightened' } }
    }]
  },
  {
    name: 'Resistance - Clarity',
    img: 'icons/svg/holy-shield.svg',
    category: 'relic',
    description: 'Grants Favor on Saves against the Confused status.',
    effects: [{
      name: 'Clarity',
      img: 'icons/svg/holy-shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'resistance-clarity', favorOnSaveVs: 'confused' } }
    }]
  },
  {
    name: 'Resistance - Repulsing',
    img: 'icons/svg/holy-shield.svg',
    category: 'relic',
    description: 'Grants Favor on Saves against the Charmed status.',
    effects: [{
      name: 'Repulsing',
      img: 'icons/svg/holy-shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'resistance-repulsing', favorOnSaveVs: 'charmed' } }
    }]
  },
  {
    name: 'Resistance - Resistance',
    img: 'icons/svg/shield.svg',
    category: 'relic',
    description: 'Favor on Saves and damage reduction against a specific damage source (e.g. fire, cold). Set the source in the effect name.',
    effects: [{
      name: 'Resistance (Type)',
      img: 'icons/svg/shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'resistance-typed' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: CURSED — STATUS AUTO-FAIL
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Cursed - Anger',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed: wearer always fails Saves against Berserk.',
    effects: [{
      name: 'Cursed Anger',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'cursed-anger', autoFailSaveVs: 'berserk' } }
    }]
  },
  {
    name: 'Cursed - Cowardice',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed: wearer always fails Saves against Frightened.',
    effects: [{
      name: 'Cursed Cowardice',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'cursed-cowardice', autoFailSaveVs: 'frightened' } }
    }]
  },
  {
    name: 'Cursed - Gullibility',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed: wearer always fails Saves against Charmed.',
    effects: [{
      name: 'Cursed Gullibility',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'cursed-gullibility', autoFailSaveVs: 'charmed' } }
    }]
  },
  {
    name: 'Cursed - Doom',
    img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
    category: 'relic',
    description: 'Cursed: wearer only regains 1 Hit Point per die used for healing rolls targeting it.',
    effects: [{
      name: 'Cursed Doom',
      img: 'icons/magic/control/buff-flight-wings-runes-red-yellow.webp',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'cursed-doom', healingCappedPerDie: 1 } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: UTILITY — ON-HIT EFFECTS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Utility - Burning I',
    img: 'icons/svg/fire.svg',
    category: 'relic',
    description: 'On hit: target gains Burning with a Cd4 countdown die. Automated — applies Burning status and creates countdown die on damage dealt.',
    effects: [{
      name: 'Burning I',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.onHitBurningDice', mode: 5, value: 'd4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Burning II',
    img: 'icons/svg/fire.svg',
    category: 'relic',
    description: 'On hit: target gains Burning with a Cd6 countdown die. Automated — applies Burning status and creates countdown die on damage dealt.',
    effects: [{
      name: 'Burning II',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.onHitBurningDice', mode: 5, value: 'd6' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Burning III',
    img: 'icons/svg/fire.svg',
    category: 'relic',
    description: 'On hit: target gains Burning with a Cd8 countdown die. Automated — applies Burning status and creates countdown die on damage dealt.',
    effects: [{
      name: 'Burning III',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.onHitBurningDice', mode: 5, value: 'd8' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: UTILITY — ON-KILL EFFECTS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Utility - Lifesteal I',
    img: 'icons/svg/blood.svg',
    category: 'relic',
    description: 'On kill: wielder heals for 1d8 HP. Automated — heals attacker when target reaches 0 HP.',
    effects: [{
      name: 'Lifesteal I',
      img: 'icons/svg/blood.svg',
      changes: [
        { key: 'system.onKillHealDice', mode: 2, value: '1d8' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Lifesteal II',
    img: 'icons/svg/blood.svg',
    category: 'relic',
    description: 'On kill: wielder heals for 2d8 HP. Automated — heals attacker when target reaches 0 HP.',
    effects: [{
      name: 'Lifesteal II',
      img: 'icons/svg/blood.svg',
      changes: [
        { key: 'system.onKillHealDice', mode: 2, value: '2d8' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Lifesteal III',
    img: 'icons/svg/blood.svg',
    category: 'relic',
    description: 'On kill: wielder heals for 3d8 HP. Automated — heals attacker when target reaches 0 HP.',
    effects: [{
      name: 'Lifesteal III',
      img: 'icons/svg/blood.svg',
      changes: [
        { key: 'system.onKillHealDice', mode: 2, value: '3d8' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Manasteal I',
    img: 'icons/svg/aura.svg',
    category: 'relic',
    description: 'On kill: bound wielder restores 1d4 Mana. Automated — restores mana when target reaches 0 HP.',
    effects: [{
      name: 'Manasteal I',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.onKillManaDice', mode: 2, value: '1d4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Manasteal II',
    img: 'icons/svg/aura.svg',
    category: 'relic',
    description: 'On kill: bound wielder restores 2d4 Mana. Automated — restores mana when target reaches 0 HP.',
    effects: [{
      name: 'Manasteal II',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.onKillManaDice', mode: 2, value: '2d4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },
  {
    name: 'Utility - Manasteal III',
    img: 'icons/svg/aura.svg',
    category: 'relic',
    description: 'On kill: bound wielder restores 3d4 Mana. Automated — restores mana when target reaches 0 HP.',
    effects: [{
      name: 'Manasteal III',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.onKillManaDice', mode: 2, value: '3d4' }
      ],
      flags: { vagabond: { applicationMode: 'when-equipped' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: MOVEMENT POWERS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Movement - Climbing',
    img: 'icons/svg/upgrade.svg',
    category: 'relic',
    description: 'Wearer gains Climb movement.',
    effects: [{
      name: 'Climbing',
      img: 'icons/svg/upgrade.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'climbing', grantedMovement: 'climb' } }
    }]
  },
  {
    name: 'Movement - Clinging',
    img: 'icons/svg/upgrade.svg',
    category: 'relic',
    description: 'Wearer gains Cling movement (walk on walls/ceilings).',
    effects: [{
      name: 'Clinging',
      img: 'icons/svg/upgrade.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'clinging', grantedMovement: 'cling' } }
    }]
  },
  {
    name: 'Movement - Flying',
    img: 'icons/svg/wingfoot.svg',
    category: 'relic',
    description: 'Wearer gains Fly movement.',
    effects: [{
      name: 'Flying',
      img: 'icons/svg/wingfoot.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'flying', grantedMovement: 'fly' } }
    }]
  },
  {
    name: 'Movement - Levitation',
    img: 'icons/svg/wingfoot.svg',
    category: 'relic',
    description: 'Wearer can Fly up or down, but not laterally (Levitate spell effect).',
    effects: [{
      name: 'Levitation',
      img: 'icons/svg/wingfoot.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'levitation', grantedMovement: 'levitate' } }
    }]
  },
  {
    name: 'Movement - Blinking',
    img: 'icons/svg/mystery-man.svg',
    category: 'relic',
    description: 'Wearer is under the effects of the Blink spell.',
    effects: [{
      name: 'Blinking',
      img: 'icons/svg/mystery-man.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'blinking' } }
    }]
  },
  {
    name: 'Movement - Waterwalk',
    img: 'icons/svg/wingfoot.svg',
    category: 'relic',
    description: 'Wearer can walk on liquids.',
    effects: [{
      name: 'Waterwalk',
      img: 'icons/svg/wingfoot.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'waterwalk', grantedMovement: 'waterwalk' } }
    }]
  },
  {
    name: 'Movement - Webwalk',
    img: 'icons/svg/wingfoot.svg',
    category: 'relic',
    description: 'Wearer ignores Difficult Terrain of webs, and cannot be Restrained by them.',
    effects: [{
      name: 'Webwalk',
      img: 'icons/svg/wingfoot.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'webwalk', grantedMovement: 'webwalk' } }
    }]
  },
  {
    name: 'Movement - Jumping I',
    img: 'icons/svg/upgrade.svg',
    category: 'relic',
    description: "Wearer's horizontal jump distance is multiplied by 2.",
    effects: [{
      name: 'Jumping I',
      img: 'icons/svg/upgrade.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'jumping-i', jumpMultiplier: 2 } }
    }]
  },
  {
    name: 'Movement - Jumping II',
    img: 'icons/svg/upgrade.svg',
    category: 'relic',
    description: "Wearer's horizontal jump distance is multiplied by 3.",
    effects: [{
      name: 'Jumping II',
      img: 'icons/svg/upgrade.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'jumping-ii', jumpMultiplier: 3 } }
    }]
  },
  {
    name: 'Movement - Jumping III',
    img: 'icons/svg/upgrade.svg',
    category: 'relic',
    description: "Wearer's horizontal jump distance is multiplied by 4.",
    effects: [{
      name: 'Jumping III',
      img: 'icons/svg/upgrade.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'jumping-iii', jumpMultiplier: 4 } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: SENSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Senses - Nightvision',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants Darksight (see in darkness).',
    effects: [{
      name: 'Darksight',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'darksight', grantedSense: 'darksight' } }
    }]
  },
  {
    name: 'Senses - Echolocation',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants Echolocation.',
    effects: [{
      name: 'Echolocation',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'echolocation', grantedSense: 'echolocation' } }
    }]
  },
  {
    name: 'Senses - Tremors',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants Seismicsense (Bound).',
    effects: [{
      name: 'Tremors',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'tremors', grantedSense: 'seismicsense' } }
    }]
  },
  {
    name: 'Senses - Telepathy',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants Telepathy (Bound).',
    effects: [{
      name: 'Telepathy',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'telepathy', grantedSense: 'telepathy' } }
    }]
  },
  {
    name: 'Senses - True-Seeing',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants All-Sight (Bound) — see through illusions and invisibility.',
    effects: [{
      name: 'True-Seeing',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'true-seeing', grantedSense: 'allsight' } }
    }]
  },
  {
    name: 'Senses - Detection',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Grants All-Sight to see a specific Being Type (Bound).',
    effects: [{
      name: 'Detection',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'detection', grantedSense: 'detection' } }
    }]
  },
  {
    name: 'Senses - Sense Life',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Senses Small and larger Beings within Far who are not Artificials or Undead.',
    effects: [{
      name: 'Sense Life',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'sense-life', grantedSense: 'senselife' } }
    }]
  },
  {
    name: 'Senses - Sense Valuables',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: 'Senses gold and gems within Near.',
    effects: [{
      name: 'Sense Valuables',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'sense-valuables', grantedSense: 'sensevaluables' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: UTILITY — MISC POWERS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Utility - Warning',
    img: 'icons/svg/eye.svg',
    category: 'relic',
    description: "Bound Being can't be surprised, and is awoken if foes are Near.",
    effects: [{
      name: 'Warning',
      img: 'icons/svg/eye.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'warning' } }
    }]
  },
  {
    name: 'Utility - Loyalty',
    img: 'icons/svg/combat.svg',
    category: 'relic',
    description: 'Magically returns to the Bound wielder\'s hand if thrown to attack.',
    effects: [{
      name: 'Loyalty',
      img: 'icons/svg/combat.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'loyalty' } }
    }]
  },
  {
    name: 'Utility - Aqua Lung',
    img: 'icons/svg/aura.svg',
    category: 'relic',
    description: 'Wearer can breathe water.',
    effects: [{
      name: 'Aqua Lung',
      img: 'icons/svg/aura.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'aqua-lung' } }
    }]
  },
  {
    name: 'Utility - Store Spell',
    img: 'icons/svg/aura.svg',
    category: 'relic',
    description: 'Reduce Caster\'s Maximum Mana to store a Casting of a Spell in the item.',
    effects: [{
      name: 'Store Spell',
      img: 'icons/svg/aura.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'store-spell' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: UTILITY — LIGHT EMISSION
  // ══════════════════════════════════════════════════════════════════════════

  ...['I', 'II', 'III'].map((tier, idx) => {
    const ranges = ['Close', 'Near', 'Far'];
    return {
      name: `Utility - Radiant ${tier} (Sunlight, ${ranges[idx]})`,
      img: 'icons/svg/sun.svg',
      category: 'relic',
      description: `Sheds Sunlight out to ${ranges[idx]} while Equipped.`,
      effects: [{
        name: `Radiant ${tier}`,
        img: 'icons/svg/sun.svg',
        changes: [],
        flags: { vagabond: { applicationMode: 'when-equipped', relicPower: `radiant-${idx + 1}`, lightType: 'sunlight', lightRange: ranges[idx].toLowerCase() } }
      }]
    };
  }),

  ...['I', 'II', 'III'].map((tier, idx) => {
    const ranges = ['Close', 'Near', 'Far'];
    return {
      name: `Utility - Moonlit ${tier} (Moonlight, ${ranges[idx]})`,
      img: 'icons/svg/sun.svg',
      category: 'relic',
      description: `Sheds Moonlight out to ${ranges[idx]} while Equipped.`,
      effects: [{
        name: `Moonlit ${tier}`,
        img: 'icons/svg/sun.svg',
        changes: [],
        flags: { vagabond: { applicationMode: 'when-equipped', relicPower: `moonlit-${idx + 1}`, lightType: 'moonlight', lightRange: ranges[idx].toLowerCase() } }
      }]
    };
  }),

  ...['I', 'II', 'III'].map((tier, idx) => {
    const ranges = ['Close', 'Near', 'Far'];
    return {
      name: `Utility - Darkness ${tier} (${ranges[idx]})`,
      img: 'icons/svg/skull.svg',
      category: 'relic',
      description: `Darkens non-magical light within ${ranges[idx]} while Equipped.`,
      effects: [{
        name: `Darkness ${tier}`,
        img: 'icons/svg/skull.svg',
        changes: [],
        flags: { vagabond: { applicationMode: 'when-equipped', relicPower: `darkness-${idx + 1}`, lightType: 'darkness', lightRange: ranges[idx].toLowerCase() } }
      }]
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: FABLED POWERS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Fabled - Benediction',
    img: 'icons/svg/heal.svg',
    category: 'relic',
    description: 'Immediately revived upon death by dropping to 0 HP, once per week.',
    effects: [{
      name: 'Benediction',
      img: 'icons/svg/heal.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'benediction' } }
    }]
  },
  {
    name: 'Fabled - Precision',
    img: 'icons/svg/target.svg',
    category: 'relic',
    description: 'Once per day, gain Favor on attacks for 1 minute, or until you miss.',
    effects: [{
      name: 'Precision',
      img: 'icons/svg/target.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'precision' } }
    }]
  },
  {
    name: 'Fabled - Vicious',
    img: 'icons/svg/sword.svg',
    category: 'relic',
    description: 'On a Crit, the target takes extra damage equal to twice its HD.',
    effects: [{
      name: 'Vicious',
      img: 'icons/svg/sword.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'on-use', relicPower: 'vicious' } }
    }]
  },
  {
    name: 'Fabled - Vorpal',
    img: 'icons/svg/sword.svg',
    category: 'relic',
    description: 'Behead Target on Crit if the Target takes the damage.',
    effects: [{
      name: 'Vorpal',
      img: 'icons/svg/sword.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'on-use', relicPower: 'vorpal' } }
    }]
  },
  {
    name: 'Fabled - Soul Eater',
    img: 'icons/svg/skull.svg',
    category: 'relic',
    description: "Those killed by it can't be resurrected unless a wish is granted to do so.",
    effects: [{
      name: 'Soul Eater',
      img: 'icons/svg/skull.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'soul-eater' } }
    }]
  },
  {
    name: 'Fabled - Blasting',
    img: 'icons/svg/fire.svg',
    category: 'relic',
    description: 'Can send a beam of magic energy to attack.',
    effects: [{
      name: 'Blasting',
      img: 'icons/svg/fire.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'blasting' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  RELIC: BANE & PROTECTION (Being-type specific)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Bane - Niche',
    img: 'icons/svg/sword.svg',
    category: 'relic',
    description: 'Extra damage vs. extremely specific Beings (e.g. Trolls). Set the Being type in the effect name.',
    effects: [{
      name: 'Bane (Niche)',
      img: 'icons/svg/sword.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'bane-niche' } }
    }]
  },
  {
    name: 'Bane - Specific',
    img: 'icons/svg/sword.svg',
    category: 'relic',
    description: 'Extra damage vs. a Being subtype (e.g. giants). Set the Being type in the effect name.',
    effects: [{
      name: 'Bane (Specific)',
      img: 'icons/svg/sword.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'bane-specific' } }
    }]
  },
  {
    name: 'Bane - General',
    img: 'icons/svg/sword.svg',
    category: 'relic',
    description: 'Extra damage vs. an entire Being Type (e.g. Cryptids). Set the Being type in the effect name.',
    effects: [{
      name: 'Bane (General)',
      img: 'icons/svg/sword.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'bane-general' } }
    }]
  },
  {
    name: 'Protection - Niche',
    img: 'icons/svg/shield.svg',
    category: 'relic',
    description: 'Damage reduction vs. extremely specific Beings (e.g. Trolls). Set the Being type in the effect name.',
    effects: [{
      name: 'Protection (Niche)',
      img: 'icons/svg/shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'protection-niche' } }
    }]
  },
  {
    name: 'Protection - Specific',
    img: 'icons/svg/shield.svg',
    category: 'relic',
    description: 'Damage reduction vs. a Being subtype (e.g. giants). Set the Being type in the effect name.',
    effects: [{
      name: 'Protection (Specific)',
      img: 'icons/svg/shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'protection-specific' } }
    }]
  },
  {
    name: 'Protection - General',
    img: 'icons/svg/shield.svg',
    category: 'relic',
    description: 'Damage reduction vs. an entire Being Type (e.g. Cryptids). Set the Being type in the effect name.',
    effects: [{
      name: 'Protection (General)',
      img: 'icons/svg/shield.svg',
      changes: [],
      flags: { vagabond: { applicationMode: 'when-equipped', relicPower: 'protection-general' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ANCESTRY TRAITS (from ancestry compendium)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Ancestry: Orc Hulking (+2 Slots)',
    img: 'icons/svg/combat.svg',
    category: 'buff',
    description: 'Orc trait: Hulking grants +2 inventory slots.',
    effects: [{
      name: 'Hulking',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '2' }
      ]
    }]
  },
  {
    name: 'Ancestry: Dwarf Tough (+1 HP/Level)',
    img: 'icons/svg/heal.svg',
    category: 'buff',
    description: 'Dwarf trait: Tough grants +1 HP per character level.',
    effects: [{
      name: 'Tough (Dwarf Trait)',
      img: 'icons/svg/heal.svg',
      changes: [
        { key: 'system.bonuses.hpPerLevel', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Ancestry: Elf Naturally Attuned',
    img: 'icons/svg/aura.svg',
    category: 'buff',
    description: 'Elf trait: Naturally Attuned grants innate spellcasting (Reason-based, 1x mana multiplier).',
    effects: [{
      name: 'Naturally Attuned (Elf Trait)',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.attributes.isSpellcaster', mode: 5, value: 'true' },
        { key: 'system.attributes.manaMultiplier', mode: 5, value: '1' },
        { key: 'system.attributes.castingStat', mode: 5, value: 'reason' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Ancestry: Nimble (+5 Speed)',
    img: 'icons/svg/wingfoot.svg',
    category: 'buff',
    description: 'Halfling/Goblin trait: Nimble grants +5 feet to Speed.',
    effects: [{
      name: 'Nimble',
      img: 'icons/svg/wingfoot.svg',
      changes: [
        { key: 'system.speed.bonus', mode: 2, value: '5' }
      ]
    }]
  },
  {
    name: 'Ancestry: Draken Scale (+1 Armor)',
    img: 'icons/svg/shield.svg',
    category: 'buff',
    description: 'Draken trait: Scale grants +1 natural Armor bonus.',
    effects: [{
      name: 'Scale',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.armorBonus', mode: 2, value: '1' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PERK EFFECTS (from perk compendium)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Perk: Tough (+1 HP/Level)',
    img: 'icons/svg/heal.svg',
    category: 'buff',
    description: 'Tough perk: +1 HP per character level.',
    effects: [{
      name: 'Max Health Increase',
      img: 'icons/svg/heal.svg',
      changes: [
        { key: 'system.bonuses.hpPerLevel', mode: 2, value: '1' }
      ]
    }]
  },
  {
    name: 'Perk: Pack Mule (+2 Slots)',
    img: 'icons/svg/combat.svg',
    category: 'buff',
    description: 'Pack Mule perk: +2 inventory slots.',
    effects: [{
      name: '+2 Inv. Slots',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Perk: Metamagic (+1 Mana Casting)',
    img: 'icons/svg/aura.svg',
    category: 'buff',
    description: 'Metamagic perk: +1 to max mana per casting.',
    effects: [{
      name: '+ Mana Casting',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.mana.castingMaxBonus', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Perk: Secret of Mana (+Mana/Level)',
    img: 'icons/svg/aura.svg',
    category: 'buff',
    description: 'Secret of Mana perk: bonus mana equal to character level.',
    effects: [{
      name: '+Mana',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.mana.bonus', mode: 2, value: '@lvl' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Perk: Magical Secret (Spellcaster)',
    img: 'icons/svg/aura.svg',
    category: 'classFeature',
    description: 'Magical Secret perk: grants spellcasting ability with 2x mana multiplier. Requires choosing a casting stat.',
    effects: [{
      name: 'Spellcaster',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.attributes.isSpellcaster', mode: 5, value: 'true' },
        { key: 'system.attributes.manaMultiplier', mode: 5, value: '2' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CLASS FEATURE EFFECTS (from class compendium)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Sorcerer: Spell-Slinger (Lv2)',
    img: 'icons/svg/fire.svg',
    category: 'classFeature',
    description: 'Sorcerer Lv2: -1 spell crit threshold and +2 spell damage die size steps.',
    effects: [{
      name: 'lv2 - Spell-Slinger',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.spellCritBonus', mode: 2, value: '(@lvl >= 2) ? -1 : 0' },
        { key: 'system.spellDamageDieSizeBonus', mode: 2, value: '(@lvl >= 2) ? 2 : 0' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Sorcerer: Spell-Slinger (Lv10)',
    img: 'icons/svg/fire.svg',
    category: 'classFeature',
    description: 'Sorcerer Lv10: additional -1 spell crit threshold.',
    effects: [{
      name: 'lv10 - Spell-Slinger',
      img: 'icons/svg/fire.svg',
      changes: [
        { key: 'system.spellCritBonus', mode: 2, value: '(@lvl >= 10) ? -1 : 0' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Merchant: Deep Pockets (+1 Slot)',
    img: 'icons/svg/combat.svg',
    category: 'classFeature',
    description: 'Merchant feature: +1 inventory slot.',
    effects: [{
      name: 'Deep Pockets (Feature)',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '1' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Wizard: Sculpt Spell (Lv2)',
    img: 'icons/svg/aura.svg',
    category: 'classFeature',
    description: 'Wizard Lv2: -1 delivery mana cost.',
    effects: [{
      name: 'lv2 - Sculpt Spell',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.bonuses.deliveryManaCostReduction', mode: 2, value: '(@attributes.level.value >= 2) ? 1 : 0' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },
  {
    name: 'Wizard: Sculpt Spell (Lv10)',
    img: 'icons/svg/aura.svg',
    category: 'classFeature',
    description: 'Wizard Lv10: additional -1 delivery mana cost.',
    effects: [{
      name: 'lv10 - Sculpt Spell',
      img: 'icons/svg/aura.svg',
      changes: [
        { key: 'system.bonuses.deliveryManaCostReduction', mode: 2, value: '(@lvl >= 10) ? 1 : 0' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  GEAR EFFECTS (from gear compendium)
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Gear: Backpack (+2 Slots)',
    img: 'icons/svg/combat.svg',
    category: 'buff',
    description: 'Backpack: +2 bonus inventory slots.',
    effects: [{
      name: 'Bonus Inventory',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.inventory.bonusSlots', mode: 2, value: '2' }
      ],
      flags: { vagabond: { applicationMode: 'permanent' } }
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CLASS FEATURES
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Barbarian: Rage',
    img: 'icons/svg/terror.svg',
    category: 'classFeature',
    description: 'While Berserk in Light/No armor: damage dice upsize by 1 step, damage dice explode, and damage reduction per die.',
    effects: [{
      name: 'Rage',
      img: 'icons/svg/terror.svg',
      changes: [
        { key: 'system.hasRage', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Barbarian: Rage Damage Reduction (1/die)',
    img: 'icons/svg/shield.svg',
    category: 'classFeature',
    description: 'While Raging, reduce each incoming damage die by 1.',
    effects: [{
      name: 'Rage Damage Reduction',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.rageDamageReduction', mode: 5, value: '1' }
      ]
    }]
  },
  {
    name: 'Barbarian: Rage Damage Reduction (2/die)',
    img: 'icons/svg/shield.svg',
    category: 'classFeature',
    description: 'While Raging, reduce each incoming damage die by 2.',
    effects: [{
      name: 'Rage Damage Reduction (Improved)',
      img: 'icons/svg/shield.svg',
      changes: [
        { key: 'system.rageDamageReduction', mode: 5, value: '2' }
      ]
    }]
  },
  {
    name: 'Barbarian: Rip and Tear',
    img: 'icons/svg/combat.svg',
    category: 'classFeature',
    description: 'While Raging: +1 damage per damage die dealt.',
    effects: [{
      name: 'Rip and Tear',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.hasRipAndTear', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Barbarian: Aggressor',
    img: 'icons/svg/combat.svg',
    category: 'classFeature',
    description: 'Additional Barbarian aggression mechanics.',
    effects: [{
      name: 'Aggressor',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.hasAggressor', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Barbarian: Fearmonger',
    img: 'icons/svg/hazard.svg',
    category: 'classFeature',
    description: 'Barbarian fear mechanics.',
    effects: [{
      name: 'Fearmonger',
      img: 'icons/svg/hazard.svg',
      changes: [
        { key: 'system.hasFearmonger', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Barbarian: Mindless Rancor',
    img: 'icons/svg/terror.svg',
    category: 'classFeature',
    description: 'While Raging: immune to mental effects.',
    effects: [{
      name: 'Mindless Rancor',
      img: 'icons/svg/terror.svg',
      changes: [
        { key: 'system.hasMindlessRancor', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Barbarian: Bloodthirsty',
    img: 'icons/svg/blood.svg',
    category: 'classFeature',
    description: 'Heal on kill while Raging.',
    effects: [{
      name: 'Bloodthirsty',
      img: 'icons/svg/blood.svg',
      changes: [
        { key: 'system.hasBloodthirsty', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Rogue: Sneak Attack (1d4)',
    img: 'icons/svg/mystery-man.svg',
    category: 'classFeature',
    description: 'Deal +1d4 damage on Favored weapon attacks.',
    effects: [{
      name: 'Sneak Attack (1d4)',
      img: 'icons/svg/mystery-man.svg',
      changes: [
        { key: 'system.sneakAttackDice', mode: 5, value: '1' }
      ]
    }]
  },
  {
    name: 'Rogue: Sneak Attack (2d4)',
    img: 'icons/svg/mystery-man.svg',
    category: 'classFeature',
    description: 'Deal +2d4 damage on Favored weapon attacks.',
    effects: [{
      name: 'Sneak Attack (2d4)',
      img: 'icons/svg/mystery-man.svg',
      changes: [
        { key: 'system.sneakAttackDice', mode: 5, value: '2' }
      ]
    }]
  },
  {
    name: 'Rogue: Sneak Attack (3d4)',
    img: 'icons/svg/mystery-man.svg',
    category: 'classFeature',
    description: 'Deal +3d4 damage on Favored weapon attacks.',
    effects: [{
      name: 'Sneak Attack (3d4)',
      img: 'icons/svg/mystery-man.svg',
      changes: [
        { key: 'system.sneakAttackDice', mode: 5, value: '3' }
      ]
    }]
  },
  {
    name: 'Rogue: Lethal Weapon',
    img: 'icons/svg/mystery-man.svg',
    category: 'classFeature',
    description: 'Sneak Attack always applies (ignores once-per-round limit).',
    effects: [{
      name: 'Lethal Weapon',
      img: 'icons/svg/mystery-man.svg',
      changes: [
        { key: 'system.hasLethalWeapon', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Rogue: Evasive',
    img: 'icons/svg/wingfoot.svg',
    category: 'classFeature',
    description: 'No Hinder on Dodge saves from Heavy Armor. On success, remove TWO highest dice instead of one.',
    effects: [{
      name: 'Evasive',
      img: 'icons/svg/wingfoot.svg',
      changes: [
        { key: 'system.hasEvasive', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Bard: Bravado',
    img: 'icons/svg/holy-shield.svg',
    category: 'classFeature',
    description: "Will Saves can't be Hindered while not Incapacitated. Ignore effects that rely on hearing.",
    effects: [{
      name: 'Bravado',
      img: 'icons/svg/holy-shield.svg',
      changes: [
        { key: 'system.hasBravado', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Bard: Climax',
    img: 'icons/svg/explosion.svg',
    category: 'classFeature',
    description: 'Favor and bonus dice you grant can Explode.',
    effects: [{
      name: 'Climax',
      img: 'icons/svg/explosion.svg',
      changes: [
        { key: 'system.hasClimax', mode: 5, value: 'true' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  BRAWL / FISTICUFFS
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'Brawl Check Favor',
    img: 'icons/svg/combat.svg',
    category: 'buff',
    description: 'Brawl checks have Favor.',
    effects: [{
      name: 'Brawl Check Favor',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.brawlCheckFavor', mode: 5, value: 'true' }
      ]
    }]
  },
  {
    name: 'Fisticuffs',
    img: 'icons/svg/combat.svg',
    category: 'classFeature',
    description: 'Unarmed strikes deal lethal damage and scale with class.',
    effects: [{
      name: 'Fisticuffs',
      img: 'icons/svg/combat.svg',
      changes: [
        { key: 'system.fisticuffs', mode: 5, value: 'true' }
      ]
    }]
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  STAT BONUSES (generic +1 / +2 for each stat)
  // ══════════════════════════════════════════════════════════════════════════

  ...['might', 'dexterity', 'awareness', 'reason', 'presence', 'luck'].flatMap(stat => {
    const label = stat.charAt(0).toUpperCase() + stat.slice(1);
    return [
      {
        name: `${label} +1`,
        img: 'icons/svg/upgrade.svg',
        category: 'buff',
        description: `+1 bonus to ${label}.`,
        effects: [{
          name: `${label} +1`,
          img: 'icons/svg/upgrade.svg',
          changes: [
            { key: `system.stats.${stat}.bonus`, mode: 2, value: '1' }
          ]
        }]
      },
      {
        name: `${label} -1`,
        img: 'icons/svg/downgrade.svg',
        category: 'debuff',
        description: `-1 penalty to ${label}.`,
        effects: [{
          name: `${label} -1`,
          img: 'icons/svg/downgrade.svg',
          changes: [
            { key: `system.stats.${stat}.bonus`, mode: 2, value: '-1' }
          ]
        }]
      }
    ];
  }),

  // ══════════════════════════════════════════════════════════════════════════
  //  SAVE BONUSES
  // ══════════════════════════════════════════════════════════════════════════

  ...['reflex', 'endure', 'will'].flatMap(save => {
    const label = save.charAt(0).toUpperCase() + save.slice(1);
    return [{
      name: `${label} Save +1`,
      img: 'icons/svg/upgrade.svg',
      category: 'buff',
      description: `+1 bonus to ${label} saves.`,
      effects: [{
        name: `${label} Save +1`,
        img: 'icons/svg/upgrade.svg',
        changes: [
          { key: `system.saves.${save}.bonus`, mode: 2, value: '1' }
        ]
      }]
    }];
  }),

  // ══════════════════════════════════════════════════════════════════════════
  //  HP BONUSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    name: 'HP Bonus (+5)',
    img: 'icons/svg/heal.svg',
    category: 'buff',
    description: '+5 bonus to maximum HP.',
    effects: [{
      name: 'HP Bonus (+5)',
      img: 'icons/svg/heal.svg',
      changes: [
        { key: 'system.health.bonus', mode: 2, value: '5' }
      ]
    }]
  },
  {
    name: 'HP Bonus (+10)',
    img: 'icons/svg/heal.svg',
    category: 'buff',
    description: '+10 bonus to maximum HP.',
    effects: [{
      name: 'HP Bonus (+10)',
      img: 'icons/svg/heal.svg',
      changes: [
        { key: 'system.health.bonus', mode: 2, value: '10' }
      ]
    }]
  },
  {
    name: 'HP Per Level (+1)',
    img: 'icons/svg/heal.svg',
    category: 'buff',
    description: '+1 HP per character level.',
    effects: [{
      name: 'HP Per Level (+1)',
      img: 'icons/svg/heal.svg',
      changes: [
        { key: 'system.bonuses.hpPerLevel', mode: 2, value: '1' }
      ]
    }]
  },
];


// ── Public API ──────────────────────────────────────────────────────────────

export class EffectsCompendium {

  /** All raw definitions (for inspection / testing) */
  static get definitions() {
    return EFFECT_DEFINITIONS;
  }

  /** Category → display name mapping for compendium folders */
  static FOLDER_LABELS = {
    condition:    '⚡ Status Conditions',
    buff:         '🟢 Buffs & Bonuses',
    debuff:       '🔴 Debuffs & Penalties',
    weapon:       '⚔️ Weapon Enhancements',
    armor:        '🛡️ Armor Properties',
    material:     '💎 Material Bonuses',
    relic:        '✨ Relic Powers',
    classFeature: '📘 Class Features',
    misc:         '📦 Miscellaneous',
  };

  /**
   * Populate (or re-populate) the Active Effects compendium pack.
   * Deletes all existing entries first, then creates fresh ones
   * organized into folders by category.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force=false]  Re-populate even if the pack already has entries
   * @returns {Promise<number>} Number of items created
   */
  static async populate({ force = false } = {}) {
    const packKey = `${SYSTEM_ID}.${PACK_NAME}`;
    const pack = game.packs.get(packKey);

    if (!pack) {
      ui.notifications.error(`Compendium pack "${packKey}" not found. Is it registered in system.json?`);
      return 0;
    }

    // Unlock the pack if it's locked
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });

    try {
      // Check if already populated
      const existing = await pack.getDocuments();
      if (existing.length > 0 && !force) {
        ui.notifications.info(`Effects compendium already has ${existing.length} entries. Use { force: true } to replace them.`);
        return existing.length;
      }

      // Clear existing items
      if (existing.length > 0) {
        const ids = existing.map(d => d.id);
        await Item.deleteDocuments(ids, { pack: packKey });
        console.log(`EffectsCompendium | Deleted ${ids.length} existing entries`);
      }

      // Clear existing folders in the pack
      const existingFolders = pack.folders;
      if (existingFolders.size > 0) {
        const folderIds = existingFolders.map(f => f.id);
        await Folder.deleteDocuments(folderIds, { pack: packKey });
        console.log(`EffectsCompendium | Deleted ${folderIds.length} existing folders`);
      }

      // ── Create folders for each category ──────────────────────────────
      // Determine which categories are actually used
      const usedCategories = new Set(EFFECT_DEFINITIONS.map(d => d.category || 'misc'));

      // Define sort order so folders appear in a logical sequence
      const SORT_ORDER = ['condition', 'buff', 'debuff', 'weapon', 'armor', 'material', 'relic', 'classFeature', 'misc'];

      const folderDatas = SORT_ORDER
        .filter(cat => usedCategories.has(cat))
        .map((cat, idx) => ({
          name: this.FOLDER_LABELS[cat] || cat,
          type: 'Item',
          sorting: 'a',           // alphabetical sorting within folder
          sort: (idx + 1) * 100,  // folder order in the sidebar
          flags: { vagabond: { category: cat } },
        }));

      const createdFolders = await Folder.createDocuments(folderDatas, { pack: packKey });
      console.log(`EffectsCompendium | Created ${createdFolders.length} folders`);

      // Build a category → folder ID lookup
      const categoryToFolderId = {};
      for (const folder of createdFolders) {
        const cat = folder.flags?.vagabond?.category;
        if (cat) categoryToFolderId[cat] = folder.id;
      }

      // ── Build Item documents ──────────────────────────────────────────
      const itemDatas = EFFECT_DEFINITIONS.map(def => {
        const cat = def.category || 'misc';
        const itemData = {
          name: def.name,
          img: def.img || 'icons/svg/aura.svg',
          type: 'effect',
          folder: categoryToFolderId[cat] || null,
          system: {
            description: `<p>${def.description || ''}</p>`,
            category: cat,
            durationHint: def.durationHint || '',
          },
          effects: (def.effects || []).map(eff => ({
            name: eff.name || def.name,
            img: eff.img || def.img || 'icons/svg/aura.svg',
            transfer: true,
            statuses: eff.statuses || [],
            changes: (eff.changes || []).map(c => {
              // Convert numeric modes to V14 string types if needed
              const MODE_MAP = { 0: 'custom', 1: 'multiply', 2: 'add', 3: 'downgrade', 4: 'upgrade', 5: 'override' };
              const type = (typeof c.mode === 'number') ? (MODE_MAP[c.mode] || 'add') : (c.mode || 'add');
              return {
                key: c.key,
                mode: c.mode,
                type: type,
                value: String(c.value),
                priority: c.priority ?? null,
              };
            }),
            ...(eff.flags ? { flags: eff.flags } : {}),
          })),
        };
        return itemData;
      });

      // Create items in batches to avoid overwhelming Foundry
      const BATCH_SIZE = 20;
      let totalCreated = 0;
      for (let i = 0; i < itemDatas.length; i += BATCH_SIZE) {
        const batch = itemDatas.slice(i, i + BATCH_SIZE);
        try {
          const created = await Item.createDocuments(batch, { pack: packKey });
          totalCreated += created.length;
        } catch (err) {
          console.error(`EffectsCompendium | Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
          // Try individual creation for failed batch
          for (const item of batch) {
            try {
              await Item.createDocuments([item], { pack: packKey });
              totalCreated++;
            } catch (itemErr) {
              console.error(`EffectsCompendium | Failed to create "${item.name}":`, itemErr.message);
            }
          }
        }
      }

      const folderSummary = Object.entries(categoryToFolderId)
        .map(([cat]) => {
          const count = itemDatas.filter(d => d.system.category === cat).length;
          return `${this.FOLDER_LABELS[cat]}: ${count}`;
        }).join(', ');

      console.log(`EffectsCompendium | Created ${totalCreated} of ${itemDatas.length} effect items in ${createdFolders.length} folders`);
      console.log(`EffectsCompendium | ${folderSummary}`);
      ui.notifications.info(`Active Effects compendium populated with ${totalCreated} entries in ${createdFolders.length} folders.`);
      return totalCreated;

    } finally {
      // Re-lock if it was locked before
      if (wasLocked) await pack.configure({ locked: true });
    }
  }
}
