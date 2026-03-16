/**
 * Run this in Foundry's browser console (F12) to update weapon damage types
 * in the compendium from the _source JSON files.
 *
 * Usage: Copy-paste into browser console, or run:
 *   import('/systems/vagabond/scripts/update-weapon-damage-types.mjs')
 */

const DAMAGE_TYPES = {
  'Arbalest': 'piercing',
  'Battleaxe': 'slashing',
  'Bottle, glass': 'blunt',
  'Buckler': 'blunt',
  'Caestus': 'blunt',
  'Club': 'blunt',
  'Crossbow': 'piercing',
  'Crossbow, light': 'piercing',
  'Dagger': 'piercing',
  'Dagger (Finesse)': 'piercing',
  'Dagger (Thrown)': 'piercing',
  'Flail': 'blunt',
  'Gauntlet': 'blunt',
  'Greataxe': 'slashing',
  'Greatclub': 'blunt',
  'Greatshield': 'blunt',
  'Greatsword': 'slashing',
  'Handaxe': 'slashing',
  'Handaxe (Thrown)': 'slashing',
  'Handgun': 'piercing',
  'Javelin': 'piercing',
  'Javelin (Thrown)': 'piercing',
  'Katar': 'piercing',
  'Lance': 'piercing',
  'Light hammer': 'blunt',
  'Light hammer (Thrown)': 'blunt',
  'Longbow': 'piercing',
  'Longsword': 'slashing',
  'Lucerne': 'piercing',
  'Mace': 'blunt',
  'Morningstar': 'blunt',
  'Pike': 'piercing',
  'Poleblade': 'slashing',
  'Rifle': 'piercing',
  'Shortbow': 'piercing',
  'Shortsword': 'slashing',
  'Shotgun': 'piercing',
  'Shotgun, sawed-off': 'piercing',
  'Sling': 'blunt',
  'Spear': 'piercing',
  'Spear (Thrown)': 'piercing',
  'Staff': 'blunt',
  'Standard shield': 'blunt',
  'Unarmed': 'blunt',
  'Warhammer': 'blunt',
  'Whip, chain': 'slashing',
  'Whip, leather': 'slashing'
};

// Find the weapons compendium pack
const pack = game.packs.find(p => p.metadata.name === 'weapons' || p.metadata.label?.includes('Weapon'));
if (!pack) {
  ui.notifications.error('Could not find weapons compendium pack!');
  throw new Error('Weapons pack not found');
}

console.log(`Found pack: ${pack.metadata.label} (${pack.metadata.name})`);

// Unlock if needed
const wasLocked = pack.locked;
if (wasLocked) await pack.configure({ locked: false });

const documents = await pack.getDocuments();
let updated = 0;
let skipped = 0;

for (const item of documents) {
  if (item.type !== 'equipment' || !item.system?.equipmentType?.includes('weapon')) {
    // Also check by name match as fallback
    if (!DAMAGE_TYPES[item.name]) {
      skipped++;
      continue;
    }
  }

  const newType = DAMAGE_TYPES[item.name];
  if (!newType) {
    console.log(`  Skip: ${item.name} (no mapping)`);
    skipped++;
    continue;
  }

  const currentType = item.system.damageType;
  if (currentType !== newType) {
    await item.update({ 'system.damageType': newType });
    console.log(`  Updated: ${item.name} (${currentType} -> ${newType})`);
    updated++;
  } else {
    console.log(`  Already correct: ${item.name} (${currentType})`);
  }
}

// Re-lock if it was locked
if (wasLocked) await pack.configure({ locked: true });

const msg = `Weapon damage types updated: ${updated} changed, ${skipped} skipped`;
console.log(msg);
ui.notifications.info(msg);
