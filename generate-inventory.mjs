// Generate a human-readable markdown inventory of every effect in
// packs/_source/effects/, organized by compendium folder. Useful for
// presenting the compendium to reviewers / maintainers without making them
// install Foundry or parse the JSON dump.
//
// Usage: node generate-inventory.mjs

import fs from 'fs';
import path from 'path';

const root = 'packs/_source/effects';
const folders = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory());

const byCategory = {};
for (const folder of folders) {
  const folderJson = path.join(root, folder, '_Folder.json');
  let folderName = folder;
  let category = '';
  if (fs.existsSync(folderJson)) {
    const f = JSON.parse(fs.readFileSync(folderJson, 'utf8'));
    folderName = f.name;
    category = f.flags?.vagabond?.category || '';
  }

  const files = fs.readdirSync(path.join(root, folder))
    .filter(f => f.endsWith('.json') && f !== '_Folder.json');

  const entries = [];
  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(root, folder, file), 'utf8'));
    const changes = doc.system?.changes ?? [];
    const changeSummary = changes.map(c => {
      const sym = c.type === 'override' ? '=' : c.type === 'add' ? '+' : c.type === 'multiply' ? '×' : c.type;
      return '`' + c.key + '` ' + sym + ' ' + c.value;
    }).join('; ');
    entries.push({
      name: doc.name,
      id: doc._id,
      canonicalId: doc.flags?.vagabond?.canonicalId || '',
      statuses: (doc.statuses ?? []).join(', '),
      changes: changeSummary || '_(no mechanical changes)_',
      description: (doc.description || '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim(),
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  byCategory[folderName] = { category, entries };
}

const totalEntries = Object.values(byCategory).reduce((s, c) => s + c.entries.length, 0);
const lines = [];
lines.push('# Vagabond Effects Compendium — Inventory');
lines.push('');
lines.push('Generated from `packs/_source/effects/` on branch `v14-effects-compendium`. ');
lines.push(`**${totalEntries} effects across ${Object.keys(byCategory).length} folders.** Each entry below is a V14 primary ActiveEffect document; modules can reference any of them as \`Compendium.vagabond.effects.ActiveEffect.<id>\`.`);
lines.push('');
lines.push('Each row shows: human name, canonical-slug flag (\`flags.vagabond.canonicalId\`), the stable 16-char Foundry ID, status-icon links, the mechanical changes the effect applies to actor data, and the in-system description.');
lines.push('');
lines.push('---');

const folderOrder = ['⚡ Status Conditions', '🟢 Buffs & Bonuses', '🔴 Debuffs & Penalties', '⚔️ Weapon Enhancements', '🛡️ Armor Properties', '💎 Material Bonuses', '✨ Relic Powers', '📘 Class Features', '📦 Miscellaneous'];

for (const folderName of folderOrder) {
  const cat = byCategory[folderName];
  if (!cat) continue;
  lines.push('');
  lines.push(`## ${folderName} — ${cat.entries.length} entries`);
  lines.push('');
  lines.push('| Name | Canonical ID | Stable `_id` | Statuses | Mechanics | Description |');
  lines.push('|---|---|---|---|---|---|');
  for (const e of cat.entries) {
    const cells = [
      e.name,
      '`' + e.canonicalId + '`',
      '`' + e.id + '`',
      e.statuses || '—',
      e.changes,
      e.description || '—',
    ].map(s => String(s).replace(/\|/g, '\\|'));
    lines.push('| ' + cells.join(' | ') + ' |');
  }
}

const out = lines.join('\n') + '\n';
fs.writeFileSync('effects-inventory.md', out, 'utf8');
console.log(`Wrote effects-inventory.md (${out.length} bytes, ${totalEntries} entries)`);
