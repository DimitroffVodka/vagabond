/**
 * Import Missing Compendium Entries (v3 - preserves IDs, keeps existing)
 *
 * Imports entries that DON'T already exist (by name) in the compendium.
 * Preserves original _id values so cross-references work.
 * Existing entries are left untouched (keeps mordachai's updates).
 */

const PACK_MAP = {
  'alchemical-items': 'vagabond.alchemical-items',
  'ancestries': 'vagabond.ancestries',
  'armor': 'vagabond.armor',
  'creation-notes': 'vagabond.creation-notes',
  'gear': 'vagabond.gear',
  'humanlike': 'vagabond.humanlike',
  'perks': 'vagabond.perks',
  'relics': 'vagabond.relics',
  'spells': 'vagabond.spells',
  'starting-packs': 'vagabond.starting-packs',
};

async function importMissing() {
  let totalImported = 0;
  let totalSkipped = 0;

  for (const [fileName, packId] of Object.entries(PACK_MAP)) {
    const pack = game.packs.get(packId);
    if (!pack) {
      console.warn(`Pack ${packId} not found, skipping.`);
      continue;
    }

    // Fetch the JSON file
    const url = `systems/vagabond/macros/import-data/compendium-${fileName}.json`;
    let importData;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Could not fetch ${url}: ${response.status}`);
        continue;
      }
      importData = await response.json();
    } catch (e) {
      console.warn(`Error fetching ${url}:`, e);
      continue;
    }

    if (importData.length === 0) {
      console.log(`${fileName}: empty export, skipping.`);
      continue;
    }

    // Get existing entries - match by both name AND _id
    const existing = await pack.getDocuments();
    const existingNames = new Set(existing.map(d => d.name));
    const existingIds = new Set(existing.map(d => d.id));

    // Filter to entries that don't exist by name
    const newEntries = importData.filter(entry => !existingNames.has(entry.name));

    if (newEntries.length === 0) {
      console.log(`${fileName}: all ${importData.length} entries already exist, skipping.`);
      totalSkipped += importData.length;
      continue;
    }

    // Clean entries - keep _id, remove _stats and ownership
    const cleaned = newEntries.map(entry => {
      const clone = foundry.utils.deepClone(entry);
      delete clone._stats;
      delete clone.ownership;
      // If the _id already exists in the pack (name mismatch but id collision), remove it
      if (existingIds.has(clone._id)) {
        delete clone._id;
      }
      return clone;
    });

    // Import in batches of 20
    const docCls = pack.documentClass;
    const batchSize = 20;
    let imported = 0;
    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
      await docCls.createDocuments(batch, { pack: packId, keepId: true });
      imported += batch.length;
      console.log(`  ${fileName}: imported ${imported}/${cleaned.length}`);
    }

    console.log(`${fileName}: imported ${imported} new entries (${existingNames.size} kept as-is)`);
    totalImported += imported;
    totalSkipped += existingNames.size;

    await new Promise(r => setTimeout(r, 300));
  }

  ui.notifications.info(`Import complete! ${totalImported} new entries imported, ${totalSkipped} existing entries kept.`);
  console.log(`=== IMPORT COMPLETE: ${totalImported} new, ${totalSkipped} kept ===`);
}

importMissing();
