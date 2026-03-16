/**
 * Vagabond — Light Tracker
 *
 * Architecture:
 * - updateWorldTime hook is single source of truth for burn deduction
 * - Real-time: setInterval accumulates seconds locally, flushes to game.time every 20s
 * - Light state on items: lit, remainingSecs, sourceKey (flags)
 * - Dropped lights: temporary Actor on canvas with VLT_LIGHT_ACTOR flag
 * - Pick up dropped light via Token HUD button
 * - Toggle from inventory right-click context menu
 *
 * Ported from the vagabond-crawler module's light-tracker.mjs.
 */

const SYSTEM_ID = 'vagabond';

const TIME_PASSES_DEFAULT_MINS = 10;

const LIGHT_SOURCES = {
  torch: {
    match:         name => /^torch$/i.test(name.trim()),
    longevitySecs: 3600,
    consumable:    true,
    bright: 15, dim: 30,
    color: "#ff9900", colorIntensity: 0.4,
    animation: { type: "torch", speed: 5, intensity: 5 },
  },
  "lantern-hooded": {
    match:         name => /^lantern,?\s*hooded$/i.test(name.trim()),
    longevitySecs: 3600,
    consumable:    false,
    bright: 15, dim: 30,
    color: "#ffbb44", colorIntensity: 0.3,
    animation: { type: "torch", speed: 2, intensity: 3 },
  },
  "lantern-bullseye": {
    match:         name => /^lantern,?\s*bullseye$/i.test(name.trim()),
    longevitySecs: 3600,
    consumable:    false,
    bright: 15, dim: 30,
    color: "#ffdd88", colorIntensity: 0.25,
    animation: { type: "torch", speed: 2, intensity: 2 },
  },
  candle: {
    match:         name => /^candle$/i.test(name.trim()),
    longevitySecs: 3600,
    consumable:    true,
    bright: 5, dim: 10,
    color: "#ffcc44", colorIntensity: 0.5,
    animation: { type: "torch", speed: 3, intensity: 3 },
  },
};

const VLT_LIGHT_ACTOR_FLAG = "vlt-light-actor";

const DARK_LIGHT = { bright: 0, dim: 0, color: "#000000", alpha: 0, animation: { type: "none" } };

function _getLightDef(itemName) {
  for (const [key, def] of Object.entries(LIGHT_SOURCES)) {
    if (def.match(itemName)) return { key, def };
  }
  return null;
}

function _isLightSource(item) { return !!_getLightDef(item.name); }

function _lightConfig(def) {
  return {
    bright: def.bright, dim: def.dim,
    color: def.color, alpha: def.colorIntensity,
    animation: def.animation,
    luminosity: 0.5, attenuation: 0.5,
    angle: 360, shadows: 0,
    darkness: { min: 0, max: 1 },
  };
}

// Only scan player actors and dropped-light actors -- skip hundreds of NPCs
function _getActiveActors() {
  return game.actors.filter(a =>
    a.hasPlayerOwner || a.getFlag(SYSTEM_ID, VLT_LIGHT_ACTOR_FLAG)
  );
}

// -- Context menu injection ---------------------------------------------------

function _injectContextEntry(card, item) {
  card.addEventListener("contextmenu", () => {
    let attempts = 0;
    const poll = setInterval(() => {
      const menu = document.querySelector(".inventory-context-menu");
      if (menu) {
        clearInterval(poll);
        if (menu.querySelector(".vlt-ctx-item")) return;
        const isLit = !!item.getFlag(SYSTEM_ID, "lit");
        const secs  = item.getFlag(SYSTEM_ID, "remainingSecs") ?? 0;
        const li = document.createElement("li");
        li.className = "vlt-ctx-item";
        li.innerHTML = `<i class="fas fa-${isLit ? "wind" : "fire"}"></i> ${isLit ? `Extinguish (${LightTracker._formatTime(secs)} left)` : "Light"}`;
        li.addEventListener("click", async ev => {
          ev.stopPropagation();
          menu.remove();
          await LightTracker._toggleLight(item);
        });
        menu.insertBefore(li, menu.firstChild);
      } else if (++attempts >= 10) {
        clearInterval(poll);
      }
    }, 10);
  });
}

