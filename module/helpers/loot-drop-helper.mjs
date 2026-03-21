/**
 * Loot Drop Helper — spawns loot bags after combat ends.
 *
 * Flow:
 * 1. Combat ends (deleteCombat hook)
 * 2. For each defeated NPC, roll d100 vs loot drop chance
 * 3. If passes: roll loot per player, create a Loot Bag token
 * 4. Players click the bag → see their personal items
 * 5. Take → item goes to inventory. Pass → visible to all players.
 * 6. Empty bag auto-deletes.
 */

import { rollLootForPlayer } from './loot-tables.mjs';

const SYSTEM_ID = 'vagabond';
const LOOT_BAG_FLAG = 'vbd-loot-bag';
const LOOT_BAG_IMG = 'icons/containers/chest/chest-reinforced-steel-cherry.webp';

// ── Folder management ────────────────────────────────────────────────────────

async function _getOrCreateLootFolder() {
  const folderName = 'Loot';
  let folder = game.folders.find(f => f.name === folderName && f.type === 'Actor');
  if (!folder) {
    folder = await Folder.create({
      name: folderName,
      type: 'Actor',
      color: '#DAA520',
      sorting: 'a',
    });
  }
  return folder;
}

// ── Loot bag creation ────────────────────────────────────────────────────────

/**
 * Create a loot bag actor + token on the canvas.
 *
 * @param {string} npcName - Name of the defeated NPC
 * @param {{x: number, y: number}} position - Canvas position for the bag
 * @param {Array} lootEntries - Array of { forPlayerId, forPlayerName, items, currency }
 * @param {Object} playerOwnership - Ownership map { [userId]: OWNER }
 */
async function _createLootBag(npcName, position, lootEntries, playerOwnership) {
  const folder = await _getOrCreateLootFolder();

  const snapX = Math.round(position.x / canvas.grid.size) * canvas.grid.size;
  const snapY = Math.round(position.y / canvas.grid.size) * canvas.grid.size;

  // Build the loot items array with player tagging
  const lootItems = [];
  const lootCurrency = [];

  for (const entry of lootEntries) {
    for (const itemData of entry.items) {
      lootItems.push({
        itemData,
        forPlayerId: entry.forPlayerId,
        forPlayerName: entry.forPlayerName,
        claimed: false,
      });
    }
    if (entry.currency.gold > 0 || entry.currency.silver > 0 || entry.currency.copper > 0) {
      lootCurrency.push({
        gold: entry.currency.gold,
        silver: entry.currency.silver,
        copper: entry.currency.copper,
        forPlayerId: entry.forPlayerId,
        forPlayerName: entry.forPlayerName,
        claimed: false,
      });
    }
  }

  // Skip if nothing to drop
  if (lootItems.length === 0 && lootCurrency.length === 0) return null;

  const bagActor = await Actor.create({
    name: `${npcName}'s Loot`,
    type: 'npc',
    img: LOOT_BAG_IMG,
    folder: folder.id,
    flags: {
      [SYSTEM_ID]: {
        [LOOT_BAG_FLAG]: true,
        lootItems,
        lootCurrency,
        sourceNpcName: npcName,
      },
    },
    prototypeToken: {
      name: `${npcName}'s Loot`,
      displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
      actorLink: true,
      width: 0.5,
      height: 0.5,
      texture: { src: LOOT_BAG_IMG, scaleX: 1, scaleY: 1 },
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    },
    ownership: {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
      ...playerOwnership,
    },
  });

  // Small delay to let canvas settle after combat token cleanup
  await new Promise(r => setTimeout(r, 500));

  try {
    const scene = canvas.scene ?? game.scenes.active;
    if (!scene) {
      console.error('Vagabond | Loot: no active scene for token placement');
      return bagActor;
    }
    const tokens = await scene.createEmbeddedDocuments('Token', [{
      actorId: bagActor.id,
      actorLink: true,
      x: snapX, y: snapY,
      width: 0.5, height: 0.5,
      name: `${npcName}'s Loot`,
      texture: { src: LOOT_BAG_IMG },
      hidden: false,
    }]);
    console.log(`Vagabond | Loot: token placed at (${snapX}, ${snapY}), token count: ${tokens.length}`);
  } catch (err) {
    console.error('Vagabond | Loot: failed to create token:', err);
  }

  return bagActor;
}

