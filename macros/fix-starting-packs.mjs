/**
 * Fix Starting Packs - delete all and reimport from TestFoundyV13 export
 */
async function fixStartingPacks() {
  const packId = 'vagabond.starting-packs';
  const pack = game.packs.get(packId);
  if (!pack) { ui.notifications.error('Starting packs compendium not found'); return; }

  // Delete all existing
  const existing = await pack.getDocuments();
  if (existing.length > 0) {
    await pack.documentClass.deleteDocuments(existing.map(d => d.id), { pack: packId });
    console.log(`Deleted ${existing.length} existing starting packs`);
  }

  // Fetch the full export
  const response = await fetch('systems/vagabond/macros/import-data/compendium-starting-packs.json');
  const importData = await response.json();

  // Clean and import with original IDs
  const cleaned = importData.map(entry => {
    const clone = foundry.utils.deepClone(entry);
    delete clone._stats;
    delete clone.ownership;
    return clone;
  });

  await pack.documentClass.createDocuments(cleaned, { pack: packId, keepId: true });
  ui.notifications.info(`Imported ${cleaned.length} starting packs with original IDs`);
  console.log(`Starting packs: imported ${cleaned.length} entries`);
}

fixStartingPacks();