const _sheetObservers = new WeakMap();

function _attachToSheet(root, actor) {
  const cards = root.querySelectorAll(".inventory-card[data-item-id]");
  for (const card of cards) {
    if (card.dataset.vltBound) continue;
    const item = actor?.items?.get(card.dataset.itemId);
    if (!item || !_isLightSource(item)) continue;
    card.dataset.vltBound = "1";
    _injectContextEntry(card, item);
  }
}

function _watchSheet(root, actor) {
  _sheetObservers.get(root)?.disconnect();
  _attachToSheet(root, actor);
  const obs = new MutationObserver(mutations => {
    const hasNewCards = mutations.some(m =>
      [...m.addedNodes].some(n =>
        n.nodeType === 1 &&
        (n.classList?.contains("inventory-card") || n.querySelector?.(".inventory-card"))
      )
    );
    if (!hasNewCards) return;
    obs.disconnect();
    _attachToSheet(root, actor);
    setTimeout(() => obs.observe(root, { childList: true, subtree: true }), 200);
  });
  _sheetObservers.set(root, obs);
  obs.observe(root, { childList: true, subtree: true });
}

// -- Drop light on canvas ----------------------------------------------------

async function _dropLightOnCanvas(item, dropX, dropY) {
  const actor = item.parent;
  if (!actor) return;
  const match = _getLightDef(item.name);
  if (!match) return;
  const { key, def } = match;

  const wasLit    = !!item.getFlag(SYSTEM_ID, "lit");
  const remaining = item.getFlag(SYSTEM_ID, "remainingSecs") ?? def.longevitySecs;
  const tokenLight = wasLit ? _lightConfig(def) : DARK_LIGHT;

  // Snap drop position to grid
  const snapX = Math.round(dropX / canvas.grid.size) * canvas.grid.size;
  const snapY = Math.round(dropY / canvas.grid.size) * canvas.grid.size;

  const lightActor = await Actor.create({
    name:  `${item.name} (dropped)`,
    type:  actor.type,
    img:   item.img,
    flags: {
      [SYSTEM_ID]: {
        [VLT_LIGHT_ACTOR_FLAG]: true,
        sourceActorId: actor.id,
        itemName:      item.name,
        itemImg:       item.img,
        sourceKey:     key,
        remainingSecs: remaining,
        lit:           wasLit,
      },
    },
    prototypeToken: {
      name:        item.name,
      displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
      actorLink:   true,
      width:       0.5,
      height:      0.5,
      texture:     { src: item.img, scaleX: 1, scaleY: 1 },
      light:       tokenLight,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    },
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
  });

  await canvas.scene.createEmbeddedDocuments("Token", [{
    actorId:   lightActor.id,
    actorLink: true,
    x: snapX, y: snapY,
    width: 0.5, height: 0.5,
    name:    item.name,
    texture: { src: item.img },
    light:   tokenLight,
    hidden:  false,
  }]);

  if (wasLit) {
    const origToken = actor.token?.object ?? actor.getActiveTokens(true)[0];
    if (origToken) await origToken.document.update({ light: DARK_LIGHT });
  }

  await item.delete();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🔦</span><span><strong>${actor.name}</strong> dropped their <strong>${item.name}</strong>.</span></div>`,
  });
}

// -- Pick up dropped light ----------------------------------------------------

async function _pickupLight(lightActor, token) {
  let targetActor;
  if (game.user.isGM) {
    const playerActors = game.actors.filter(a => a.hasPlayerOwner);
    const options = playerActors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    const actorId = await foundry.applications.api.DialogV2.prompt({
      window:      { title: "Pick Up Light Source" },
      content:     `<p>Assign to which character?</p><select name="actor" style="width:100%">${options}</select>`,
      ok:          { callback: (event, button) => button.form.elements.actor?.value },
      rejectClose: false,
    });
    if (!actorId) return;
    targetActor = game.actors.get(actorId);
  } else {
    targetActor = game.user.character;
    if (!targetActor) return ui.notifications.warn("You have no assigned character to pick this up.");
    game.socket.emit(`system.${SYSTEM_ID}`, {
      action: "pickupLight", lightActorId: lightActor.id,
      tokenId: token.id, targetActorId: targetActor.id,
    });
    return;
  }
  await _doPickup(lightActor, token, targetActor);
}

const _pickingUp = new Set();

async function _doPickup(lightActor, token, targetActor) {
  if (_pickingUp.has(lightActor.id)) return;
  _pickingUp.add(lightActor.id);
  try {
  const flags     = lightActor.flags?.[SYSTEM_ID] ?? {};
  const itemName  = flags.itemName      ?? "Torch";
  const itemImg   = flags.itemImg       ?? "icons/sundries/lights/torch-brown.webp";
  const sourceKey = flags.sourceKey     ?? "torch";
  const remaining = flags.remainingSecs ?? 0;
  const wasLit    = flags.lit           ?? false;
  const def       = LIGHT_SOURCES[sourceKey];

  const [newItem] = await targetActor.createEmbeddedDocuments("Item", [{
    name: itemName, type: "equipment", img: itemImg,
    system: { quantity: 1, equipmentType: "gear", isConsumable: true },
    flags: { [SYSTEM_ID]: { lit: wasLit, remainingSecs: remaining, sourceKey, tokenId: null } },
  }]);

  if (wasLit && def) {
    const targetToken = targetActor.token?.object ?? targetActor.getActiveTokens(true)[0];
    if (targetToken) {
      await targetToken.document.update({ light: _lightConfig(def) });
      await newItem.update({ [`flags.${SYSTEM_ID}.tokenId`]: targetToken.id });
    }
  }

  // Delete the token first, then the actor
  // (actorLink:true tokens are NOT auto-deleted when the actor is deleted)
  const sceneToken = canvas.tokens?.placeables.find(t => t.id === token?.id || t.document.actorId === lightActor.id);
  if (sceneToken) await sceneToken.document.delete();
  await lightActor.delete();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🤲</span><span><strong>${targetActor.name}</strong> picked up <strong>${itemName}</strong>. ${LightTracker._formatTime(remaining)} remaining.</span></div>`,
  });
  } finally {
    _pickingUp.delete(lightActor.id);
  }
}

