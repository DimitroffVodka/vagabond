/**
 * Generic Item Drop Helper — lets players drag items from inventory onto the canvas.
 * Creates a small "dropped item" token that any player can pick up.
 * Uses socket relay so players (who can't create actors/tokens) work seamlessly.
 *
 * Light sources are handled by light-tracker.mjs and excluded here.
 */

const SYSTEM_ID = 'vagabond';
const DROP_ACTOR_FLAG = 'vbd-dropped-item';

/**
 * Create a dropped-item token on the canvas.
 * GM-only — players call this via socket relay.
 */
async function _dropItemOnCanvas(itemData, sourceActorId, dropX, dropY) {
  // Snap to grid
  const snapX = Math.round(dropX / canvas.grid.size) * canvas.grid.size;
  const snapY = Math.round(dropY / canvas.grid.size) * canvas.grid.size;

  const droppedActor = await Actor.create({
    name: `${itemData.name} (dropped)`,
    type: 'npc',
    img: itemData.img,
    flags: {
      [SYSTEM_ID]: {
        [DROP_ACTOR_FLAG]: true,
        droppedItemData: itemData,
        sourceActorId,
      },
    },
    prototypeToken: {
      name: itemData.name,
      displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
      actorLink: true,
      width: 0.5,
      height: 0.5,
      texture: { src: itemData.img, scaleX: 1, scaleY: 1 },
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    },
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
  });

  await canvas.scene.createEmbeddedDocuments('Token', [{
    actorId: droppedActor.id,
    actorLink: true,
    x: snapX, y: snapY,
    width: 0.5, height: 0.5,
    name: itemData.name,
    texture: { src: itemData.img },
    hidden: false,
  }]);

  return droppedActor;
}

/**
 * Pick up a dropped item — transfer it to the target actor's inventory.
 * GM-only — players call via socket.
 */
async function _doPickupItem(droppedActor, tokenDoc, targetActor) {
  const itemData = droppedActor.getFlag(SYSTEM_ID, 'droppedItemData');
  if (!itemData) return;

  // Clean up the item data for creation
  const newItemData = foundry.utils.deepClone(itemData);
  delete newItemData._id;
  delete newItemData.flags?.[SYSTEM_ID]?.lit;
  delete newItemData.flags?.[SYSTEM_ID]?.remainingSecs;
  delete newItemData.flags?.[SYSTEM_ID]?.sourceKey;

  // Add to target actor's inventory
  await targetActor.createEmbeddedDocuments('Item', [newItemData]);

  // Clean up the dropped token and actor
  await tokenDoc.delete();
  await droppedActor.delete();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: `<div style="display:flex;align-items:center;gap:8px">
      <img src="${itemData.img}" width="24" height="24" style="border:none;" />
      <span><strong>${targetActor.name}</strong> picked up <strong>${itemData.name}</strong>.</span>
    </div>`,
  });
}

/**
 * Check if an item is a light source (handled by light-tracker instead).
 */
function _isLightSource(name) {
  return /^(torch|lantern|candle|oil lamp)$/i.test(name.trim());
}

