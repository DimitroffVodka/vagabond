/**
 * Relic Powers Database
 * Pre-defined Active Effect templates for the Relic Forge.
 * Each power becomes an Active Effect on the created relic item.
 *
 * Powers with tier-scaled values use `tierValues` object:
 *   tierValues: { minor: [...changes], none: [...changes], major: [...changes] }
 * The Relic Forge picks the correct tier at forge time.
 * Powers without `tierValues` use `changes` directly (tier doesn't affect them).
 */

export const RELIC_POWER_CATEGORIES = {
  damage: { label: 'Damage', icon: 'fas fa-sword' },
  bonus: { label: 'Bonus', icon: 'fas fa-plus-circle' },
  onHit: { label: 'On-Hit', icon: 'fas fa-burst' },
  onKill: { label: 'On-Kill', icon: 'fas fa-skull' },
  critical: { label: 'Critical', icon: 'fas fa-crosshairs' },
  ace: { label: 'Ace Property', icon: 'fas fa-star' },
  stat: { label: 'Stat Bonus', icon: 'fas fa-chart-bar' },
  bane: { label: 'Bane', icon: 'fas fa-skull-crossbones' },
  ward: { label: 'Protection', icon: 'fas fa-shield' },
  resistance: { label: 'Resistance', icon: 'fas fa-shield-halved' },
  movement: { label: 'Movement', icon: 'fas fa-person-running' },
  senses: { label: 'Senses', icon: 'fas fa-eye' },
  light: { label: 'Light', icon: 'fas fa-sun' },
  stealth: { label: 'Stealth', icon: 'fas fa-ghost' },
  cursed: { label: 'Cursed', icon: 'fas fa-skull-crossbones' },
  fabled: { label: 'Fabled', icon: 'fas fa-crown' },
  utility: { label: 'Utility', icon: 'fas fa-gear' }
};

/**
 * Each power entry:
 * - id: unique key
 * - name: display name
 * - nameLabel: short label for the relic name (e.g. "Striking")
 * - icon: FontAwesome class
 * - category: key from RELIC_POWER_CATEGORIES
 * - description: what it does (tier-scaled powers show all 3 levels)
 * - applicationMode: 'when-equipped' | 'on-use' | 'permanent'
 * - changes: default Active Effect changes (used if no tierValues)
 * - tierValues: { minor: [...], none: [...], major: [...] } — tier-scaled AE changes
 * - flags: additional flags for vagabond namespace
 * - addProperties: string[] of weapon properties to inject (Ace powers)
 */