// -- LightTracker -------------------------------------------------------------

export const LightTracker = {

  _trackerApp: null,

  registerSettings() {},

  _intervalId: null,
  _tickAccum:  0,
  _TICK_FLUSH: 20,   // flush accumulated seconds to world time every 20s

  startRealTime() {
    if (!game.user.isGM || this._intervalId) return;
    this._tickAccum  = 0;
    this._intervalId = setInterval(() => this._tick(), 1000);
    console.log('Vagabond | Light Tracker: real-time tick started (flush every 20s)');
  },

  stopRealTime() {
    if (!this._intervalId) return;
    clearInterval(this._intervalId);
    this._intervalId = null;
    if (this._tickAccum > 0) { game.time.advance(this._tickAccum); this._tickAccum = 0; }
    console.log('Vagabond | Light Tracker: real-time tick stopped');
  },

  _tick() {
    if (game.paused || !game.user.isGM) return;
    this._tickAccum += 1;
    if (this._tickAccum >= this._TICK_FLUSH) {
      game.time.advance(this._tickAccum);
      this._tickAccum = 0;
    }
  },

  /** Check if any lights are lit and start/stop real-time tick accordingly. */
  _checkAutoTick() {
    if (!game.user.isGM) return;
    const hasLit = _getActiveActors().some(a => {
      if (a.getFlag(SYSTEM_ID, VLT_LIGHT_ACTOR_FLAG)) return !!a.getFlag(SYSTEM_ID, "lit");
      return a.items.some(i => !!i.getFlag(SYSTEM_ID, "lit"));
    });
    if (hasLit && !this._intervalId) this.startRealTime();
    else if (!hasLit && this._intervalId) this.stopRealTime();
  },

  init() {
    // Skip if the vagabond-crawler module is active and has its own light tracker
    if (game.modules.get('vagabond-crawler')?.active) {
      console.log('Vagabond | Light Tracker: deferring to vagabond-crawler module');
      return;
    }

    for (const hookName of ["renderVagabondCharacterSheet", "renderVagabondActorSheet", "renderActorSheet"]) {
      Hooks.on(hookName, (app, html) => {
        const actor = app.actor ?? app.document;
        if (!actor) return;
        const root = html instanceof HTMLElement ? html : (html[0] ?? html);
        if (root) _watchSheet(root, actor);
      });
    }

    let _ticking = false;
    Hooks.on("updateWorldTime", async (_worldTime, delta) => {
      if (!game.user.isGM) return;
      if (!game.settings.get(SYSTEM_ID, 'lightTrackingEnabled')) return;
      if (_ticking || delta <= 0) return;
      _ticking = true;
      try { await this.advanceTime(delta); } finally { _ticking = false; }
    });

    Hooks.on("dropCanvasData", async (_canvasObj, data) => {
      if (data.type !== "Item") return;
      let item;
      try { item = await fromUuid(data.uuid); } catch(e) { return; }
      if (!item || !_isLightSource(item) || !item.parent) return;
      if (game.user.isGM) {
        await _dropLightOnCanvas(item, data.x, data.y);
      } else {
        game.socket.emit(`system.${SYSTEM_ID}`, { action: "dropLight", itemUuid: data.uuid, x: data.x, y: data.y });
      }
      return false;
    });

    Hooks.on("renderTokenHUD", (hud, html, _data) => {
      const token = hud.object;
      const actor = token.actor;
      if (!actor?.getFlag(SYSTEM_ID, VLT_LIGHT_ACTOR_FLAG)) return;
      const root = html instanceof HTMLElement ? html : html[0];
      const btn  = document.createElement("div");
      btn.className = "control-icon vlt-pickup-btn";
      btn.title     = `Pick up ${actor.getFlag(SYSTEM_ID, "itemName") ?? "light source"}`;
      btn.innerHTML = `<i class="fas fa-hand-holding-hand"></i>`;
      (root.querySelector(".col.right") ?? root).prepend(btn);
      btn.addEventListener("click", async () => { hud.close(); await _pickupLight(actor, token); });
    });

    Hooks.on("updateItem", () => { if (this._trackerApp?.rendered) this._trackerApp.render(); });

    // Auto-start real-time tick if any lights are already burning
    this._checkAutoTick();

    console.log('Vagabond | Light Tracker initialized');
  },

  /** Register socket listeners -- called separately so vagabond.mjs can wire it up. */
  registerSocketListeners() {
    game.socket?.on(`system.${SYSTEM_ID}`, async data => {
      if (!game.user.isGM) return;
      if (data.action === "dropLight") {
        const item = await fromUuid(data.itemUuid).catch(() => null);
        if (item) await _dropLightOnCanvas(item, data.x, data.y);
      } else if (data.action === "pickupLight") {
        const lightActor  = game.actors.get(data.lightActorId);
        const tokenDoc    = canvas.tokens?.get(data.tokenId)?.document;
        const targetActor = game.actors.get(data.targetActorId);
        if (lightActor && tokenDoc && targetActor) await _doPickup(lightActor, tokenDoc, targetActor);
      }
    });
  },

  openTracker() {
    if (!this._trackerApp) this._trackerApp = new LightTrackerApp();
    this._trackerApp.render(true);
  },

  async advanceTime(secs) {
    if (!game.user.isGM) return;
    for (const actor of _getActiveActors()) {
      if (actor.getFlag(SYSTEM_ID, VLT_LIGHT_ACTOR_FLAG)) {
        if (!actor.getFlag(SYSTEM_ID, "lit")) continue;
        const key     = actor.getFlag(SYSTEM_ID, "sourceKey") ?? "torch";
        const maxSecs = LIGHT_SOURCES[key]?.longevitySecs ?? 3600;
        const prev = actor.getFlag(SYSTEM_ID, "remainingSecs") ?? 0;
        const next = Math.max(0, Math.min(maxSecs, prev - secs));
        await actor.setFlag(SYSTEM_ID, "remainingSecs", next);
        if (secs > 0 && next <= 0) {
          const itemName = actor.getFlag(SYSTEM_ID, "itemName") ?? "light source";
          await ChatMessage.create({
            content: `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🕯️</span><span>A dropped <strong>${itemName}</strong> has burned out!</span></div>`,
          });
          const burnedToken = canvas.tokens?.placeables.find(t => t.document.actorId === actor.id);
          if (burnedToken) await burnedToken.document.delete();
          await actor.delete();
        }
        continue;
      }
      for (const item of actor.items) {
        if (!item.getFlag(SYSTEM_ID, "lit")) continue;
        const srcKey  = item.getFlag(SYSTEM_ID, "sourceKey");
        const maxSecs = LIGHT_SOURCES[srcKey]?.longevitySecs ?? 3600;
        const prev = item.getFlag(SYSTEM_ID, "remainingSecs") ?? 0;
        const next = Math.max(0, Math.min(maxSecs, prev - secs));
        if (secs > 0 && next <= 0) await this._burnOut(item, actor);
        else await item.setFlag(SYSTEM_ID, "remainingSecs", next);
      }
    }
    if (this._trackerApp?.rendered) this._trackerApp.render();
  },

  async _toggleLight(item) {
    const lit = item.getFlag(SYSTEM_ID, "lit") ?? false;
    if (lit) await this._douseLight(item);
    else     await this._lightItem(item);
    if (this._trackerApp?.rendered) this._trackerApp.render();
  },

  async _lightItem(item) {
    const match = _getLightDef(item.name);
    if (!match) return;
    const { key, def } = match;
    const remaining = item.getFlag(SYSTEM_ID, "remainingSecs") ?? def.longevitySecs;
    const actor = item.parent;
    const qty = item.system.quantity ?? 1;

    let litItem = item;

    // If stacked (qty > 1), split one off as a separate lit item
    if (qty > 1 && actor) {
      // Reduce the original stack
      await item.update({ "system.quantity": qty - 1 });

      // Create a new item with quantity 1
      const itemData = item.toObject();
      itemData.system.quantity = 1;
      delete itemData._id;
      const [newItem] = await actor.createEmbeddedDocuments("Item", [itemData]);
      litItem = newItem;
    }

    await litItem.setFlag(SYSTEM_ID, "lit",          true);
    await litItem.setFlag(SYSTEM_ID, "remainingSecs", remaining);
    await litItem.setFlag(SYSTEM_ID, "sourceKey",     key);

    if (actor) {
      for (const token of actor.getActiveTokens()) {
        await token.document.update({ light: _lightConfig(def) });
      }
    }
    ui.notifications.info(`${litItem.name} lit. ${this._formatTime(remaining)} remaining.`);
    this._checkAutoTick();
  },

  async _douseLight(item) {
    await item.setFlag(SYSTEM_ID, "lit", false);
    const actor = item.parent;
    if (actor) {
      for (const token of actor.getActiveTokens()) {
        await token.document.update({ light: DARK_LIGHT });
      }
    }
    ui.notifications.info(`${item.name} doused.`);
    this._checkAutoTick();
  },

  async _burnOut(item, actor) {
    await item.setFlag(SYSTEM_ID, "lit",          false);
    await item.setFlag(SYSTEM_ID, "remainingSecs", 0);
    for (const token of actor.getActiveTokens()) {
      await token.document.update({ light: DARK_LIGHT });
    }
    const key = item.getFlag(SYSTEM_ID, "sourceKey");
    const def = key ? LIGHT_SOURCES[key] : null;
    if (def?.consumable) {
      const qty = item.system.quantity ?? 1;
      if (qty <= 1) {
        await item.delete();
        await ChatMessage.create({
          content: `<div class="vagabond-chat light-out"><i class="fas fa-fire-flame-curved"></i> <strong>${actor.name}'s last ${item.name} has burned out!</strong></div>`,
          speaker: { alias: "Light Tracker" },
        });
      } else {
        await item.update({ "system.quantity": qty - 1 });
        await item.setFlag(SYSTEM_ID, "remainingSecs", def.longevitySecs);
        await ChatMessage.create({
          content: `<div class="vagabond-chat light-out"><i class="fas fa-fire-flame-curved"></i> <strong>${actor.name}'s ${item.name} has burned out! (${qty - 1} remaining)</strong></div>`,
          speaker: { alias: "Light Tracker" },
        });
      }
    } else {
      await ChatMessage.create({
        content: `<div class="vagabond-chat light-out"><i class="fas fa-fire-flame-curved"></i> <strong>${actor.name}'s ${item.name} needs refueling!</strong></div>`,
        speaker: { alias: "Light Tracker" },
      });
    }
    this._checkAutoTick();
  },

  _formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  },

  applySync() {},
};

