/**
 * Loot Tables — TL-based default loot generation and RollTable integration.
 *
 * If an NPC has a lootTable UUID, that table is rolled.
 * Otherwise, a built-in TL-based table generates currency + random items.
 */

const SYSTEM_ID = 'vagabond';

// ── Built-in TL-based loot tiers ─────────────────────────────────────────────

const LOOT_TIERS = [
  {
    // TL 0-1: Trash mobs
    maxTL: 1,
    currency: { gold: '0', silver: '0', copper: '2d6' },
    itemChance: 10, // % chance to drop an item
    itemPool: [
      { name: 'Torch', img: 'icons/sundries/lights/torch-brown.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Adventuring Gear' } },
      { name: 'Rations', img: 'icons/consumables/food/bread-loaf-sliced-brown.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Adventuring Gear' } },
    ],
  },
  {
    // TL 2-3: Common enemies
    maxTL: 3,
    currency: { gold: '0', silver: '1d6', copper: '3d6' },
    itemChance: 25,
    itemPool: [
      { name: 'Torch', img: 'icons/sundries/lights/torch-brown.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Adventuring Gear' } },
      { name: 'Potion, Healing I', img: 'icons/consumables/potions/potion-bottle-corked-red.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Alchemy & Potions' } },
      { name: 'Rope (50ft)', img: 'icons/sundries/survival/rope-coiled-tan.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, gearCategory: 'Adventuring Gear' } },
    ],
  },
  {
    // TL 4-5: Tough enemies
    maxTL: 5,
    currency: { gold: '1d4', silver: '2d6', copper: '0' },
    itemChance: 40,
    itemPool: [
      { name: 'Potion, Healing I', img: 'icons/consumables/potions/potion-bottle-corked-red.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Alchemy & Potions' } },
      { name: 'Potion, Healing II', img: 'icons/consumables/potions/potion-bottle-corked-red.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Alchemy & Potions' } },
      { name: 'Antitoxin', img: 'icons/consumables/potions/potion-tube-corked-glowing-green.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Alchemy & Potions' } },
    ],
  },
  {
    // TL 6+: Boss-tier
    maxTL: Infinity,
    currency: { gold: '2d6', silver: '3d6', copper: '0' },
    itemChance: 60,
    itemPool: [
      { name: 'Potion, Healing II', img: 'icons/consumables/potions/potion-bottle-corked-red.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, gearCategory: 'Alchemy & Potions' } },
      { name: 'Oil, Basic', img: 'icons/consumables/potions/bottle-round-corked-yellow.webp', type: 'equipment', system: { equipmentType: 'gear', quantity: 1, baseSlots: 1, isConsumable: true, alchemicalType: 'oil', gearCategory: 'Alchemy & Potions' } },
    ],
  },
];

/**
 * Get the loot tier for a given Threat Level.
 */
function _getTier(tl) {
  for (const tier of LOOT_TIERS) {
    if (tl <= tier.maxTL) return tier;
  }
  return LOOT_TIERS[LOOT_TIERS.length - 1];
}

/**
 * Roll a dice formula and return the integer result.
 */
async function _rollFormula(formula) {
  if (!formula || formula === '0') return 0;
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

/**
 * Roll loot for a single player from a specific NPC.
 *
 * @param {Actor} npc - The defeated NPC actor
 * @param {string} playerId - The player's actor ID (for tagging)
 * @returns {Promise<{items: Object[], currency: {gold: number, silver: number, copper: number}}>}
 */
export async function rollLootForPlayer(npc, playerId) {
  const result = { items: [], currency: { gold: 0, silver: 0, copper: 0 } };

  // Check for custom RollTable on the NPC
  const tableUuid = npc.system?.lootTable;
  if (tableUuid) {
    return _rollFromTable(tableUuid, playerId);
  }

  // Use built-in TL-based generation
  const tl = npc.system?.threatLevel ?? 0;
  const tier = _getTier(tl);

  // Roll currency
  result.currency.gold = await _rollFormula(tier.currency.gold);
  result.currency.silver = await _rollFormula(tier.currency.silver);
  result.currency.copper = await _rollFormula(tier.currency.copper);

  // Roll for item drop
  const itemRoll = Math.ceil(Math.random() * 100);
  if (itemRoll <= tier.itemChance && tier.itemPool.length > 0) {
    const randomItem = tier.itemPool[Math.floor(Math.random() * tier.itemPool.length)];
    result.items.push(foundry.utils.deepClone(randomItem));
  }

  return result;
}

/**
 * Roll loot from a Foundry RollTable.
 */
async function _rollFromTable(tableUuid, playerId) {
  const result = { items: [], currency: { gold: 0, silver: 0, copper: 0 } };

  try {
    const table = await fromUuid(tableUuid);
    if (!table) {
      console.warn(`Vagabond | Loot table not found: ${tableUuid}`);
      return result;
    }

    const rollResult = await table.roll();
    // V13 returns { roll, results } — results is an array of TableResult documents
    const results = rollResult?.results ?? [];
    if (!results.length) {
      console.warn('Vagabond | Loot table roll returned no results');
      return result;
    }

    for (const tableResult of results) {
      const resultType = tableResult.type;
      const docUuid = tableResult.documentUuid ?? tableResult.documentId ?? null;

      console.log(`Vagabond | Loot table result:`, { type: resultType, name: tableResult.name, text: tableResult.text, docUuid });

      // Document or Compendium result — link to an Item
      if ((resultType === CONST.TABLE_RESULT_TYPES.DOCUMENT || resultType === CONST.TABLE_RESULT_TYPES.COMPENDIUM) && docUuid) {
        try {
          const item = await fromUuid(docUuid);
          if (item) {
            result.items.push(item.toObject());
          }
        } catch (e) {
          console.warn(`Vagabond | Failed to resolve loot item: ${docUuid}`, e);
        }
      }
      // Text result — try to parse as currency
      // Supports: "Coins (d100) silver", "d10 gold", "2d6 copper", "[[/r d100]] silver"
      else if (resultType === CONST.TABLE_RESULT_TYPES.TEXT) {
        // Check both text and name fields
        const text = (tableResult.text || tableResult.name || '').toLowerCase();
        const name = (tableResult.name || '').toLowerCase();
        const combined = `${name} ${text}`;

        // Match dice formulas: "d100", "2d6", "1d10", "10", etc.
        const dicePattern = /(\d*d\d+|\d+)/i;
        const goldMatch = combined.match(new RegExp(`(\\d*d\\d+|\\d+)\\s*(?:\\)\\s*)?gold`, 'i'));
        const silverMatch = combined.match(new RegExp(`(\\d*d\\d+|\\d+)\\s*(?:\\)\\s*)?silver`, 'i'));
        const copperMatch = combined.match(new RegExp(`(\\d*d\\d+|\\d+)\\s*(?:\\)\\s*)?copper`, 'i'));

        if (goldMatch) result.currency.gold += await _rollFormula(goldMatch[1]);
        if (silverMatch) result.currency.silver += await _rollFormula(silverMatch[1]);
        if (copperMatch) result.currency.copper += await _rollFormula(copperMatch[1]);
      }
    }
  } catch (err) {
    console.error('Vagabond | Error rolling loot table:', err);
  }

  console.log('Vagabond | Loot table final result:', JSON.stringify(result));
  return result;
}