// ── Take / Pass actions ──────────────────────────────────────────────────────

/**
 * Take an item from the loot bag.
 */
async function _takeItem(bagActor, itemIndex, targetActor) {
  const lootItems = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootItems') ?? []);
  const entry = lootItems[itemIndex];
  if (!entry || entry.claimed) return;

  // Add to target inventory
  const newItemData = foundry.utils.deepClone(entry.itemData);
  delete newItemData._id;
  await targetActor.createEmbeddedDocuments('Item', [newItemData]);

  // Mark claimed
  entry.claimed = true;
  await bagActor.setFlag(SYSTEM_ID, 'lootItems', lootItems);

  // Check if bag is empty
  await _checkBagEmpty(bagActor);
}

/**
 * Take currency from the loot bag.
 */
async function _takeCurrency(bagActor, currencyIndex, targetActor) {
  const lootCurrency = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootCurrency') ?? []);
  const entry = lootCurrency[currencyIndex];
  if (!entry || entry.claimed) return;

  // Add to target actor's currency
  const currentCurrency = targetActor.system.currency ?? { gold: 0, silver: 0, copper: 0 };
  await targetActor.update({
    'system.currency.gold': currentCurrency.gold + (entry.gold || 0),
    'system.currency.silver': currentCurrency.silver + (entry.silver || 0),
    'system.currency.copper': currentCurrency.copper + (entry.copper || 0),
  });

  // Mark claimed
  entry.claimed = true;
  await bagActor.setFlag(SYSTEM_ID, 'lootCurrency', lootCurrency);

  await _checkBagEmpty(bagActor);
}

/**
 * Pass an item — remove the forPlayerId so all players can see it.
 */
async function _passItem(bagActor, itemIndex) {
  const lootItems = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootItems') ?? []);
  const entry = lootItems[itemIndex];
  if (!entry || entry.claimed) return;

  entry.forPlayerId = null;
  entry.forPlayerName = 'Anyone';
  await bagActor.setFlag(SYSTEM_ID, 'lootItems', lootItems);
}

/**
 * Pass currency — remove the forPlayerId so all players can see it.
 */
async function _passCurrency(bagActor, currencyIndex) {
  const lootCurrency = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootCurrency') ?? []);
  const entry = lootCurrency[currencyIndex];
  if (!entry || entry.claimed) return;

  entry.forPlayerId = null;
  entry.forPlayerName = 'Anyone';
  await bagActor.setFlag(SYSTEM_ID, 'lootCurrency', lootCurrency);
}

/**
 * Take all items and currency from the bag for a player.
 */
async function _takeAll(bagActor, targetActor) {
  const playerId = targetActor.id;
  const lootItems = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootItems') ?? []);
  const lootCurrency = foundry.utils.deepClone(bagActor.getFlag(SYSTEM_ID, 'lootCurrency') ?? []);

  // Take all visible items
  const itemsToCreate = [];
  for (const entry of lootItems) {
    if (entry.claimed) continue;
    if (entry.forPlayerId !== null && entry.forPlayerId !== playerId) continue;
    const newItemData = foundry.utils.deepClone(entry.itemData);
    delete newItemData._id;
    itemsToCreate.push(newItemData);
    entry.claimed = true;
  }
  if (itemsToCreate.length > 0) {
    await targetActor.createEmbeddedDocuments('Item', itemsToCreate);
  }

  // Take all visible currency
  let totalGold = 0, totalSilver = 0, totalCopper = 0;
  for (const entry of lootCurrency) {
    if (entry.claimed) continue;
    if (entry.forPlayerId !== null && entry.forPlayerId !== playerId) continue;
    totalGold += entry.gold || 0;
    totalSilver += entry.silver || 0;
    totalCopper += entry.copper || 0;
    entry.claimed = true;
  }
  if (totalGold > 0 || totalSilver > 0 || totalCopper > 0) {
    const currentCurrency = targetActor.system.currency ?? { gold: 0, silver: 0, copper: 0 };
    await targetActor.update({
      'system.currency.gold': currentCurrency.gold + totalGold,
      'system.currency.silver': currentCurrency.silver + totalSilver,
      'system.currency.copper': currentCurrency.copper + totalCopper,
    });
  }

  await bagActor.setFlag(SYSTEM_ID, 'lootItems', lootItems);
  await bagActor.setFlag(SYSTEM_ID, 'lootCurrency', lootCurrency);
  await _checkBagEmpty(bagActor);
}