// -- Light Tracker App --------------------------------------------------------

const { ApplicationV2: AppV2, HandlebarsApplicationMixin: HbsMixin } = foundry.applications.api;

class LightTrackerApp extends HbsMixin(AppV2) {
  static DEFAULT_OPTIONS = {
    id:       "vagabond-light-tracker",
    window:   { title: "Light Tracker", resizable: true },
    position: { width: "auto", height: "auto" },
  };
  static PARTS = {
    form: { template: "systems/vagabond/templates/apps/light-tracker.hbs" },
  };

  async _prepareContext() {
    const entries = [];
    for (const actor of _getActiveActors()) {
      if (actor.getFlag(SYSTEM_ID, VLT_LIGHT_ACTOR_FLAG)) {
        if (!actor.getFlag(SYSTEM_ID, "lit")) continue;
        const secs = actor.getFlag(SYSTEM_ID, "remainingSecs") ?? 0;
        entries.push({
          actorId: actor.id, name: "🔦 Dropped",
          img: actor.getFlag(SYSTEM_ID, "itemImg") ?? actor.img,
          lights: [{ id: null, actorId: actor.id,
                     name: actor.getFlag(SYSTEM_ID, "itemName") ?? actor.name,
                     remaining: secs, formattedTime: LightTracker._formatTime(secs), pct: 100 }],
        });
        continue;
      }
      const litItems = actor.items.filter(i => i.getFlag(SYSTEM_ID, "lit"));
      if (!litItems.length) continue;
      entries.push({
        actorId: actor.id, name: actor.name, img: actor.img,
        lights: litItems.map(i => {
          const secs = i.getFlag(SYSTEM_ID, "remainingSecs") ?? 0;
          const max  = LIGHT_SOURCES[i.getFlag(SYSTEM_ID, "sourceKey")]?.longevitySecs ?? 3600;
          return { id: i.id, actorId: actor.id, name: i.name,
                   remaining: secs, formattedTime: LightTracker._formatTime(secs),
                   pct: Math.round((secs / max) * 100) };
        }),
      });
    }
    const defaultMins = TIME_PASSES_DEFAULT_MINS;
    return { entries, defaultMins };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Time Passes
    const minsInput = this.element.querySelector(".vlt-mins-input");

    const _doTimePasses = async (multiplier) => {
      const mins = parseInt(minsInput?.value ?? TIME_PASSES_DEFAULT_MINS);
      if (!(mins > 0)) return;
      const secs = mins * 60;

      if (multiplier < 0) {
        // "Time Passes" — burn light sources by advancing world time.
        // The updateWorldTime hook will deduct burn time automatically.
        await game.time.advance(secs);
      } else {
        // "Add Time" — refuel / add time to light sources (no world time change).
        // Negative secs to advanceTime = adds remaining time.
        await LightTracker.advanceTime(-secs);
      }

      const label = multiplier > 0 ? "Time Added" : "Time Passes";
      const icon  = multiplier > 0 ? "fa-hourglass-start" : "fa-hourglass-half";
      await ChatMessage.create({
        content: `<div class="vagabond-chat"><i class="fas ${icon}"></i> <strong>${label}</strong> — ${mins} minutes.</div>`,
        speaker: { alias: "Light Tracker" },
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
      });
    };

    this.element.querySelector("[data-action='timePlus']")?.addEventListener("click", () => _doTimePasses(1));
    this.element.querySelector("[data-action='timeMinus']")?.addEventListener("click", () => _doTimePasses(-1));

    // Douse buttons
    this.element.querySelectorAll(".vlt-douse").forEach(btn => {
      btn.addEventListener("click", async ev => {
        const { actorId, itemId } = ev.currentTarget.dataset;
        const item = game.actors.get(actorId)?.items.get(itemId);
        if (item) await LightTracker._douseLight(item);
      });
    });
  }
}