export const ItemDropHelper = {
  init() {
    // ── TokenHUD: "Pick Up" button on dropped item tokens ──
    Hooks.on('renderTokenHUD', (hud, html, _data) => {
      const token = hud.object;
      const actor = token.actor;
      if (!actor?.getFlag(SYSTEM_ID, DROP_ACTOR_FLAG)) return;

      const root = html instanceof HTMLElement ? html : html[0];
      const btn = document.createElement('div');
      btn.className = 'control-icon vbd-pickup-btn';
      btn.title = `Pick up ${actor.getFlag(SYSTEM_ID, 'droppedItemData')?.name ?? 'item'}`;
      btn.innerHTML = '<i class="fas fa-hand-holding-hand"></i>';
      (root.querySelector('.col.right') ?? root).prepend(btn);

      btn.addEventListener('click', async () => {
        hud.close();

        let targetActor;
        if (game.user.isGM) {
          // GM picks which character gets the item
          const playerActors = game.actors.filter(a => a.hasPlayerOwner || a.type === 'character');
          const options = playerActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
          const actorId = await foundry.applications.api.DialogV2.prompt({
            window: { title: 'Pick Up Item' },
            content: `<p>Assign to which character?</p><select name="actor" style="width:100%">${options}</select>`,
            ok: { callback: (_event, button) => button.form.elements.actor?.value },
            rejectClose: false,
          });
          if (!actorId) return;
          targetActor = game.actors.get(actorId);
        } else {
          targetActor = game.user.character;
          if (!targetActor) {
            ui.notifications.warn('You have no assigned character to pick this up.');
            return;
          }
        }

        if (game.user.isGM) {
          await _doPickupItem(actor, token.document, targetActor);
        } else {
          game.socket.emit(`system.${SYSTEM_ID}`, {
            action: 'pickupItem',
            droppedActorId: actor.id,
            tokenId: token.document.id,
            targetActorId: targetActor.id,
          });
        }
      });
    });

    // ── Canvas drop listener for players ──
    if (!game.user.isGM) {
      const _attachDropListener = () => {
        const board = document.getElementById('board');
        if (!board || board.dataset.vbdDropBound) return;
        board.dataset.vbdDropBound = '1';

        board.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }, true);

        board.addEventListener('drop', async (e) => {
          let data;
          try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
          if (data?.type !== 'Item') return;

          let item;
          try { item = await fromUuid(data.uuid); } catch { return; }
          if (!item || !item.parent) return;

          // Skip light sources — handled by light-tracker
          if (_isLightSource(item.name)) return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const t = canvas.stage.worldTransform;
          const canvasPos = {
            x: (e.clientX - t.tx) / t.a,
            y: (e.clientY - t.ty) / t.d,
          };

          game.socket.emit(`system.${SYSTEM_ID}`, {
            action: 'dropItem',
            itemData: item.toObject(),
            sourceActorId: item.parent.id,
            itemUuid: data.uuid,
            x: canvasPos.x,
            y: canvasPos.y,
          });
          ui.notifications.info(`Dropping ${item.name} on the ground...`);
        }, true);
      };
      _attachDropListener();
      Hooks.on('canvasReady', _attachDropListener);
    }

    // ── GM: dropCanvasData hook for direct drops ──
    Hooks.on('dropCanvasData', async (_canvasObj, data) => {
      if (data.type !== 'Item') return;
      if (!game.user.isGM) return;

      let item;
      try { item = await fromUuid(data.uuid); } catch { return; }
      if (!item || !item.parent) return;

      // Skip light sources — handled by light-tracker
      if (_isLightSource(item.name)) return;

      const itemData = item.toObject();
      const sourceActorId = item.parent.id;

      await _dropItemOnCanvas(itemData, sourceActorId, data.x, data.y);

      // Remove item from source actor
      await item.delete();

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: item.parent }),
        content: `<div style="display:flex;align-items:center;gap:8px">
          <img src="${itemData.img}" width="24" height="24" style="border:none;" />
          <span><strong>${item.parent.name}</strong> dropped <strong>${itemData.name}</strong>.</span>
        </div>`,
      });

      return false;
    });
  },

  /** Register socket listeners — called from vagabond.mjs */
  registerSocketListeners() {
    game.socket?.on(`system.${SYSTEM_ID}`, async data => {
      if (!game.user.isGM) return;

      if (data.action === 'dropItem') {
        const sourceActor = game.actors.get(data.sourceActorId);
        await _dropItemOnCanvas(data.itemData, data.sourceActorId, data.x, data.y);

        // Remove item from source actor via UUID
        const item = await fromUuid(data.itemUuid).catch(() => null);
        if (item) {
          const parentActor = item.parent;
          await item.delete();
          if (parentActor) {
            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: parentActor }),
              content: `<div style="display:flex;align-items:center;gap:8px">
                <img src="${data.itemData.img}" width="24" height="24" style="border:none;" />
                <span><strong>${parentActor.name}</strong> dropped <strong>${data.itemData.name}</strong>.</span>
              </div>`,
            });
          }
        }
      } else if (data.action === 'pickupItem') {
        const droppedActor = game.actors.get(data.droppedActorId);
        const tokenDoc = canvas.tokens?.get(data.tokenId)?.document
          ?? canvas.scene?.tokens?.get(data.tokenId);
        const targetActor = game.actors.get(data.targetActorId);
        if (droppedActor && tokenDoc && targetActor) {
          await _doPickupItem(droppedActor, tokenDoc, targetActor);
        }
      }
    });
  },
};