/**
 * Check if the loot bag is completely empty and auto-delete if so.
 */
async function _checkBagEmpty(bagActor) {
  const items = bagActor.getFlag(SYSTEM_ID, 'lootItems') ?? [];
  const currency = bagActor.getFlag(SYSTEM_ID, 'lootCurrency') ?? [];

  const hasUnclaimed = items.some(i => !i.claimed) || currency.some(c => !c.claimed);
  if (!hasUnclaimed) {
    // Delete all tokens for this actor on the current scene
    const tokens = canvas.scene.tokens.filter(t => t.actorId === bagActor.id);
    for (const t of tokens) {
      await t.delete();
    }
    await bagActor.delete();
    ui.notifications.info('Loot bag empty — cleaned up.');
  }
}

// ── Loot Bag Dialog ──────────────────────────────────────────────────────────

async function _openLootBagDialog(bagActor) {
  const playerActor = game.user.isGM ? null : game.user.character;
  const playerId = playerActor?.id ?? null;

  const lootItems = bagActor.getFlag(SYSTEM_ID, 'lootItems') ?? [];
  const lootCurrency = bagActor.getFlag(SYSTEM_ID, 'lootCurrency') ?? [];
  const npcName = bagActor.getFlag(SYSTEM_ID, 'sourceNpcName') ?? 'Unknown';

  // Filter to items this player can see
  const visibleItems = lootItems.map((entry, idx) => ({ ...entry, idx }))
    .filter(e => !e.claimed && (e.forPlayerId === null || e.forPlayerId === playerId || game.user.isGM));
  const visibleCurrency = lootCurrency.map((entry, idx) => ({ ...entry, idx }))
    .filter(e => !e.claimed && (e.forPlayerId === null || e.forPlayerId === playerId || game.user.isGM));

  if (visibleItems.length === 0 && visibleCurrency.length === 0) {
    ui.notifications.info('No loot available for you in this bag.');
    return;
  }

  // Build dialog HTML
  let html = `<div class="vagabond-loot-bag" style="font-family: 'Germania', serif;">`;
  html += `<h3 style="margin:0 0 8px; color:#DAA520;"><i class="fas fa-treasure-chest"></i> ${npcName}'s Loot</h3>`;

  // Currency
  for (const c of visibleCurrency) {
    const parts = [];
    if (c.gold > 0) parts.push(`<i class="fas fa-coins" style="color:#DAA520;"></i> ${c.gold}g`);
    if (c.silver > 0) parts.push(`<i class="fas fa-coins" style="color:#C0C0C0;"></i> ${c.silver}s`);
    if (c.copper > 0) parts.push(`<i class="fas fa-coins" style="color:#B87333;"></i> ${c.copper}c`);
    const forLabel = c.forPlayerId ? '' : ' <span style="color:#aaa; font-size:11px;">(passed)</span>';
    html += `<div class="loot-row" style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(197,164,114,0.2);">
      <span style="flex:1;">${parts.join(' ')}${forLabel}</span>
      <button class="loot-take-currency" data-idx="${c.idx}" style="cursor:pointer; padding:2px 8px;">Take</button>
      ${c.forPlayerId ? `<button class="loot-pass-currency" data-idx="${c.idx}" style="cursor:pointer; padding:2px 8px;">Pass</button>` : ''}
    </div>`;
  }

  // Items
  for (const item of visibleItems) {
    const forLabel = item.forPlayerId ? '' : ' <span style="color:#aaa; font-size:11px;">(passed)</span>';
    html += `<div class="loot-row" style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(197,164,114,0.2);">
      <img src="${item.itemData.img}" width="28" height="28" style="border:none; flex-shrink:0;" />
      <span style="flex:1;">${item.itemData.name}${forLabel}</span>
      <button class="loot-take-item" data-idx="${item.idx}" style="cursor:pointer; padding:2px 8px;">Take</button>
      ${item.forPlayerId ? `<button class="loot-pass-item" data-idx="${item.idx}" style="cursor:pointer; padding:2px 8px;">Pass</button>` : ''}
    </div>`;
  }

  html += `</div>`;

  // Helper to handle take/pass actions
  async function _handleLootAction(actionType, idx) {
    const target = game.user.isGM ? await _gmPickTarget() : game.user.character;
    if (actionType === 'takeItem') {
      if (!target) return;
      if (game.user.isGM) await _takeItem(bagActor, idx, target);
      else game.socket.emit(`system.${SYSTEM_ID}`, { action: 'lootTakeItem', bagActorId: bagActor.id, itemIndex: idx, targetActorId: target.id });
    } else if (actionType === 'passItem') {
      if (game.user.isGM) await _passItem(bagActor, idx);
      else game.socket.emit(`system.${SYSTEM_ID}`, { action: 'lootPassItem', bagActorId: bagActor.id, itemIndex: idx });
    } else if (actionType === 'takeCurrency') {
      if (!target) return;
      if (game.user.isGM) await _takeCurrency(bagActor, idx, target);
      else game.socket.emit(`system.${SYSTEM_ID}`, { action: 'lootTakeCurrency', bagActorId: bagActor.id, currencyIndex: idx, targetActorId: target.id });
    } else if (actionType === 'passCurrency') {
      if (game.user.isGM) await _passCurrency(bagActor, idx);
      else game.socket.emit(`system.${SYSTEM_ID}`, { action: 'lootPassCurrency', bagActorId: bagActor.id, currencyIndex: idx });
    } else if (actionType === 'takeAll') {
      if (!target) return;
      if (game.user.isGM) await _takeAll(bagActor, target);
      else game.socket.emit(`system.${SYSTEM_ID}`, { action: 'lootTakeAll', bagActorId: bagActor.id, targetActorId: target.id });
    }
  }

  // Add Take All button to the HTML
  html += `<div style="margin-top:8px; display:flex; gap:6px;">
    <button class="loot-take-all" style="flex:1; cursor:pointer; padding:4px 8px;"><i class="fas fa-hand-holding"></i> Take All</button>
    <button class="loot-close" style="flex:1; cursor:pointer; padding:4px 8px;"><i class="fas fa-times"></i> Close</button>
  </div>`;

  // Create a simple popup div instead of DialogV2 to avoid render callback issues
  const overlay = document.createElement('div');
  overlay.className = 'vagabond-loot-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:center; justify-content:center;';

  const popup = document.createElement('div');
  popup.className = 'vagabond-loot-popup';
  popup.style.cssText = 'background:var(--vagabond-c-surface, #1a1a2e); border:2px solid #DAA520; border-radius:8px; padding:16px; max-width:400px; min-width:300px; max-height:80vh; overflow-y:auto; color:#e0d6c8; box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  popup.innerHTML = html;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  function closePopup() {
    overlay.remove();
  }

  // Close on overlay click (not popup)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup();
  });

  // Close button
  popup.querySelector('.loot-close')?.addEventListener('click', closePopup);

  // Take All
  popup.querySelector('.loot-take-all')?.addEventListener('click', async () => {
    closePopup();
    await _handleLootAction('takeAll', 0);
  });

  // Take item buttons
  popup.querySelectorAll('.loot-take-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      closePopup();
      await _handleLootAction('takeItem', parseInt(btn.dataset.idx));
    });
  });

  // Pass item buttons
  popup.querySelectorAll('.loot-pass-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      closePopup();
      await _handleLootAction('passItem', parseInt(btn.dataset.idx));
    });
  });

  // Take currency buttons
  popup.querySelectorAll('.loot-take-currency').forEach(btn => {
    btn.addEventListener('click', async () => {
      closePopup();
      await _handleLootAction('takeCurrency', parseInt(btn.dataset.idx));
    });
  });

  // Pass currency buttons
  popup.querySelectorAll('.loot-pass-currency').forEach(btn => {
    btn.addEventListener('click', async () => {
      closePopup();
      await _handleLootAction('passCurrency', parseInt(btn.dataset.idx));
    });
  });
}

