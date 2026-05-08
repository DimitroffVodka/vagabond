# Vagabond Effects Compendium — Inventory

Generated from `packs/_source/effects/` on branch `v14-effects-compendium`. 
**188 effects across 7 folders.** Each entry below is a V14 primary ActiveEffect document; modules can reference any of them as `Compendium.vagabond.effects.ActiveEffect.<id>`.

Each row shows: human name, canonical-slug flag (`flags.vagabond.canonicalId`), the stable 16-char Foundry ID, status-icon links, the mechanical changes the effect applies to actor data, and the in-system description.

---

## ⚡ Status Conditions — 19 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| Berserk | `berserk` | `berserk000lrddgz` | berserk | _(no mechanical changes)_ | Can't take Cast Action or Focus. Doesn't make Morale Checks. Can't be Frightened. Barbarian Rage: dice upsize, explode, and damage reduction while active. |
| Blinded | `blinded` | `blinded000q40div` | blinded | `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Can't see. Vulnerable. |
| Burning | `burning` | `burning000w42j2y` | burning | _(no mechanical changes)_ | Takes damage at the start of its turn. Can be ended by an appropriate action. |
| Charmed | `charmed` | `charmed0009p1oc9` | charmed | _(no mechanical changes)_ | Can't willingly make an Attack Action targeting the one who Charmed it. |
| Confused | `confused` | `confused00fgtfks` | confused | `system.favorHinder` = hinder; `system.outgoingSavesModifier` = favor | Checks and Saves have Hinder. Saves against its Actions have Favor. |
| Dazed | `dazed` | `dazed000003m1fnx` | dazed | `system.speed.bonus` + -999 | Can't Focus or Move unless it uses an Action to do so. Speed reduced to 0. |
| Dead | `dead` | `dead000000yjr6c3` | dead | `system.autoFailAllRolls` = true; `system.speed.bonus` + -999; `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Automatically fails ALL rolls. Incapacitated. Speed = 0. |
| Fatigued | `fatigued` | `fatigued00o2ktke` | fatigued | _(no mechanical changes)_ | Each Fatigue occupies an Item Slot. At 3+ Fatigue, can't Rush. At 5 Fatigue, dies. |
| Focusing | `focusing` | `focusing00s7fu4j` | focusing | _(no mechanical changes)_ | Currently sustaining one or more spells through Focus. |
| Frightened | `frightened` | `frightened2yqgx1` | frightened | `system.universalDamageBonus` + -2 | -2 penalty to all damage dealt. |
| Incapacitated | `incapacitated` | `incapacitav2ufn3` | incapacitated | `system.autoFailStats` + might; `system.autoFailStats` + dexterity; `system.speed.bonus` + -999; `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Can't Focus, use Actions, or Move. Auto-fails Might and Dexterity checks. Vulnerable. Speed = 0. |
| Invisible | `invisible` | `invisible0aoq8ay` | invisible | `system.defenderStatusModifiers.attackersAreBlinded` = true | Can't be seen. Attackers act as Blinded (attacks Hindered). |
| Paralyzed | `paralyzed` | `paralyzed04ba6s1` | paralyzed | `system.autoFailStats` + might; `system.autoFailStats` + dexterity; `system.speed.bonus` + -999; `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Incapacitated + Speed = 0. |
| Prone | `prone` | `prone000003uvasp` | prone | `system.speed.bonus` + -999; `system.incomingMeleeAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Speed = 0. Vulnerable to Melee Attacks and Dodge Checks. |
| Restrained | `restrained` | `restrained2brmuu` | restrained | `system.speed.bonus` + -999; `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Vulnerable + Speed = 0. |
| Sickened | `sickened` | `sickened005qazu3` | sickened | `system.incomingHealingModifier` + -2 | -2 penalty to any healing received. |
| Suffocating | `suffocating` | `suffocatinoy3py6` | suffocating | _(no mechanical changes)_ | After not breathing for 1 minute, each round: Heroes roll d8 (if &gt;= Might, gain 1 Fatigue), Enemies gain 1 Fatigue. |
| Unconscious | `unconscious` | `unconsciou4wgpby` | unconscious | `system.autoFailStats` + might; `system.autoFailStats` + dexterity; `system.speed.bonus` + -999; `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor; `system.defenderStatusModifiers.closeAttacksAutoCrit` = true | Blinded + Incapacitated + Prone. Close Attacks always Crit. |
| Vulnerable | `vulnerable` | `vulnerablezv8jo5` | vulnerable | `system.favorHinder` = hinder; `system.incomingAttacksModifier` = favor; `system.outgoingSavesModifier` = favor | Attacks and saves have Hinder. Attacks targeting it have Favor. Saves against its attacks have Favor. |

## 🟢 Buffs & Bonuses — 32 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| + Mana Casting | `perk-metamagic-plus-1-mana-casting` | `perkmetamagkqjm4` | — | `system.mana.castingMaxBonus` + 1 | Metamagic perk: +1 to max mana per casting. |
| +1 Spell Damage | `spell-plus-1-spell-damage` | `spell1speltniwyi` | — | `system.universalSpellDamageBonus` + 1 | +1 flat damage bonus to spell damage. |
| +2 Inv. Slots | `perk-pack-mule-plus-2-slots` | `perkpackmu4x3d0m` | — | `system.inventory.bonusSlots` + 2 | Pack Mule perk: +2 inventory slots. |
| +Mana | `perk-secret-of-mana-plus-mana-level` | `perksecretb5l9zd` | — | `system.mana.bonus` + @lvl | Secret of Mana perk: bonus mana equal to character level. |
| Armor Bonus (+1) | `armor-bonus-plus-1` | `armorbonuswoqi7u` | — | `system.armorBonus` + 1 | +1 bonus to Armor value. |
| Armor Bonus (+2) | `armor-bonus-plus-2` | `armorbonuswoqi8r` | — | `system.armorBonus` + 2 | +2 bonus to Armor value. |
| Awareness +1 | `awareness-plus-1` | `awareness1t8xyp6` | — | `system.stats.awareness.bonus` + 1 | +1 bonus to Awareness. |
| Bonus Inventory | `gear-backpack-plus-2-slots` | `gearbackpa6yoys1` | — | `system.inventory.bonusSlots` + 2 | Backpack: +2 bonus inventory slots. |
| Brawl Check Favor | `brawl-check-favor` | `brawlcheck95skjd` | — | `system.brawlCheckFavor` = true | Brawl checks have Favor. |
| Damage Bonus (+1) | `damage-bonus-plus-1` | `damagebonukqwha0` | — | `system.universalDamageBonus` + 1 | +1 flat bonus to all damage dealt. |
| Damage Bonus (+2) | `damage-bonus-plus-2` | `damagebonukqwhax` | — | `system.universalDamageBonus` + 2 | +2 flat bonus to all damage dealt. |
| Dexterity +1 | `dexterity-plus-1` | `dexterity18lkn9f` | — | `system.stats.dexterity.bonus` + 1 | +1 bonus to Dexterity. |
| Endure Save +1 | `endure-save-plus-1` | `enduresavepinhcj` | — | `system.saves.endure.bonus` + 1 | +1 bonus to Endure saves. |
| Favored (All Rolls) | `favored-all-rolls` | `favoredall313vgi` | — | `system.favorHinder` = favor | All d20 rolls have Favor (roll 2d20, take higher). |
| HP Bonus (+10) | `hp-bonus-plus-10` | `hpbonus100cg1lgh` | — | `system.health.bonus` + 10 | +10 bonus to maximum HP. |
| HP Bonus (+5) | `hp-bonus-plus-5` | `hpbonus5001gulh1` | — | `system.health.bonus` + 5 | +5 bonus to maximum HP. |
| HP Per Level (+1) | `hp-per-level-plus-1` | `hpperlevelejigzt` | — | `system.bonuses.hpPerLevel` + 1 | +1 HP per character level. |
| Hulking | `ancestry-orc-hulking-plus-2-slots` | `ancestryorixcurl` | — | `system.inventory.bonusSlots` + 2 | Orc trait: Hulking grants +2 inventory slots. |
| Luck +1 | `luck-plus-1` | `luck100000wb3fkg` | — | `system.stats.luck.bonus` + 1 | +1 bonus to Luck. |
| Max Health Increase | `perk-tough-plus-1-hp-level` | `perktough1jpurac` | — | `system.bonuses.hpPerLevel` + 1 | Tough perk: +1 HP per character level. |
| Might +1 | `might-plus-1` | `might1000063s1y2` | — | `system.stats.might.bonus` + 1 | +1 bonus to Might. |
| Naturally Attuned (Elf Trait) | `ancestry-elf-naturally-attuned` | `ancestryel2083yo` | — | `system.attributes.isSpellcaster` = true; `system.attributes.manaMultiplier` = 1; `system.attributes.castingStat` = reason | Elf trait: Naturally Attuned grants innate spellcasting (Reason-based, 1x mana multiplier). |
| Nimble | `ancestry-nimble-plus-5-speed` | `ancestryniy6sgv5` | — | `system.speed.bonus` + 5 | Halfling/Goblin trait: Nimble grants +5 feet to Speed. |
| Presence +1 | `presence-plus-1` | `presence10qsdqd2` | — | `system.stats.presence.bonus` + 1 | +1 bonus to Presence. |
| Reason +1 | `reason-plus-1` | `reason1000esxi95` | — | `system.stats.reason.bonus` + 1 | +1 bonus to Reason. |
| Reflex Save +1 | `reflex-save-plus-1` | `reflexsaveek905y` | — | `system.saves.reflex.bonus` + 1 | +1 bonus to Reflex saves. |
| Scale | `ancestry-draken-scale-plus-1-armor` | `ancestrydrolxbw3` | — | `system.armorBonus` + 1 | Draken trait: Scale grants +1 natural Armor bonus. |
| Speed Bonus (+10ft) | `speed-bonus-plus-10ft` | `speedbonusj4xp1w` | — | `system.speed.bonus` + 10 | +10ft bonus to Speed. |
| Spell Crit Range -1 | `spell-crit-range-minus-1` | `spellcritrd0yh30` | — | `system.spellCritBonus` + 1 | Spell critical hit threshold reduced by 1. |
| Spell Damage Die +1 Step | `spell-damage-die-plus-1-step` | `spelldamagd9vtgo` | — | `system.spellDamageDieSizeBonus` + 1 | Spell damage die increases by one step. |
| Tough (Dwarf Trait) | `ancestry-dwarf-tough-plus-1-hp-level` | `ancestrydw9zkob3` | — | `system.bonuses.hpPerLevel` + 1 | Dwarf trait: Tough grants +1 HP per character level. |
| Will Save +1 | `will-save-plus-1` | `willsave10ugeimg` | — | `system.saves.will.bonus` + 1 | +1 bonus to Will saves. |

## 🔴 Debuffs & Penalties — 9 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| Awareness -1 | `awareness-minus-1` | `awareness1t8xyr0` | — | `system.stats.awareness.bonus` + -1 | -1 penalty to Awareness. |
| Damage Penalty (-2) | `damage-penalty-minus-2` | `damagepenaxwbwfl` | — | `system.universalDamageBonus` + -2 | -2 flat penalty to all damage dealt. |
| Dexterity -1 | `dexterity-minus-1` | `dexterity18lknb9` | — | `system.stats.dexterity.bonus` + -1 | -1 penalty to Dexterity. |
| Hindered (All Rolls) | `hindered-all-rolls` | `hinderedalqkjrmm` | — | `system.favorHinder` = hinder | All d20 rolls have Hinder (roll 2d20, take lower). |
| Luck -1 | `luck-minus-1` | `luck100000wb3fma` | — | `system.stats.luck.bonus` + -1 | -1 penalty to Luck. |
| Might -1 | `might-minus-1` | `might1000063s1zw` | — | `system.stats.might.bonus` + -1 | -1 penalty to Might. |
| Presence -1 | `presence-minus-1` | `presence10qsdqew` | — | `system.stats.presence.bonus` + -1 | -1 penalty to Presence. |
| Reason -1 | `reason-minus-1` | `reason1000esxiaz` | — | `system.stats.reason.bonus` + -1 | -1 penalty to Reason. |
| Speed Penalty (-10ft) | `speed-penalty-minus-10ft` | `speedpenalhhol4c` | — | `system.speed.bonus` + -10 | -10ft penalty to Speed. |

## ⚔️ Weapon Enhancements — 7 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| +1 Weapon Damage | `weapon-plus-1-weapon-damage` | `weapon1weax0qg4u` | — | `system.universalWeaponDamageBonus` + 1 | +1 flat damage bonus to weapon attacks. |
| +1d4 Weapon Damage | `weapon-plus-1d4-weapon-damage` | `weapon1d4wvxc77q` | — | `system.universalWeaponDamageDice` + 1d4 | +1d4 bonus dice to weapon damage. |
| Keen Property | `weapon-keen-crit-19-plus` | `weaponkeeny2xotg` | — | `system.critNumber` = 19 | Keen property: critical hits on 19 or 20. |
| Melee Crit Range -1 | `weapon-melee-crit-range-minus-1` | `weaponmele0qxffy` | — | `system.meleeCritBonus` + 1 | Melee weapon critical hit threshold reduced by 1 (e.g. 20 -&gt; 19). |
| Melee Damage Die +1 Step | `weapon-melee-damage-die-plus-1-step` | `weaponmele82cn8a` | — | `system.meleeDamageDieSizeBonus` + 1 | Melee weapon damage die increases by one step (d4 -&gt; d6 -&gt; d8 -&gt; d10 -&gt; d12). |
| Ranged Crit Range -1 | `weapon-ranged-crit-range-minus-1` | `weaponrangqizh1z` | — | `system.rangedCritBonus` + 1 | Ranged weapon critical hit threshold reduced by 1. |
| Ranged Damage Die +1 Step | `weapon-ranged-damage-die-plus-1-step` | `weaponranga9j9pf` | — | `system.rangedDamageDieSizeBonus` + 1 | Ranged weapon damage die increases by one step. |

## 💎 Material Bonuses — 3 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| Adamant Armor | `material-adamant-armor` | `materialadfh6ufq` | — | `system.armorBonus` + 1 | Adamant armor: +1 Armor. Occupies 1 extra slot. Cost x50. |
| Adamant Weapon | `material-adamant-weapon` | `materialadt2hkyn` | — | `system.universalWeaponDamageBonus` + 1 | Adamant weapon: +1 damage. Occupies 1 extra slot. Cost x50. |
| Mythral | `material-mythral` | `materialmyz5m7fz` | — | `system.inventory.bonusSlots` + 1 | Mythral: occupies 1 fewer slot (minimum 1). Cost x50. |

## ✨ Relic Powers — 96 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| +1 Attack Dmg | `bonus-weapon-plus-1` | `bonusweapo6cqbi7` | — | `system.universalWeaponDamageBonus` + 1 | Enchanted weapon: +1 damage to weapon attacks. |
| +1 Spell Dmg | `bonus-trinket-plus-1` | `bonustrinkkh7jue` | — | `system.universalSpellDamageBonus` + 1 | Enchanted trinket: +1 spell damage. |
| +10 Speed | `movement-swiftness-ii` | `movementswb9lsdx` | — | `system.speed.bonus` + 10 | Enchanted swiftness: +10 feet to Speed. |
| +15 Speed | `movement-swiftness-iii` | `movementsww5lvby` | — | `system.speed.bonus` + 15 | Enchanted swiftness: +15 feet to Speed. |
| +2 Attack Dmg | `bonus-weapon-plus-2` | `bonusweapo6cqbi8` | — | `system.universalWeaponDamageBonus` + 2 | Enchanted weapon: +2 damage to weapon attacks. |
| +2 Spell Dmg | `bonus-trinket-plus-2` | `bonustrinkkh7juf` | — | `system.universalSpellDamageBonus` + 2 | Enchanted trinket: +2 spell damage. |
| +3 Attack Dmg | `bonus-weapon-plus-3` | `bonusweapo6cqbi9` | — | `system.universalWeaponDamageBonus` + 3 | Enchanted weapon: +3 damage to weapon attacks. |
| +3 Spell Dmg | `bonus-trinket-plus-3` | `bonustrinkkh7jug` | — | `system.universalSpellDamageBonus` + 3 | Enchanted trinket: +3 spell damage. |
| +5 Speed | `movement-swiftness-i` | `movementswj8rqcs` | — | `system.speed.bonus` + 5 | Enchanted swiftness: +5 feet to Speed. |
| +d4 Dmg | `strike-strike-i` | `strikestri6hur3z` | — | `system.universalWeaponDamageDice` + 1d4 | Enchanted strike: +1d4 bonus weapon damage die. |
| +d6 Dmg | `strike-strike-ii` | `strikestrigs1t60` | — | `system.universalWeaponDamageDice` + 1d6 | Enchanted strike: +1d6 bonus weapon damage die. |
| +d8 Dmg | `strike-strike-iii` | `strikestri0yyf5d` | — | `system.universalWeaponDamageDice` + 1d8 | Enchanted strike: +1d8 bonus weapon damage die. |
| Ace - Brutal | `ace-brutal` | `acebrutal0kkflc5` | — | _(no mechanical changes)_ | Ace property: deals an extra damage die from the Brutal property. |
| Ace - Cleave | `ace-cleave` | `acecleave0l354x7` | — | _(no mechanical changes)_ | Ace property: can deal full damage to two Targets. |
| Ace - Entangle | `ace-entangle` | `aceentanglqjqpgp` | — | _(no mechanical changes)_ | Ace property: target is considered Vulnerable for ending the Restrained status. |
| Ace - Keen | `ace-keen` | `acekeen00021tmn2` | — | `system.meleeCritBonus` + 2; `system.rangedCritBonus` + 2 | Ace property: critical hit threshold reduced by 2 instead of 1 (e.g. 20 → 18). |
| Ace - Long | `ace-long` | `acelong00021umzv` | — | _(no mechanical changes)_ | Ace property: weapon range is 10 feet further, rather than 5 feet further. |
| Ace - Thrown | `ace-thrown` | `acethrown0w0pj0d` | — | _(no mechanical changes)_ | Ace property: deals an extra damage die when attacking by throwing it. |
| Aqua Lung | `utility-aqua-lung` | `utilityaqu16aav8` | — | _(no mechanical changes)_ | Wearer can breathe water. |
| Armor +1 | `bonus-armor-plus-1` | `bonusarmor9leeqe` | — | `system.armorBonus` + 1 | Enchanted armor: +1 Armor bonus. |
| Armor +2 | `bonus-armor-plus-2` | `bonusarmor9leeqf` | — | `system.armorBonus` + 2 | Enchanted armor: +2 Armor bonus. |
| Armor +3 | `bonus-armor-plus-3` | `bonusarmor9leeqg` | — | `system.armorBonus` + 3 | Enchanted armor: +3 Armor bonus. |
| Bane (General) | `bane-general` | `banegenerap6vp8m` | — | _(no mechanical changes)_ | Extra damage vs. an entire Being Type (e.g. Cryptids). Set the Being type in the effect name. |
| Bane (Niche) | `bane-niche` | `baneniche04fu7zj` | — | _(no mechanical changes)_ | Extra damage vs. extremely specific Beings (e.g. Trolls). Set the Being type in the effect name. |
| Bane (Specific) | `bane-specific` | `banespeciffpvpzi` | — | _(no mechanical changes)_ | Extra damage vs. a Being subtype (e.g. giants). Set the Being type in the effect name. |
| Benediction | `fabled-benediction` | `fabledbenev6ks50` | — | _(no mechanical changes)_ | Immediately revived upon death by dropping to 0 HP, once per week. |
| Blasting | `fabled-blasting` | `fabledblasua5vtw` | — | _(no mechanical changes)_ | Can send a beam of magic energy to attack. |
| Blinking | `movement-blinking` | `movementbl8u6rpn` | — | _(no mechanical changes)_ | Wearer is under the effects of the Blink spell. |
| Bravery | `resistance-bravery` | `resistanceyq6vha` | — | _(no mechanical changes)_ | Grants Favor on Saves against the Frightened status. |
| Burning I | `utility-burning-i` | `utilitybursekcf8` | — | `system.onHitBurningDice` = d4 | On hit: target gains Burning with a Cd4 countdown die. Automated — applies Burning status and creates countdown die on damage dealt. |
| Burning II | `utility-burning-ii` | `utilityburtgdsq5` | — | `system.onHitBurningDice` = d6 | On hit: target gains Burning with a Cd6 countdown die. Automated — applies Burning status and creates countdown die on damage dealt. |
| Burning III | `utility-burning-iii` | `utilityburt39ora` | — | `system.onHitBurningDice` = d8 | On hit: target gains Burning with a Cd8 countdown die. Automated — applies Burning status and creates countdown die on damage dealt. |
| Clarity | `resistance-clarity` | `resistanceh63mor` | — | _(no mechanical changes)_ | Grants Favor on Saves against the Confused status. |
| Climbing | `movement-climbing` | `movementcl3c30ea` | — | _(no mechanical changes)_ | Wearer gains Climb movement. |
| Clinging | `movement-clinging` | `movementcl3cwa3s` | — | _(no mechanical changes)_ | Wearer gains Cling movement (walk on walls/ceilings). |
| Cursed Anger | `cursed-anger` | `cursedange0ld0x1` | — | _(no mechanical changes)_ | Cursed: wearer always fails Saves against Berserk. |
| Cursed Cowardice | `cursed-cowardice` | `cursedcowaaeq64p` | — | _(no mechanical changes)_ | Cursed: wearer always fails Saves against Frightened. |
| Cursed Doom | `cursed-doom` | `curseddoom4bosqv` | — | _(no mechanical changes)_ | Cursed: wearer only regains 1 Hit Point per die used for healing rolls targeting it. |
| Cursed Gullibility | `cursed-gullibility` | `cursedgull852io2` | — | _(no mechanical changes)_ | Cursed: wearer always fails Saves against Charmed. |
| Darkness I | `utility-darkness-i-close` | `utilitydarbmi2fl` | — | _(no mechanical changes)_ | Darkens non-magical light within Close while Equipped. |
| Darkness II | `utility-darkness-ii-near` | `utilitydaro9z2tm` | — | _(no mechanical changes)_ | Darkens non-magical light within Near while Equipped. |
| Darkness III | `utility-darkness-iii-far` | `utilitydar6mse86` | — | _(no mechanical changes)_ | Darkens non-magical light within Far while Equipped. |
| Darksight | `senses-nightvision` | `sensesnigha1x5xx` | — | _(no mechanical changes)_ | Grants Darksight (see in darkness). |
| Detection | `senses-detection` | `sensesdetec80rvm` | — | _(no mechanical changes)_ | Grants All-Sight to see a specific Being Type (Bound). |
| Displacement | `movement-displacement` | `movementdirs3i1i` | — | `system.defenderStatusModifiers.attackersAreBlinded` = true | Sight-based attacks against the wearer are made as if the attacker is Blinded (attacks Hindered). |
| Echolocation | `senses-echolocation` | `sensesechoeearzv` | — | _(no mechanical changes)_ | Grants Echolocation. |
| Flying | `movement-flying` | `movementfldj5r3a` | — | _(no mechanical changes)_ | Wearer gains Fly movement. |
| Holding I | `utility-holding-i` | `utilityholeieyfo` | — | `system.inventory.bonusSlots` + 2 | Enchanted holding: grants +2 bonus Item Slots. |
| Holding II | `utility-holding-ii` | `utilityholgp18kd` | — | `system.inventory.bonusSlots` + 4 | Enchanted holding: grants +4 bonus Item Slots. |
| Holding III | `utility-holding-iii` | `utilityholy7fjba` | — | `system.inventory.bonusSlots` + 6 | Enchanted holding: grants +6 bonus Item Slots. |
| Invisibility I | `utility-invisibility-i` | `utilityinvenm5bi` | invisible | `system.defenderStatusModifiers.attackersAreBlinded` = true | Skip Move to become Invisible until after taking an Action. |
| Invisibility II | `utility-invisibility-ii` | `utilityinvlgmjqv` | invisible | `system.defenderStatusModifiers.attackersAreBlinded` = true | Wearer is permanently Invisible while equipped. |
| Jumping I | `movement-jumping-i` | `movementjuyvxz8g` | — | _(no mechanical changes)_ | Wearer's horizontal jump distance is multiplied by 2. |
| Jumping II | `movement-jumping-ii` | `movementjuuajjl5` | — | _(no mechanical changes)_ | Wearer's horizontal jump distance is multiplied by 3. |
| Jumping III | `movement-jumping-iii` | `movementjukqjb6a` | — | _(no mechanical changes)_ | Wearer's horizontal jump distance is multiplied by 4. |
| Levitation | `movement-levitation` | `movementlexrwdy4` | — | _(no mechanical changes)_ | Wearer can Fly up or down, but not laterally (Levitate spell effect). |
| Lifesteal I | `utility-lifesteal-i` | `utilityliffhuo14` | — | `system.onKillHealDice` + 1d8 | On kill: wielder heals for 1d8 HP. Automated — heals attacker when target reaches 0 HP. |
| Lifesteal II | `utility-lifesteal-ii` | `utilityliftnirn5` | — | `system.onKillHealDice` + 2d8 | On kill: wielder heals for 2d8 HP. Automated — heals attacker when target reaches 0 HP. |
| Lifesteal III | `utility-lifesteal-iii` | `utilitylifzmtp0a` | — | `system.onKillHealDice` + 3d8 | On kill: wielder heals for 3d8 HP. Automated — heals attacker when target reaches 0 HP. |
| Loyalty | `utility-loyalty` | `utilityloys8osl0` | — | _(no mechanical changes)_ | Magically returns to the Bound wielder's hand if thrown to attack. |
| Manasteal I | `utility-manasteal-i` | `utilityman4uo2xx` | — | `system.onKillManaDice` + 1d4 | On kill: bound wielder restores 1d4 Mana. Automated — restores mana when target reaches 0 HP. |
| Manasteal II | `utility-manasteal-ii` | `utilitymani1ul72` | — | `system.onKillManaDice` + 2d4 | On kill: bound wielder restores 2d4 Mana. Automated — restores mana when target reaches 0 HP. |
| Manasteal III | `utility-manasteal-iii` | `utilitymanrg4zpz` | — | `system.onKillManaDice` + 3d4 | On kill: bound wielder restores 3d4 Mana. Automated — restores mana when target reaches 0 HP. |
| Moonlit I | `utility-moonlit-i-moonlight-close` | `utilitymoom92jlh` | — | _(no mechanical changes)_ | Sheds Moonlight out to Close while Equipped. |
| Moonlit II | `utility-moonlit-ii-moonlight-near` | `utilitymoo50ohwu` | — | _(no mechanical changes)_ | Sheds Moonlight out to Near while Equipped. |
| Moonlit III | `utility-moonlit-iii-moonlight-far` | `utilitymoocar2p6` | — | _(no mechanical changes)_ | Sheds Moonlight out to Far while Equipped. |
| Precision | `fabled-precision` | `fabledprec25pzmk` | — | _(no mechanical changes)_ | Once per day, gain Favor on attacks for 1 minute, or until you miss. |
| Protection (General) | `protection-general` | `protectioncaulzr` | — | _(no mechanical changes)_ | Damage reduction vs. an entire Being Type (e.g. Cryptids). Set the Being type in the effect name. |
| Protection (Niche) | `protection-niche` | `protection52w7i8` | — | _(no mechanical changes)_ | Damage reduction vs. extremely specific Beings (e.g. Trolls). Set the Being type in the effect name. |
| Protection (Specific) | `protection-specific` | `protectiongjk2pr` | — | _(no mechanical changes)_ | Damage reduction vs. a Being subtype (e.g. giants). Set the Being type in the effect name. |
| Protection +1 | `bonus-protection-plus-1` | `bonusprote9r4p3w` | — | `system.saves.reflex.bonus` + 1; `system.saves.endure.bonus` + 1; `system.saves.will.bonus` + 1 | Enchanted protection: +1 to all saves (Reflex, Endure, Will). |
| Protection +2 | `bonus-protection-plus-2` | `bonusprote9r4p3x` | — | `system.saves.reflex.bonus` + 2; `system.saves.endure.bonus` + 2; `system.saves.will.bonus` + 2 | Enchanted protection: +2 to all saves (Reflex, Endure, Will). |
| Protection +3 | `bonus-protection-plus-3` | `bonusprote9r4p3y` | — | `system.saves.reflex.bonus` + 3; `system.saves.endure.bonus` + 3; `system.saves.will.bonus` + 3 | Enchanted protection: +3 to all saves (Reflex, Endure, Will). |
| Radiant I | `utility-radiant-i-sunlight-close` | `utilityradqh8177` | — | _(no mechanical changes)_ | Sheds Sunlight out to Close while Equipped. |
| Radiant II | `utility-radiant-ii-sunlight-near` | `utilityradkdac0c` | — | _(no mechanical changes)_ | Sheds Sunlight out to Near while Equipped. |
| Radiant III | `utility-radiant-iii-sunlight-far` | `utilityrad0059hk` | — | _(no mechanical changes)_ | Sheds Sunlight out to Far while Equipped. |
| Repulsing | `resistance-repulsing` | `resistance9l2rdo` | — | _(no mechanical changes)_ | Grants Favor on Saves against the Charmed status. |
| Resistance (Type) | `resistance-resistance` | `resistancec4o3ck` | — | _(no mechanical changes)_ | Favor on Saves and damage reduction against a specific damage source (e.g. fire, cold). Set the source in the effect name. |
| Sense Life | `senses-sense-life` | `sensessens5dooyp` | — | _(no mechanical changes)_ | Senses Small and larger Beings within Far who are not Artificials or Undead. |
| Sense Valuables | `senses-sense-valuables` | `sensessensvqma2o` | — | _(no mechanical changes)_ | Senses gold and gems within Near. |
| Soul Eater | `fabled-soul-eater` | `fabledsouly2l878` | — | _(no mechanical changes)_ | Those killed by it can't be resurrected unless a wish is granted to do so. |
| Store Spell | `utility-store-spell` | `utilitystoaqfmer` | — | _(no mechanical changes)_ | Reduce Caster's Maximum Mana to store a Casting of a Spell in the item. |
| Telepathy | `senses-telepathy` | `sensestele3kqlpv` | — | _(no mechanical changes)_ | Grants Telepathy (Bound). |
| Tremors | `senses-tremors` | `sensestremkt38of` | — | _(no mechanical changes)_ | Grants Seismicsense (Bound). |
| True-Seeing | `senses-true-seeing` | `sensestrueo9jx4b` | — | _(no mechanical changes)_ | Grants All-Sight (Bound) — see through illusions and invisibility. |
| Vicious | `fabled-vicious` | `fabledviciqey3o2` | — | _(no mechanical changes)_ | On a Crit, the target takes extra damage equal to twice its HD. |
| Vorpal | `fabled-vorpal` | `fabledvorpw5hilg` | — | _(no mechanical changes)_ | Behead Target on Crit if the Target takes the damage. |
| Vulnerability -1 | `cursed-vulnerability-minus-1` | `cursedvuln6wo5kw` | — | `system.armorBonus` + -1 | Cursed armor: -1 Armor. |
| Vulnerability -2 | `cursed-vulnerability-minus-2` | `cursedvuln6wo5kx` | — | `system.armorBonus` + -2 | Cursed armor: -2 Armor. |
| Vulnerability -3 | `cursed-vulnerability-minus-3` | `cursedvuln6wo5ky` | — | `system.armorBonus` + -3 | Cursed armor: -3 Armor. |
| Warning | `utility-warning` | `utilitywar5vcbuk` | — | _(no mechanical changes)_ | Bound Being can't be surprised, and is awoken if foes are Near. |
| Waterwalk | `movement-waterwalk` | `movementwawvmvv3` | — | _(no mechanical changes)_ | Wearer can walk on liquids. |
| Weakness -1 | `cursed-weakness-minus-1` | `cursedweakl0ei5z` | — | `system.universalWeaponDamageBonus` + -1 | Cursed weapon: -1 weapon damage. |
| Weakness -2 | `cursed-weakness-minus-2` | `cursedweakl0ei60` | — | `system.universalWeaponDamageBonus` + -2 | Cursed weapon: -2 weapon damage. |
| Weakness -3 | `cursed-weakness-minus-3` | `cursedweakl0ei61` | — | `system.universalWeaponDamageBonus` + -3 | Cursed weapon: -3 weapon damage. |
| Webwalk | `movement-webwalk` | `movementwencebyi` | — | _(no mechanical changes)_ | Wearer ignores Difficult Terrain of webs, and cannot be Restrained by them. |

## 📘 Class Features — 22 entries

| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |
|---|---|---|---|---|---|
| Aggressor | `barbarian-aggressor` | `barbarianabi165q` | — | `system.hasAggressor` = true | Additional Barbarian aggression mechanics. |
| Bloodthirsty | `barbarian-bloodthirsty` | `barbarianbddfz6w` | — | `system.hasBloodthirsty` = true | Heal on kill while Raging. |
| Bravado | `bard-bravado` | `bardbravadgy500n` | — | `system.hasBravado` = true | Will Saves can't be Hindered while not Incapacitated. Ignore effects that rely on hearing. |
| Climax | `bard-climax` | `bardclimax5xztqu` | — | `system.hasClimax` = true | Favor and bonus dice you grant can Explode. |
| Deep Pockets (Feature) | `merchant-deep-pockets-plus-1-slot` | `merchantde17e6rb` | — | `system.inventory.bonusSlots` + 1 | Merchant feature: +1 inventory slot. |
| Evasive | `rogue-evasive` | `rogueevasiwfcaqc` | — | `system.hasEvasive` = true | No Hinder on Dodge saves from Heavy Armor. On success, remove TWO highest dice instead of one. |
| Fearmonger | `barbarian-fearmonger` | `barbarianfit5dnr` | — | `system.hasFearmonger` = true | Barbarian fear mechanics. |
| Fisticuffs | `fisticuffs` | `fisticuffs6babjv` | — | `system.fisticuffs` = true | Unarmed strikes deal lethal damage and scale with class. |
| Lethal Weapon | `rogue-lethal-weapon` | `rogueletha39as91` | — | `system.hasLethalWeapon` = true | Sneak Attack always applies (ignores once-per-round limit). |
| lv10 - Sculpt Spell | `wizard-sculpt-spell-lv10` | `wizardscul47is1r` | — | `system.bonuses.deliveryManaCostReduction` + (@lvl >= 10) ? 1 : 0 | Wizard Lv10: additional -1 delivery mana cost. |
| lv10 - Spell-Slinger | `sorcerer-spell-slinger-lv10` | `sorcererspjms77d` | — | `system.spellCritBonus` + (@lvl >= 10) ? -1 : 0 | Sorcerer Lv10: additional -1 spell crit threshold. |
| lv2 - Sculpt Spell | `wizard-sculpt-spell-lv2` | `wizardsculnsyncg` | — | `system.bonuses.deliveryManaCostReduction` + (@attributes.level.value >= 2) ? 1 : 0 | Wizard Lv2: -1 delivery mana cost. |
| lv2 - Spell-Slinger | `sorcerer-spell-slinger-lv2` | `sorcerersppyd0tm` | — | `system.spellCritBonus` + (@lvl >= 2) ? -1 : 0; `system.spellDamageDieSizeBonus` + (@lvl >= 2) ? 2 : 0 | Sorcerer Lv2: -1 spell crit threshold and +2 spell damage die size steps. |
| Mindless Rancor | `barbarian-mindless-rancor` | `barbarianme03nl1` | — | `system.hasMindlessRancor` = true | While Raging: immune to mental effects. |
| Rage | `barbarian-rage` | `barbarianrxf8i3k` | — | `system.hasRage` = true | While Berserk in Light/No armor: damage dice upsize by 1 step, damage dice explode, and damage reduction per die. |
| Rage Damage Reduction | `barbarian-rage-damage-reduction-1-die` | `barbarianra36my7` | — | `system.rageDamageReduction` = 1 | While Raging, reduce each incoming damage die by 1. |
| Rage Damage Reduction (Improved) | `barbarian-rage-damage-reduction-2-die` | `barbarianraqhg0g` | — | `system.rageDamageReduction` = 2 | While Raging, reduce each incoming damage die by 2. |
| Rip and Tear | `barbarian-rip-and-tear` | `barbarianr8tc7cb` | — | `system.hasRipAndTear` = true | While Raging: +1 damage per damage die dealt. |
| Sneak Attack (1d4) | `rogue-sneak-attack-1d4` | `roguesneakgwndyd` | — | `system.sneakAttackDice` = 1 | Deal +1d4 damage on Favored weapon attacks. |
| Sneak Attack (2d4) | `rogue-sneak-attack-2d4` | `roguesneakgwo5om` | — | `system.sneakAttackDice` = 2 | Deal +2d4 damage on Favored weapon attacks. |
| Sneak Attack (3d4) | `rogue-sneak-attack-3d4` | `roguesneakgwoxev` | — | `system.sneakAttackDice` = 3 | Deal +3d4 damage on Favored weapon attacks. |
| Spellcaster | `perk-magical-secret-spellcaster` | `perkmagicaxabmm0` | — | `system.attributes.isSpellcaster` = true; `system.attributes.manaMultiplier` = 2 | Magical Secret perk: grants spellcasting ability with 2x mana multiplier. Requires choosing a casting stat. |
