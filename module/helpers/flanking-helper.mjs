/**
 * Vagabond — Flanking Helper
 *
 * Automatic flanking detection during combat.
 * If 2+ allied tokens are Close (within 5 ft) to a foe, and the foe is
 * no more than one size larger than the allies, the foe is Vulnerable.
 *
 * Bidirectional: heroes can flank NPCs and NPCs can flank heroes.
 * Only the GM client runs the evaluation to avoid race conditions.
 *
 * Uses actor flag `flankedBy` to track flanking-applied Vulnerable so
 * we never remove Vulnerable that was applied by other means.
 *
 * Ported from the vagabond-crawler module's flanking-checker.mjs.
 */

const SYSTEM_ID = 'vagabond';
const FLANKING_ORIGIN = `system.${SYSTEM_ID}.flanking`;

// ── Size hierarchy ──────────────────────────────────────────────────────────

const SIZE_ORDER = { small: 0, medium: 1, large: 2, huge: 3, giant: 4, colossal: 5 };

function _getSizeValue(actor) {
  if (!actor) return 1; // default medium
  // Characters: actor.system.attributes.size
  // NPCs:       actor.system.size
  const key = actor.system?.attributes?.size ?? actor.system?.size ?? "medium";
  return SIZE_ORDER[key] ?? 1;
}

// ── Distance helpers ────────────────────────────────────────────────────────

/**
 * Edge-to-edge Chebyshev distance between two tokens in feet.
 * Supports multi-square tokens (Large 2×2, Huge 3×3, etc.).
 */
function _distanceFt(tokenA, tokenB) {
  const scene = canvas.scene;
  if (!scene) return Infinity;
  const gridSize = scene.grid?.size ?? 100;
  const gridDist = scene.grid?.distance ?? 5;

  // Snap to nearest grid square to handle sub-pixel positions
  const ax = Math.round(tokenA.document.x / gridSize);
  const ay = Math.round(tokenA.document.y / gridSize);
  const aw = tokenA.document.width;
  const ah = tokenA.document.height;

  const bx = Math.round(tokenB.document.x / gridSize);
  const by = Math.round(tokenB.document.y / gridSize);
  const bw = tokenB.document.width;
  const bh = tokenB.document.height;

  // Gap between bounding boxes in grid squares (0 = touching/overlapping)
  const gapX = Math.max(0, Math.max(ax, bx) - Math.min(ax + aw, bx + bw));
  const gapY = Math.max(0, Math.max(ay, by) - Math.min(ay + ah, by + bh));

  // +1 converts gap squares to Foundry-standard distance:
  // adjacent (gap 0) = 5ft, 1 gap = 10ft, etc.
  const gap = Math.max(gapX, gapY);
  return (gap + 1) * gridDist;
}

// ── Flanking Helper ─────────────────────────────────────────────────────────