/**
 * GM helper — pick which character gets the loot.
 */
async function _gmPickTarget() {
  const playerActors = game.actors.filter(a => a.hasPlayerOwner || a.type === 'character');
  const options = playerActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const actorId = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Assign Loot To' },
    content: `<p>Which character gets this loot?</p><select name="actor" style="width:100%">${options}</select>`,
    ok: { callback: (_event, button) => button.form.elements.actor?.value },
    rejectClose: false,
  });
  if (!actorId) return null;
  return game.actors.get(actorId);
}

// ── Main export ──────────────────────────────────────────────────────────────

export const LootDropHelper = {

  init() {
    // TokenHUD: "Open Loot" button on loot bag tokens
    Hooks.on('renderTokenHUD', (hud, html, _data) => {
      const token = hud.object;
      const actor = token.actor;
      if (!actor?.getFlag(SYSTEM_ID, LOOT_BAG_FLAG)) return;

      const root = html instanceof HTMLElement ? html : html[0];
      const btn = document.createElement('div');
      btn.className = 'control-icon vbd-loot-btn';
      btn.title = 'Open Loot Bag';
      btn.innerHTML = '<i class="fas fa-sack"></i>';
      (root.querySelector('.col.right') ?? root).prepend(btn);

      btn.addEventListener('click', () => {
        hud.close();
        _openLootBagDialog(actor);
      });
    });

    // Intercept sheet rendering for loot bag actors — open loot dialog instead
    for (const hookName of ['renderActorSheet', 'renderVagabondNPCSheet', 'renderVagabondActorSheet', 'renderApplicationV2']) {
      Hooks.on(hookName, (app, html, data) => {
        const actor = app.actor ?? app.document;
        if (!actor?.getFlag(SYSTEM_ID, LOOT_BAG_FLAG)) return;
        app.close();
        _openLootBagDialog(actor);
      });
    }

    // Hook: capture combat data BEFORE deletion (combatants are still available)
    this._pendingLootData = null;
    Hooks.on('preDeleteCombat', (combat, _options, _userId) => {
      if (!game.user.isGM) return;
      if (!game.settings.get(SYSTEM_ID, 'lootDropEnabled')) return;

      console.log('Vagabond | Loot: preDeleteCombat — capturing combatant data');

      // Collect defeated NPCs
      const defeated = [];
      for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor || actor.type !== 'npc') continue;

        const hp = actor.system.health ?? actor.system.hp;
        const isDefeated = combatant.defeated || (hp && hp.value <= 0);
        if (!isDefeated) continue;

        const token = combatant.token;
        const position = token ? { x: token.x, y: token.y } : { x: 0, y: 0 };
        defeated.push({ actor, position });
      }

      // Collect player characters
      const playerActors = [];
      const playerOwnership = {};
      for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor || actor.type !== 'character') continue;
        playerActors.push(actor);
        const ownerUser = game.users.find(u => !u.isGM && actor.testUserPermission(u, 'OWNER'));
        if (ownerUser) {
          playerOwnership[ownerUser.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        }
      }

      // Fallback: all player-owned characters
      if (playerActors.length === 0) {
        for (const actor of game.actors.filter(a => a.type === 'character' && a.hasPlayerOwner)) {
          playerActors.push(actor);
          const ownerUser = game.users.find(u => !u.isGM && actor.testUserPermission(u, 'OWNER'));
          if (ownerUser) {
            playerOwnership[ownerUser.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
          }
        }
      }

      // GM ownership
      for (const u of game.users.filter(u => u.isGM)) {
        playerOwnership[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }

      this._pendingLootData = { defeated, playerActors, playerOwnership };
    });

    // Hook: combat deleted → spawn loot from captured data
    Hooks.on('deleteCombat', async (_combat, _options, _userId) => {
      if (!game.user.isGM) return;
      const data = this._pendingLootData;
      this._pendingLootData = null;
      if (!data || data.defeated.length === 0 || data.playerActors.length === 0) return;

      console.log(`Vagabond | Loot: processing ${data.defeated.length} defeated NPCs for ${data.playerActors.length} players`);

      let bagsCreated = 0;
      for (const { actor: npc, position } of data.defeated) {
        const npcChance = npc.system.lootDropChance ?? -1;
        const globalChance = game.settings.get(SYSTEM_ID, 'lootDropChance');
        const dropChance = npcChance >= 0 ? npcChance : globalChance;

        const roll = Math.ceil(Math.random() * 100);
        console.log(`Vagabond | Loot: ${npc.name} drop chance ${dropChance}%, rolled ${roll}`);
        if (roll > dropChance) continue;

        const lootEntries = [];
        for (const playerActor of data.playerActors) {
          const loot = await rollLootForPlayer(npc, playerActor.id);
          console.log(`Vagabond | Loot: rolled for ${playerActor.name}:`, JSON.stringify(loot));
          lootEntries.push({
            forPlayerId: playerActor.id,
            forPlayerName: playerActor.name,
            items: loot.items,
            currency: loot.currency,
          });
        }

        console.log(`Vagabond | Loot: creating bag at`, position, 'entries:', lootEntries.length);
        try {
          const bag = await _createLootBag(npc.name, position, lootEntries, data.playerOwnership);
          console.log(`Vagabond | Loot: bag created:`, bag?.name ?? 'null');
          if (bag) bagsCreated++;
        } catch (err) {
          console.error('Vagabond | Loot: bag creation failed:', err);
        }
      }

      if (bagsCreated > 0) {
        ui.notifications.info(`${bagsCreated} loot bag${bagsCreated > 1 ? 's' : ''} dropped!`);
      }
    });
  },

  registerSocketListeners() {
    game.socket?.on(`system.${SYSTEM_ID}`, async data => {
      if (!game.user.isGM) return;

      if (data.action === 'lootTakeItem') {
        const bag = game.actors.get(data.bagActorId);
        const target = game.actors.get(data.targetActorId);
        if (bag && target) await _takeItem(bag, data.itemIndex, target);
      }
      else if (data.action === 'lootTakeCurrency') {
        const bag = game.actors.get(data.bagActorId);
        const target = game.actors.get(data.targetActorId);
        if (bag && target) await _takeCurrency(bag, data.currencyIndex, target);
      }
      else if (data.action === 'lootPassItem') {
        const bag = game.actors.get(data.bagActorId);
        if (bag) await _passItem(bag, data.itemIndex);
      }
      else if (data.action === 'lootPassCurrency') {
        const bag = game.actors.get(data.bagActorId);
        if (bag) await _passCurrency(bag, data.currencyIndex);
      }
      else if (data.action === 'lootTakeAll') {
        const bag = game.actors.get(data.bagActorId);
        const target = game.actors.get(data.targetActorId);
        if (bag && target) await _takeAll(bag, target);
      }
    });
  },
};