export const RELIC_POWERS = [

  // ═══════════════════════════════════════════════════════════
  // DAMAGE — Striking (flat weapon damage bonus)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'striking',
    name: 'Striking',
    nameLabel: 'Striking',
    icon: 'fas fa-sword',
    category: 'damage',
    description: '+1/+2/+3 weapon damage by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '1' }],
      none:  [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '2' }],
      major: [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '3' }]
    },
    flags: { relicPower: 'striking' }
  },

  // ═══════════════════════════════════════════════════════════
  // DAMAGE — Strike (bonus damage DICE)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'strike',
    name: 'Strike',
    nameLabel: 'Strike',
    icon: 'fas fa-dice-d20',
    category: 'damage',
    description: '+1d4/+1d6/+1d8 bonus weapon damage die by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.universalWeaponDamageDice', mode: 2, value: '1d4' }],
      none:  [{ key: 'system.universalWeaponDamageDice', mode: 2, value: '1d6' }],
      major: [{ key: 'system.universalWeaponDamageDice', mode: 2, value: '1d8' }]
    },
    flags: { relicPower: 'strike' }
  },

  // ═══════════════════════════════════════════════════════════
  // BONUS — Armor, Protection, Trinket, Weapon
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bonus-armor',
    name: 'Bonus Armor',
    nameLabel: 'Armored',
    icon: 'fas fa-shield',
    category: 'bonus',
    description: '+1/+2/+3 Armor bonus by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.armorBonus', mode: 2, value: '1' }],
      none:  [{ key: 'system.armorBonus', mode: 2, value: '2' }],
      major: [{ key: 'system.armorBonus', mode: 2, value: '3' }]
    },
    flags: { relicPower: 'bonus-armor' }
  },
  {
    id: 'bonus-protection',
    name: 'Bonus Protection',
    nameLabel: 'Protected',
    icon: 'fas fa-shield-heart',
    category: 'bonus',
    description: '+1/+2/+3 to all saves (Reflex, Endure, Will) by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '1' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '1' },
        { key: 'system.saves.will.bonus', mode: 2, value: '1' }
      ],
      none: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '2' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '2' },
        { key: 'system.saves.will.bonus', mode: 2, value: '2' }
      ],
      major: [
        { key: 'system.saves.reflex.bonus', mode: 2, value: '3' },
        { key: 'system.saves.endure.bonus', mode: 2, value: '3' },
        { key: 'system.saves.will.bonus', mode: 2, value: '3' }
      ]
    },
    flags: { relicPower: 'bonus-protection' }
  },
  {
    id: 'bonus-trinket',
    name: 'Bonus Trinket',
    nameLabel: 'Arcane',
    icon: 'fas fa-hat-wizard',
    category: 'bonus',
    description: '+1/+2/+3 spell damage by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.universalSpellDamageBonus', mode: 2, value: '1' }],
      none:  [{ key: 'system.universalSpellDamageBonus', mode: 2, value: '2' }],
      major: [{ key: 'system.universalSpellDamageBonus', mode: 2, value: '3' }]
    },
    flags: { relicPower: 'bonus-trinket' }
  },
  {
    id: 'bonus-weapon',
    name: 'Bonus Weapon',
    nameLabel: 'Honed',
    icon: 'fas fa-bullseye',
    category: 'bonus',
    description: '+1/+2/+3 weapon attack bonus by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.universalWeaponAttackBonus', mode: 2, value: '1' }],
      none:  [{ key: 'system.universalWeaponAttackBonus', mode: 2, value: '2' }],
      major: [{ key: 'system.universalWeaponAttackBonus', mode: 2, value: '3' }]
    },
    flags: { relicPower: 'bonus-weapon' }
  },

  // ═══════════════════════════════════════════════════════════
  // ON-HIT — Burning (countdown dice on weapon hits)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'burning',
    name: 'Burning',
    nameLabel: 'Burning',
    icon: 'fas fa-fire',
    category: 'onHit',
    description: 'On hit, apply Burning with d4/d6/d8 countdown die by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.onHitBurningDice', mode: 5, value: 'd4' }],
      none:  [{ key: 'system.onHitBurningDice', mode: 5, value: 'd6' }],
      major: [{ key: 'system.onHitBurningDice', mode: 5, value: 'd8' }]
    },
    flags: { relicPower: 'burning' }
  },

  // ═══════════════════════════════════════════════════════════
  // ON-KILL — Lifesteal & Manasteal
  // ═══════════════════════════════════════════════════════════
  {
    id: 'lifesteal',
    name: 'Lifesteal',
    nameLabel: 'Lifesteal',
    icon: 'fas fa-heart',
    category: 'onKill',
    description: 'On kill, heal 1d8/2d8/3d8 HP by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.onKillHealDice', mode: 2, value: '1d8' }],
      none:  [{ key: 'system.onKillHealDice', mode: 2, value: '2d8' }],
      major: [{ key: 'system.onKillHealDice', mode: 2, value: '3d8' }]
    },
    flags: { relicPower: 'lifesteal' }
  },
  {
    id: 'manasteal',
    name: 'Manasteal',
    nameLabel: 'Manasteal',
    icon: 'fas fa-droplet',
    category: 'onKill',
    description: 'On kill, restore 1d4/2d4/3d4 Mana by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.onKillManaDice', mode: 2, value: '1d4' }],
      none:  [{ key: 'system.onKillManaDice', mode: 2, value: '2d4' }],
      major: [{ key: 'system.onKillManaDice', mode: 2, value: '3d4' }]
    },
    flags: { relicPower: 'manasteal' }
  },

  // ═══════════════════════════════════════════════════════════
  // CRITICAL — Keen
  // ═══════════════════════════════════════════════════════════
  {
    id: 'keen',
    name: 'Keen',
    nameLabel: 'Keen',
    icon: 'fas fa-crosshairs',
    category: 'critical',
    description: 'Crit threshold reduced by 1 (crit on 19-20).',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.critNumber', mode: 5, value: '19' }],
    flags: { relicPower: 'keen' }
  },

  // ═══════════════════════════════════════════════════════════
  // ACE — Enhanced weapon properties
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ace-brutal',
    name: 'Ace - Brutal',
    nameLabel: 'Brutal',
    icon: 'fas fa-hammer',
    category: 'ace',
    description: 'Adds Brutal property (crits deal 1 extra damage die).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-brutal' },
    addProperties: ['Brutal']
  },
  {
    id: 'ace-cleave',
    name: 'Ace - Cleave',
    nameLabel: 'Cleaving',
    icon: 'fas fa-angles-right',
    category: 'ace',
    description: 'Adds Cleave property (half damage to two targets).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-cleave' },
    addProperties: ['Cleave']
  },
  {
    id: 'ace-long',
    name: 'Ace - Long',
    nameLabel: 'Long',
    icon: 'fas fa-arrows-left-right',
    category: 'ace',
    description: 'Adds Long property (+5ft melee reach).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-long' },
    addProperties: ['Long']
  },
  {
    id: 'ace-entangle',
    name: 'Ace - Entangle',
    nameLabel: 'Entangling',
    icon: 'fas fa-link',
    category: 'ace',
    description: 'Adds Entangle property (can Grapple).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-entangle' },
    addProperties: ['Entangle']
  },
  {
    id: 'ace-thrown',
    name: 'Ace - Thrown',
    nameLabel: 'Throwing',
    icon: 'fas fa-share',
    category: 'ace',
    description: 'Adds Thrown property (throw up to Near, or Far with Hinder).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-thrown' },
    addProperties: ['Thrown']
  },
  {
    id: 'ace-keen',
    name: 'Ace - Keen',
    nameLabel: 'Keen',
    icon: 'fas fa-crosshairs',
    category: 'ace',
    description: 'Adds Keen property (crit on 1 lower).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ace-keen' },
    addProperties: ['Keen']
  },

  // ═══════════════════════════════════════════════════════════
  // STAT BONUSES — +1 to a chosen stat
  // ═══════════════════════════════════════════════════════════
  {
    id: 'stat-might',
    name: '+1 Might',
    nameLabel: 'Mighty',
    icon: 'fas fa-dumbbell',
    category: 'stat',
    description: '+1 bonus to Might.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.might.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-might' }
  },
  {
    id: 'stat-dexterity',
    name: '+1 Dexterity',
    nameLabel: 'Deft',
    icon: 'fas fa-hand',
    category: 'stat',
    description: '+1 bonus to Dexterity.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.dexterity.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-dexterity' }
  },
  {
    id: 'stat-constitution',
    name: '+1 Constitution',
    nameLabel: 'Hardy',
    icon: 'fas fa-heart-pulse',
    category: 'stat',
    description: '+1 bonus to Constitution.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.constitution.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-constitution' }
  },
  {
    id: 'stat-intelligence',
    name: '+1 Intelligence',
    nameLabel: 'Clever',
    icon: 'fas fa-brain',
    category: 'stat',
    description: '+1 bonus to Intelligence.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.intelligence.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-intelligence' }
  },
  {
    id: 'stat-wisdom',
    name: '+1 Wisdom',
    nameLabel: 'Wise',
    icon: 'fas fa-book',
    category: 'stat',
    description: '+1 bonus to Wisdom.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.wisdom.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-wisdom' }
  },
  {
    id: 'stat-charisma',
    name: '+1 Charisma',
    nameLabel: 'Charming',
    icon: 'fas fa-masks-theater',
    category: 'stat',
    description: '+1 bonus to Charisma.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.stats.charisma.bonus', mode: 2, value: '1' }],
    flags: { relicPower: 'stat-charisma' }
  },

  // ═══════════════════════════════════════════════════════════
  // BANE — Extra damage vs creature types
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bane-general',
    name: 'Bane (General)',
    nameLabel: 'Bane',
    icon: 'fas fa-crosshairs',
    category: 'bane',
    description: '+1d6 damage vs a broad creature type (e.g. Humanoids, Undead).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'bane-general', baneType: 'general', baneDice: '1d6' }
  },
  {
    id: 'bane-niche',
    name: 'Bane (Niche)',
    nameLabel: 'Bane',
    icon: 'fas fa-crosshairs',
    category: 'bane',
    description: '+2d6 damage vs a niche creature type (e.g. Dragons, Fiends).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'bane-niche', baneType: 'niche', baneDice: '2d6' }
  },
  {
    id: 'bane-specific',
    name: 'Bane (Specific)',
    nameLabel: 'Bane',
    icon: 'fas fa-crosshairs',
    category: 'bane',
    description: '+3d6 damage vs a specific creature (e.g. Vampires, a named enemy).',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'bane-specific', baneType: 'specific', baneDice: '3d6' }
  },

  // ═══════════════════════════════════════════════════════════
  // WARD — Protection vs creature types
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ward-general',
    name: 'Ward (General)',
    nameLabel: 'Warding',
    icon: 'fas fa-shield',
    category: 'ward',
    description: 'Favor on saves vs a broad creature type.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ward-general', wardType: 'general' }
  },
  {
    id: 'ward-niche',
    name: 'Ward (Niche)',
    nameLabel: 'Warding',
    icon: 'fas fa-shield',
    category: 'ward',
    description: 'Favor on saves vs a niche creature type.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ward-niche', wardType: 'niche' }
  },
  {
    id: 'ward-specific',
    name: 'Ward (Specific)',
    nameLabel: 'Warding',
    icon: 'fas fa-shield',
    category: 'ward',
    description: 'Favor on saves vs a specific creature.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'ward-specific', wardType: 'specific' }
  },

  // ═══════════════════════════════════════════════════════════
  // RESISTANCE — Favor on saves vs conditions
  // ═══════════════════════════════════════════════════════════
  {
    id: 'resistance-bravery',
    name: 'Bravery',
    nameLabel: 'Brave',
    icon: 'fas fa-shield-heart',
    category: 'resistance',
    description: 'Favor on saves vs Frightened.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.favorOnSaveVs.frightened', mode: 5, value: 'true' }],
    flags: { relicPower: 'resistance-bravery' }
  },
  {
    id: 'resistance-clarity',
    name: 'Clarity',
    nameLabel: 'Clear',
    icon: 'fas fa-lightbulb',
    category: 'resistance',
    description: 'Favor on saves vs Confused.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.favorOnSaveVs.confused', mode: 5, value: 'true' }],
    flags: { relicPower: 'resistance-clarity' }
  },
  {
    id: 'resistance-repulsing',
    name: 'Repulsing',
    nameLabel: 'Repulsing',
    icon: 'fas fa-ban',
    category: 'resistance',
    description: 'Favor on saves vs Charmed.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.favorOnSaveVs.charmed', mode: 5, value: 'true' }],
    flags: { relicPower: 'resistance-repulsing' }
  },

  // ── Typed damage resistance ──
  {
    id: 'resistance-fire',
    name: 'Fire Resistance',
    nameLabel: 'Fireproof',
    icon: 'fas fa-fire',
    category: 'resistance',
    description: 'Resistance to Fire damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-fire', damageResistance: 'fire' }
  },
  {
    id: 'resistance-cold',
    name: 'Cold Resistance',
    nameLabel: 'Frostproof',
    icon: 'fas fa-snowflake',
    category: 'resistance',
    description: 'Resistance to Cold damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-cold', damageResistance: 'cold' }
  },
  {
    id: 'resistance-lightning',
    name: 'Lightning Resistance',
    nameLabel: 'Grounded',
    icon: 'fas fa-bolt',
    category: 'resistance',
    description: 'Resistance to Lightning damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-lightning', damageResistance: 'lightning' }
  },
  {
    id: 'resistance-poison',
    name: 'Poison Resistance',
    nameLabel: 'Antitoxin',
    icon: 'fas fa-flask',
    category: 'resistance',
    description: 'Resistance to Poison damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-poison', damageResistance: 'poison' }
  },
  {
    id: 'resistance-necrotic',
    name: 'Necrotic Resistance',
    nameLabel: 'Hallowed',
    icon: 'fas fa-ghost',
    category: 'resistance',
    description: 'Resistance to Necrotic damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-necrotic', damageResistance: 'necrotic' }
  },
  {
    id: 'resistance-radiant',
    name: 'Radiant Resistance',
    nameLabel: 'Shaded',
    icon: 'fas fa-sun',
    category: 'resistance',
    description: 'Resistance to Radiant damage.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'resistance-radiant', damageResistance: 'radiant' }
  },

  // ═══════════════════════════════════════════════════════════
  // MOVEMENT
  // ═══════════════════════════════════════════════════════════
  {
    id: 'movement-climb',
    name: 'Climbing',
    nameLabel: 'Climbing',
    icon: 'fas fa-mountain',
    category: 'movement',
    description: 'Grants Climb speed.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.climb', mode: 5, value: 'true' }],
    flags: { relicPower: 'climbing', grantedMovement: 'climb' }
  },
  {
    id: 'movement-fly',
    name: 'Flying',
    nameLabel: 'Flying',
    icon: 'fas fa-feather',
    category: 'movement',
    description: 'Grants Fly speed.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.fly', mode: 5, value: 'true' }],
    flags: { relicPower: 'flying', grantedMovement: 'fly' }
  },
  {
    id: 'movement-levitate',
    name: 'Levitation',
    nameLabel: 'Levitating',
    icon: 'fas fa-cloud',
    category: 'movement',
    description: 'Grants Levitate (hover in place).',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.levitate', mode: 5, value: 'true' }],
    flags: { relicPower: 'levitation', grantedMovement: 'levitate' }
  },
  {
    id: 'movement-waterwalk',
    name: 'Waterwalk',
    nameLabel: 'Waterwalking',
    icon: 'fas fa-water',
    category: 'movement',
    description: 'Walk on water.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.waterwalk', mode: 5, value: 'true' }],
    flags: { relicPower: 'waterwalk', grantedMovement: 'waterwalk' }
  },
  {
    id: 'movement-blink',
    name: 'Blinking',
    nameLabel: 'Blinking',
    icon: 'fas fa-bolt',
    category: 'movement',
    description: 'Can teleport short distances.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.blink', mode: 5, value: 'true' }],
    flags: { relicPower: 'blinking', grantedMovement: 'blink' }
  },
  {
    id: 'movement-clinging',
    name: 'Clinging',
    nameLabel: 'Clinging',
    icon: 'fas fa-spider',
    category: 'movement',
    description: 'Cling to walls and ceilings.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.cling', mode: 5, value: 'true' }],
    flags: { relicPower: 'clinging', grantedMovement: 'cling' }
  },
  {
    id: 'movement-displacement',
    name: 'Displacement',
    nameLabel: 'Displaced',
    icon: 'fas fa-clone',
    category: 'movement',
    description: 'Image shifts — attackers are treated as Blinded.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }],
    flags: { relicPower: 'displacement' }
  },
  {
    id: 'movement-webwalk',
    name: 'Webwalk',
    nameLabel: 'Webwalking',
    icon: 'fas fa-spider',
    category: 'movement',
    description: 'Move through webs freely.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.movement.webwalk', mode: 5, value: 'true' }],
    flags: { relicPower: 'webwalk', grantedMovement: 'webwalk' }
  },
  {
    id: 'movement-swiftness',
    name: 'Swiftness',
    nameLabel: 'Swift',
    icon: 'fas fa-person-running',
    category: 'movement',
    description: '+5/+10/+15 Speed bonus by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.speed.bonus', mode: 2, value: '5' }],
      none:  [{ key: 'system.speed.bonus', mode: 2, value: '10' }],
      major: [{ key: 'system.speed.bonus', mode: 2, value: '15' }]
    },
    flags: { relicPower: 'swiftness' }
  },
  {
    id: 'movement-jumping',
    name: 'Jumping',
    nameLabel: 'Leaping',
    icon: 'fas fa-arrow-up',
    category: 'movement',
    description: 'Jump distance x2/x3/x4 by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [],
      none:  [],
      major: []
    },
    flags: { relicPower: 'jumping', jumpMultiplier: { minor: 2, none: 3, major: 4 } }
  },

  // ═══════════════════════════════════════════════════════════
  // SENSES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'senses-darksight',
    name: 'Darksight',
    nameLabel: 'Darksight',
    icon: 'fas fa-eye',
    category: 'senses',
    description: 'See in darkness.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.darksight', mode: 5, value: 'true' }],
    flags: { relicPower: 'darksight', grantedSense: 'darksight' }
  },
  {
    id: 'senses-echolocation',
    name: 'Echolocation',
    nameLabel: 'Echolocating',
    icon: 'fas fa-satellite-dish',
    category: 'senses',
    description: 'Perceive surroundings via sound.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.echolocation', mode: 5, value: 'true' }],
    flags: { relicPower: 'echolocation', grantedSense: 'echolocation' }
  },
  {
    id: 'senses-telepathy',
    name: 'Telepathy',
    nameLabel: 'Telepathic',
    icon: 'fas fa-comments',
    category: 'senses',
    description: 'Communicate mentally.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.telepathy', mode: 5, value: 'true' }],
    flags: { relicPower: 'telepathy', grantedSense: 'telepathy' }
  },
  {
    id: 'senses-truesight',
    name: 'True-Seeing',
    nameLabel: 'True-Seeing',
    icon: 'fas fa-eye-low-vision',
    category: 'senses',
    description: 'See through illusions and invisibility.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.allsight', mode: 5, value: 'true' }],
    flags: { relicPower: 'true-seeing', grantedSense: 'allsight' }
  },
  {
    id: 'senses-detection',
    name: 'Detection',
    nameLabel: 'Detecting',
    icon: 'fas fa-magnifying-glass',
    category: 'senses',
    description: 'Detect hidden doors, traps, and secret passages.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.detection', mode: 5, value: 'true' }],
    flags: { relicPower: 'detection', grantedSense: 'detection' }
  },
  {
    id: 'senses-life',
    name: 'Sense Life',
    nameLabel: 'Life-Sensing',
    icon: 'fas fa-heartbeat',
    category: 'senses',
    description: 'Sense living creatures within Near range.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.senseLife', mode: 5, value: 'true' }],
    flags: { relicPower: 'sense-life', grantedSense: 'senseLife' }
  },
  {
    id: 'senses-valuables',
    name: 'Sense Valuables',
    nameLabel: 'Treasure-Sensing',
    icon: 'fas fa-coins',
    category: 'senses',
    description: 'Sense valuable items and treasure within Near range.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.senses.senseValuables', mode: 5, value: 'true' }],
    flags: { relicPower: 'sense-valuables', grantedSense: 'senseValuables' }
  },

  // ═══════════════════════════════════════════════════════════
  // LIGHT EMISSION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'light-radiant',
    name: 'Radiant',
    nameLabel: 'Radiant',
    icon: 'fas fa-sun',
    category: 'light',
    description: 'Emits sunlight to Close/Near/Far range by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'radiant', lightType: 'sunlight', lightRange: { minor: 'close', none: 'near', major: 'far' } }
  },
  {
    id: 'light-moonlit',
    name: 'Moonlit',
    nameLabel: 'Moonlit',
    icon: 'fas fa-moon',
    category: 'light',
    description: 'Emits moonlight to Close/Near/Far range by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'moonlit', lightType: 'moonlight', lightRange: { minor: 'close', none: 'near', major: 'far' } }
  },
  {
    id: 'light-darkness',
    name: 'Darkness',
    nameLabel: 'Shadowy',
    icon: 'fas fa-circle',
    category: 'light',
    description: 'Emits magical darkness to Close/Near/Far range by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'darkness', lightType: 'darkness', lightRange: { minor: 'close', none: 'near', major: 'far' } }
  },

  // ═══════════════════════════════════════════════════════════
  // STEALTH — Invisibility
  // ═══════════════════════════════════════════════════════════
  {
    id: 'invisibility-1',
    name: 'Invisibility I',
    nameLabel: 'Veiled',
    icon: 'fas fa-ghost',
    category: 'stealth',
    description: 'Skip your Move to become Invisible until you move or attack.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'invisibility-i' }
  },
  {
    id: 'invisibility-2',
    name: 'Invisibility II',
    nameLabel: 'Invisible',
    icon: 'fas fa-ghost',
    category: 'stealth',
    description: 'Permanently Invisible while equipped.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.defenderStatusModifiers.attackersAreBlinded', mode: 5, value: 'true' }],
    statuses: ['invisible'],
    flags: { relicPower: 'invisibility-ii' }
  },

  // ═══════════════════════════════════════════════════════════
  // CURSED
  // ═══════════════════════════════════════════════════════════
  {
    id: 'cursed-anger',
    name: 'Cursed - Anger',
    nameLabel: 'Wrathful',
    icon: 'fas fa-skull-crossbones',
    category: 'cursed',
    description: 'Auto-fail saves vs Berserk.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.autoFailSaveVs.berserk', mode: 5, value: 'true' }],
    flags: { relicPower: 'cursed-anger', autoFailSaveVs: 'berserk' }
  },
  {
    id: 'cursed-cowardice',
    name: 'Cursed - Cowardice',
    nameLabel: 'Craven',
    icon: 'fas fa-skull-crossbones',
    category: 'cursed',
    description: 'Auto-fail saves vs Frightened.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.autoFailSaveVs.frightened', mode: 5, value: 'true' }],
    flags: { relicPower: 'cursed-cowardice', autoFailSaveVs: 'frightened' }
  },
  {
    id: 'cursed-gullibility',
    name: 'Cursed - Gullibility',
    nameLabel: 'Gullible',
    icon: 'fas fa-skull-crossbones',
    category: 'cursed',
    description: 'Auto-fail saves vs Charmed.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.autoFailSaveVs.charmed', mode: 5, value: 'true' }],
    flags: { relicPower: 'cursed-gullibility', autoFailSaveVs: 'charmed' }
  },
  {
    id: 'cursed-doom',
    name: 'Cursed - Doom',
    nameLabel: 'Doomed',
    icon: 'fas fa-skull-crossbones',
    category: 'cursed',
    description: 'Healing capped at 1 per die.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.healingCappedPerDie', mode: 5, value: '1' }],
    flags: { relicPower: 'cursed-doom', healingCappedPerDie: 1 }
  },
  {
    id: 'cursed-vulnerability',
    name: 'Cursed - Vulnerability',
    nameLabel: 'Vulnerable',
    icon: 'fas fa-heart-crack',
    category: 'cursed',
    description: '-1/-2/-3 Armor penalty by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.armorBonus', mode: 2, value: '-1' }],
      none:  [{ key: 'system.armorBonus', mode: 2, value: '-2' }],
      major: [{ key: 'system.armorBonus', mode: 2, value: '-3' }]
    },
    flags: { relicPower: 'cursed-vulnerability' }
  },
  {
    id: 'cursed-weakness',
    name: 'Cursed - Weakness',
    nameLabel: 'Weakened',
    icon: 'fas fa-arrow-down',
    category: 'cursed',
    description: '-1/-2/-3 weapon damage penalty by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '-1' }],
      none:  [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '-2' }],
      major: [{ key: 'system.universalWeaponDamageBonus', mode: 2, value: '-3' }]
    },
    flags: { relicPower: 'cursed-weakness' }
  },

  // ═══════════════════════════════════════════════════════════
  // FABLED — Unique/Epic powers
  // ═══════════════════════════════════════════════════════════
  {
    id: 'fabled-vorpal',
    name: 'Vorpal',
    nameLabel: 'Vorpal',
    icon: 'fas fa-skull',
    category: 'fabled',
    description: 'On crit, behead the target (if applicable).',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'vorpal' }
  },
  {
    id: 'fabled-vicious',
    name: 'Vicious',
    nameLabel: 'Vicious',
    icon: 'fas fa-biohazard',
    category: 'fabled',
    description: 'On crit, deal extra damage equal to 2x your Hit Die.',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'vicious' }
  },
  {
    id: 'fabled-benediction',
    name: 'Benediction',
    nameLabel: 'Blessed',
    icon: 'fas fa-cross',
    category: 'fabled',
    description: 'Once per week, revive on death with 1 HP.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'benediction' }
  },
  {
    id: 'fabled-soul-eater',
    name: 'Soul Eater',
    nameLabel: 'Soul-Eating',
    icon: 'fas fa-ghost',
    category: 'fabled',
    description: 'Creatures killed by this weapon cannot be resurrected.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'soul-eater' }
  },
  {
    id: 'fabled-blasting',
    name: 'Blasting',
    nameLabel: 'Blasting',
    icon: 'fas fa-explosion',
    category: 'fabled',
    description: 'Once per day, unleash a blast of energy dealing 6d6 damage in a Close area.',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'blasting', blastDamage: '6d6', usesPerDay: 1 }
  },
  {
    id: 'fabled-precision',
    name: 'Precision',
    nameLabel: 'Precise',
    icon: 'fas fa-bullseye',
    category: 'fabled',
    description: 'Once per day, automatically hit with an attack (no roll needed).',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'precision', usesPerDay: 1 }
  },
  {
    id: 'fabled-wish-granting',
    name: 'Wish-Granting',
    nameLabel: 'Wishing',
    icon: 'fas fa-star',
    category: 'fabled',
    description: 'Once ever, grant a single wish (GM discretion).',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'wish-granting', usesTotal: 1 }
  },

  // ═══════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'utility-warning',
    name: 'Warning',
    nameLabel: 'Warning',
    icon: 'fas fa-bell',
    category: 'utility',
    description: 'Cannot be surprised while equipped.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.cannotBeSurprised', mode: 5, value: 'true' }],
    flags: { relicPower: 'warning' }
  },
  {
    id: 'utility-loyalty',
    name: 'Loyalty',
    nameLabel: 'Loyal',
    icon: 'fas fa-hand-holding-heart',
    category: 'utility',
    description: 'Returns to owner when thrown or disarmed.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'loyalty' }
  },
  {
    id: 'utility-store-spell',
    name: 'Store Spell',
    nameLabel: 'Spell-Storing',
    icon: 'fas fa-wand-sparkles',
    category: 'utility',
    description: 'Can store one spell for later use.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'store-spell' }
  },
  {
    id: 'utility-aqua-lung',
    name: 'Aqua Lung',
    nameLabel: 'Aquatic',
    icon: 'fas fa-fish',
    category: 'utility',
    description: 'Breathe underwater.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.breatheUnderwater', mode: 5, value: 'true' }],
    flags: { relicPower: 'aqua-lung' }
  },
  {
    id: 'utility-after-image',
    name: 'After-Image',
    nameLabel: 'Flickering',
    icon: 'fas fa-clone',
    category: 'utility',
    description: 'Once per day, create an illusory duplicate (1/2/3 rounds by tier).',
    applicationMode: 'on-use',
    changes: [],
    flags: { relicPower: 'after-image', afterImageRounds: { minor: 1, none: 2, major: 3 }, usesPerDay: 1 }
  },
  {
    id: 'utility-ambassador',
    name: 'Ambassador',
    nameLabel: 'Diplomatic',
    icon: 'fas fa-handshake',
    category: 'utility',
    description: 'Understand and speak all languages while equipped.',
    applicationMode: 'when-equipped',
    changes: [{ key: 'system.speakAllLanguages', mode: 5, value: 'true' }],
    flags: { relicPower: 'ambassador' }
  },
  {
    id: 'utility-holding',
    name: 'Holding',
    nameLabel: 'Holding',
    icon: 'fas fa-box',
    category: 'utility',
    description: '+2/+4/+6 inventory slots by tier.',
    applicationMode: 'when-equipped',
    changes: [],
    tierValues: {
      minor: [{ key: 'system.inventory.bonusSlots', mode: 2, value: '2' }],
      none:  [{ key: 'system.inventory.bonusSlots', mode: 2, value: '4' }],
      major: [{ key: 'system.inventory.bonusSlots', mode: 2, value: '6' }]
    },
    flags: { relicPower: 'holding' }
  },
  {
    id: 'utility-infinite',
    name: 'Infinite',
    nameLabel: 'Infinite',
    icon: 'fas fa-infinity',
    category: 'utility',
    description: 'Item never runs out of ammunition or charges.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'infinite' }
  },
  {
    id: 'utility-unique',
    name: 'Unique',
    nameLabel: 'Unique',
    icon: 'fas fa-fingerprint',
    category: 'utility',
    description: 'Only the attuned wielder can use this item.',
    applicationMode: 'when-equipped',
    changes: [],
    flags: { relicPower: 'unique' }
  }
];

/**
 * Get a power by ID
 */
export function getRelicPower(id) {
  return RELIC_POWERS.find(p => p.id === id);
}

/**
 * Get all powers in a category
 */
export function getPowersByCategory(category) {
  if (category === 'all') return RELIC_POWERS;
  return RELIC_POWERS.filter(p => p.category === category);
}