export const FlankingHelper = {

  _debounceTimer: null,

  init() {
    // Skip if the vagabond-crawler module is active and has its own flanking
    if (game.modules.get('vagabond-crawler')?.active) {
      try {
        if (game.settings.get('vagabond-crawler', 'flankingEnabled')) {
          console.log('Vagabond | Flanking: deferring to vagabond-crawler module');
          return;
        }
      } catch {
        // Setting doesn't exist — crawler doesn't have flanking, proceed
      }
    }

    // Re-evaluate flanking whenever any token document is updated
    // This fires once after movement completes (including WASD movement)
    Hooks.on("updateToken", (doc, changes) => {
      if (!game.user.isGM || !game.combat) return;
      if (!game.settings.get(SYSTEM_ID, "flankingEnabled")) return;
      this._scheduleEvaluate();
    });

    // Evaluate when combat starts
    Hooks.on("combatStart", () => this._scheduleEvaluate());

    // Evaluate on turn/round changes
    Hooks.on("updateCombat", (combat, changes) => {
      if (changes.round !== undefined || changes.turn !== undefined) {
        this._scheduleEvaluate();
      }
    });

    // Re-evaluate when a combatant is added or removed
    Hooks.on("createCombatant", () => this._scheduleEvaluate());
    Hooks.on("deleteCombatant", () => this._scheduleEvaluate());

    // Re-evaluate when a combatant is defeated/undefeated
    Hooks.on("updateCombatant", (combatant, changes) => {
      if (changes.defeated !== undefined) this._scheduleEvaluate();
    });

    // Clean up all flanking Vulnerable when combat ends
    Hooks.on("deleteCombat", () => this._cleanupAll());

    console.log('Vagabond | Flanking helper initialized');
  },

  // ── Scheduling ────────────────────────────────────────────────────────────

  _scheduleEvaluate() {
    if (!game.user.isGM) return;
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._evaluate(), 250);
  },

  // ── Core evaluation ───────────────────────────────────────────────────────

  async _evaluate() {
    if (!game.user.isGM || !game.combat) return;
    if (!game.settings.get(SYSTEM_ID, "flankingEnabled")) return;

    // Gather all non-defeated combat tokens on the canvas
    const combatTokens = [];
    for (const c of game.combat.combatants) {
      if (c.defeated) continue;
      const token = canvas.tokens?.get(c.tokenId);
      if (!token?.actor) continue;
      combatTokens.push(token);
    }

    // For each token, determine if it should be flanked
    for (const target of combatTokens) {
      const targetDisp = target.document.disposition;
      const targetSize = _getSizeValue(target.actor);

      // Find all enemies within 5 ft
      let closeEnemyCount = 0;
      let smallestEnemySize = Infinity;

      for (const other of combatTokens) {
        if (other.id === target.id) continue;
        // Must be opposed disposition
        if (other.document.disposition === targetDisp) continue;
        // Must be Close (≤5ft — adjacent on grid)
        if (_distanceFt(target, other) > 5) continue;

        closeEnemyCount++;
        const otherSize = _getSizeValue(other.actor);
        if (otherSize < smallestEnemySize) smallestEnemySize = otherSize;
      }

      // Flanking: 2+ enemies close AND foe no more than one size larger than allies
      const shouldBeFlanked = closeEnemyCount >= 2 && targetSize <= smallestEnemySize + 1;
      const currentlyFlanked = !!target.actor.getFlag(SYSTEM_ID, "flankedBy");

      if (shouldBeFlanked && !currentlyFlanked) {
        await this._applyFlanked(target.actor);
      } else if (!shouldBeFlanked && currentlyFlanked) {
        await this._removeFlanked(target.actor);
      }
    }
  },

  // ── Apply / Remove ────────────────────────────────────────────────────────

  _findFlankingEffect(actor) {
    return actor.effects.find(e => e.flags?.[SYSTEM_ID]?.flankingEffect);
  },

  async _applyFlanked(actor) {
    // Only apply if we haven't already created the flanking effect
    if (this._findFlankingEffect(actor)) return;
    await actor.setFlag(SYSTEM_ID, "flankedBy", true);

    // Use toggleStatusEffect to leverage the system's existing Vulnerable definition
    // (which has proper mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE changes for
    //  favorHinder, incomingAttacksModifier, and outgoingSavesModifier)
    if (!actor.statuses?.has('vulnerable')) {
      await actor.toggleStatusEffect('vulnerable', { active: true });
    }

    // Tag the created effect so we can identify and remove only our flanking-applied one
    const vulnEffect = actor.effects.find(e =>
      e.statuses?.has('vulnerable') && !e.flags?.[SYSTEM_ID]?.flankingEffect
    );
    if (vulnEffect) {
      await vulnEffect.update({
        name: 'Vulnerable (Flanked)',
        [`flags.${SYSTEM_ID}.flankingEffect`]: true,
      });
    }
  },

  async _removeFlanked(actor) {
    await actor.unsetFlag(SYSTEM_ID, "flankedBy");
    // Remove only the flanking-applied Vulnerable effect (preserve manually-applied ones)
    const toDelete = actor.effects.filter(e => e.flags?.[SYSTEM_ID]?.flankingEffect);
    if (toDelete.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete.map(e => e.id));
    }
    // Force token refresh to remove status icon overlay
    const tokens = actor.getActiveTokens(true);
    for (const token of tokens) {
      token.renderFlags.set({ refreshEffects: true });
    }
  },

  // ── Cleanup ───────────────────────────────────────────────────────────────

  async _cleanupAll() {
    if (!game.user.isGM) return;
    // Remove flanking Vulnerable from all actors that have the flag
    for (const actor of game.actors) {
      if (actor.getFlag(SYSTEM_ID, "flankedBy")) {
        await this._removeFlanked(actor);
      }
    }
    // Also clean up unlinked token actors (NPCs on canvas)
    for (const token of canvas.tokens?.placeables ?? []) {
      if (token.actor?.getFlag(SYSTEM_ID, 'flankedBy')) {
        await this._removeFlanked(token.actor);
      }
    }
  },
};
