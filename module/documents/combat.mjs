import { CountdownDice } from './countdown-dice.mjs';

/**
 * Extend the base Combat document to implement Popcorn Initiative.
 * @extends {Combat}
 */
export class VagabondCombat extends Combat {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  async endCombat() {
    // Clean up all countdown/burning dice when combat ends
    try {
      await this._cleanupAllCountdownDice();
    } catch (e) { console.warn('Vagabond | Error clearing countdown dice:', e); }

    // Clean up all spell-inflicted statuses and remove tracking flags
    try {
      await this._cleanupAllSpellStatuses();
    } catch (e) { console.warn('Vagabond | Error clearing spell statuses:', e); }

    return super.endCombat();
  }

  /** @override */
  async startCombat() {
    await this.resetAll();
    await super.startCombat();
    return this.update({ turn: null });
  }

  /** @override */
  async nextRound() {
    await this.resetAll();
    const newRound = this.round + 1;

    // Auto-roll ALL countdown/burning dice at the start of each round
    if (game.user.isGM) {
      try {
        await this._autoRollAllCountdownDice();
      } catch (e) { console.warn('Vagabond | Error auto-rolling countdown dice:', e); }
    }

    // Process spell-inflicted status conditions: Focus upkeep or expiry
    if (game.user.isGM) {
      try {
        await this._processSpellStatuses();
      } catch (e) { console.warn('Vagabond | Error processing spell statuses:', e); }
    }

    const advanceTime = CONFIG.time.roundTime;
    return this.update({ round: newRound, turn: null }, { advanceTime });
  }

  /** @override */
  async previousRound() {
    await this.resetAll();
    const advanceTime = -1 * CONFIG.time.roundTime;
    return this.update({ round: Math.max(0, this.round - 1), turn: null }, { advanceTime });
  }

  /**
   * Reset all combatants to their max activations.
   */
  async resetAll() {
    const updates = this.combatants.map(c => {
      const max = c.getFlag('vagabond', 'activations.max') ?? 1;
      return {
        _id: c.id,
        'flags.vagabond.activations.value': max
      };
    });
    return this.updateEmbeddedDocuments('Combatant', updates);
  }

  /**
   * Activate a specific combatant.
   * Sets them as the active turn without consuming an activation yet.
   * @param {string} combatantId
   */
  async activateCombatant(combatantId) {
    if (!this.active) {
        ui.notifications.warn("Combat must be started before activating combatants.");
        return;
    }

    const combatant = this.combatants.get(combatantId);
    if (!combatant) return;

    const value = combatant.getFlag('vagabond', 'activations.value') ?? 0;

    if (value <= 0) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.Combat.NoActivationsLeft"));
      return;
    }

    // Set as active turn (don't decrement yet - that happens when they end their turn)
    const turnIndex = this.turns.findIndex(c => c.id === combatantId);
    return this.update({ turn: turnIndex });
  }

  /**
   * Deactivate the current combatant (End Turn).
   * This is when we consume the activation.
   */
  async deactivateCombatant(combatantId) {
    const turnIndex = this.turns.findIndex(c => c.id === combatantId);
    if (turnIndex !== this.turn) return;

    const combatant = this.combatants.get(combatantId);
    if (combatant) {
      // Consume the activation when ending the turn
      const value = combatant.getFlag('vagabond', 'activations.value') ?? 0;
      if (value > 0) {
        await combatant.setFlag('vagabond', 'activations.value', value - 1);
      }
    }

    // Unset the turn so no one is "active"
    return this.update({ turn: null });
  }

  /**
   * Advance to the next turn.
   * - Ends the current turn (consuming activation)
   * - If current combatant has activations left, activate them again
   * - Otherwise, find next combatant with activations available
   * @override
   */
  async nextTurn() {
    // If no active turn, find first combatant with activations
    if (this.turn === null || this.turn === undefined) {
      const nextCombatant = this._findNextAvailableCombatant();
      if (!nextCombatant) {
        ui.notifications.warn(game.i18n.localize("VAGABOND.Combat.NoActivationsRemaining"));
        return;
      }
      return this.activateCombatant(nextCombatant.id);
    }

    // Get current combatant and consume their activation
    const currentCombatant = this.turns[this.turn];
    if (!currentCombatant) return;

    // Consume the current activation
    const currentActivations = currentCombatant.getFlag('vagabond', 'activations.value') ?? 0;

    if (currentActivations > 0) {
      await currentCombatant.setFlag('vagabond', 'activations.value', currentActivations - 1);
    }

    // Check if current combatant still has activations after consuming one
    const remainingActivations = currentActivations - 1;
    if (remainingActivations > 0) {
      return this.activateCombatant(currentCombatant.id);
    }

    // Otherwise, find next combatant with activations
    const nextCombatant = this._findNextAvailableCombatant(this.turn);
    if (!nextCombatant) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.Combat.NoActivationsRemaining"));
      return this.update({ turn: null });
    }

    return this.activateCombatant(nextCombatant.id);
  }

  /**
   * Go back to the previous turn.
   * - Restores the current combatant's activation (they haven't used it yet since we're active)
   * - Finds previous combatant and increments their activation
   * - Sets previous combatant as active
   * @override
   */
  async previousTurn() {
    // If no active turn, find last combatant that was spent
    if (this.turn === null || this.turn === undefined) {
      const prevCombatant = this._findPreviousSpentCombatant();
      if (!prevCombatant) {
        ui.notifications.warn(game.i18n.localize("VAGABOND.Combat.NoPreviousTurn"));
        return;
      }
      // Increment their activation (give back the one they used)
      const currentValue = prevCombatant.getFlag('vagabond', 'activations.value') ?? 0;
      const maxValue = prevCombatant.getFlag('vagabond', 'activations.max') ?? 1;
      const newValue = Math.min(currentValue + 1, maxValue);
      await prevCombatant.setFlag('vagabond', 'activations.value', newValue);

      // Set as active turn
      const turnIndex = this.turns.findIndex(c => c.id === prevCombatant.id);
      return this.update({ turn: turnIndex });
    }

    // Current combatant is active but hasn't consumed their activation yet
    // We don't need to restore anything for them

    // Find previous combatant
    const prevCombatant = this._findPreviousCombatant(this.turn);
    if (!prevCombatant) {
      return this.update({ turn: null });
    }

    // Increment previous combatant's activation (give back the one they used)
    const prevValue = prevCombatant.getFlag('vagabond', 'activations.value') ?? 0;
    const prevMax = prevCombatant.getFlag('vagabond', 'activations.max') ?? 1;
    const prevNewValue = Math.min(prevValue + 1, prevMax);
    await prevCombatant.setFlag('vagabond', 'activations.value', prevNewValue);

    // Set as active turn
    const turnIndex = this.turns.findIndex(c => c.id === prevCombatant.id);
    return this.update({ turn: turnIndex });
  }

  /**
   * Find the next combatant with activations available.
   * @param {number|null} startIndex - Index to start searching from (exclusive)
   * @returns {Combatant|null}
   * @private
   */
  _findNextAvailableCombatant(startIndex = -1) {
    const startPos = startIndex === null || startIndex === undefined ? -1 : startIndex;

    // Search from startIndex+1 to end
    for (let i = startPos + 1; i < this.turns.length; i++) {
      const combatant = this.turns[i];
      const activations = combatant.getFlag('vagabond', 'activations.value') ?? 0;
      if (activations > 0 && !combatant.defeated) {
        return combatant;
      }
    }

    // Wrap around: search from start to startIndex
    for (let i = 0; i <= startPos; i++) {
      const combatant = this.turns[i];
      const activations = combatant.getFlag('vagabond', 'activations.value') ?? 0;
      if (activations > 0 && !combatant.defeated) {
        return combatant;
      }
    }

    return null;
  }

  /**
   * Find the previous combatant (going backwards in turn order).
   * @param {number} startIndex - Index to start searching from (exclusive)
   * @returns {Combatant|null}
   * @private
   */
  _findPreviousCombatant(startIndex) {
    // Search backwards from startIndex-1 to start
    for (let i = startIndex - 1; i >= 0; i--) {
      const combatant = this.turns[i];
      if (!combatant.defeated) {
        return combatant;
      }
    }

    // Wrap around: search from end to startIndex
    for (let i = this.turns.length - 1; i > startIndex; i--) {
      const combatant = this.turns[i];
      if (!combatant.defeated) {
        return combatant;
      }
    }

    return null;
  }

  /**
   * Find the last combatant that was spent (for starting previousTurn when no active turn).
   * @returns {Combatant|null}
   * @private
   */
  _findPreviousSpentCombatant() {
    // Find last combatant with activations below max
    for (let i = this.turns.length - 1; i >= 0; i--) {
      const combatant = this.turns[i];
      if (combatant.defeated) continue;

      const current = combatant.getFlag('vagabond', 'activations.value') ?? 0;
      const max = combatant.getFlag('vagabond', 'activations.max') ?? 1;

      if (current < max) {
        return combatant;
      }
    }

    return null;
  }

  /**
   * GM Tool: Add/Remove Max Activations
   */
  async addMaxActivation(combatantId, delta) {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return;

    const current = combatant.getFlag('vagabond', 'activations') || { value: 0, max: 1 };
    const newMax = Math.max(1, current.max + delta);
    const newValue = Math.max(0, current.value + delta); // Also adjust current if increasing max

    return combatant.setFlag('vagabond', 'activations', {
      max: newMax,
      value: newValue
    });
  }

  /**
   * GM Tool: Add/Remove Current Activation
   */
  async addCurrentActivation(combatantId, delta) {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return;

    const current = combatant.getFlag('vagabond', 'activations.value') ?? 0;
    const max = combatant.getFlag('vagabond', 'activations.max') ?? 1;
    const newValue = Math.clamp(current + delta, 0, max);

    return combatant.setFlag('vagabond', 'activations.value', newValue);
  }

  /**
   * Auto-roll ALL countdown/burning dice at the start of a new round.
   * Rolls every die regardless of token linking — both pure timers and burning dice.
   * Burning dice deal damage via the overlay's _applyLinkedDamage flow.
   * @private
   */
  async _autoRollAllCountdownDice() {
    const allDice = CountdownDice.getAll();
    if (allDice.length === 0) return;

    const overlay = globalThis.vagabond?.ui?.countdownDiceOverlay;
    if (!overlay) return;

    for (const dice of allDice) {
      // Verify dice still exists (could have been deleted by a previous roll's cleanup)
      if (!game.journal.get(dice.id)) continue;
      await overlay._onRollDice(dice, true);
    }
  }

  /**
   * Delete all countdown/burning dice when combat ends.
   * Cleans up linked status effects before deleting.
   * @private
   */
  async _cleanupAllCountdownDice() {
    if (!game.user.isGM) return;

    const allDice = CountdownDice.getAll();
    if (allDice.length === 0) return;

    const overlay = globalThis.vagabond?.ui?.countdownDiceOverlay;

    for (const dice of allDice) {
      // Clean up linked effects (remove Burning status, etc.)
      if (overlay) {
        await overlay._cleanupLinkedEffects(dice);
      }
      // Remove from UI
      if (overlay) overlay.removeDice(dice.id);
      // Delete the journal entry
      await dice.delete();
    }

    ui.notifications.info('Combat ended — all countdown dice cleared.');
  }

  /**
   * Remove all countdown/burning dice linked to a specific token or actor.
   * Called when an NPC drops to 0 HP.
   * @param {string} tokenId - The token ID
   * @param {string} sceneId - The scene ID
   * @param {string} [actorName] - The actor name (fallback matching)
   */
  static async cleanupDiceForToken(tokenId, sceneId, actorName = '') {
    if (!game.user.isGM) return;

    const allDice = CountdownDice.getAll();
    const linkedDice = allDice.filter(dice => {
      const link = dice.flags?.vagabond?.linkedStatusEffect;
      // Match by linked token ID
      if (link && link.sceneId === sceneId && link.tokenIds?.includes(tokenId)) return true;
      // Match by linked actor ID (legacy data)
      if (link && link.actorIds?.some(id => id === tokenId)) return true;
      // Fallback: match by name pattern "Burning: ActorName"
      if (actorName) {
        const diceName = dice.flags?.vagabond?.countdownDice?.name || '';
        if (diceName.includes(actorName)) return true;
      }
      return false;
    });

    if (linkedDice.length === 0) return;

    const overlay = globalThis.vagabond?.ui?.countdownDiceOverlay;

    for (const dice of linkedDice) {
      if (overlay) {
        await overlay._cleanupLinkedEffects(dice);
        overlay.removeDice(dice.id);
      }
      await dice.delete();
    }
  }

  /**
   * Remove all spell-inflicted status conditions and tracking flags when combat ends.
   * @private
   */
  async _cleanupAllSpellStatuses() {
    const scene = game.scenes.current;
    if (!scene) return;

    for (const tokenDoc of scene.tokens) {
      const actor = tokenDoc.actor;
      if (!actor) continue;

      const spellStatuses = actor.getFlag('vagabond', 'spellStatuses') || [];
      if (spellStatuses.length === 0) continue;

      // Remove each spell-inflicted status condition
      for (const entry of spellStatuses) {
        if (actor.statuses?.has(entry.statusCondition)) {
          await actor.toggleStatusEffect(entry.statusCondition, { active: false });
        }
      }

      // Clear the tracking flag
      await actor.unsetFlag('vagabond', 'spellStatuses');
    }
  }

  /**
   * Process spell-inflicted status conditions at round start.
   * Focus rules:
   * - Continual statuses persist indefinitely (no Focus or mana needed)
   * - Focused + friendly/self target: silently persists, no cost
   * - Focused + hostile target (NPC): requires Cast Check + 1 mana, posted as interactive chat card
   * - Not focused: status expires automatically
   * @private
   */
  async _processSpellStatuses() {
    const scene = game.scenes.current;
    if (!scene) return;

    const expiredStatuses = [];
    // Collect hostile focus prompts per caster: Map<casterId, Array<{entry, targetActor, tokenDoc}>>
    const hostileFocusPrompts = new Map();

    // Check all tokens on the scene for spell-inflicted statuses
    for (const tokenDoc of scene.tokens) {
      const actor = tokenDoc.actor;
      if (!actor) continue;

      const spellStatuses = actor.getFlag('vagabond', 'spellStatuses') || [];
      if (spellStatuses.length === 0) continue;

      const remaining = [];

      for (const entry of spellStatuses) {
        const { statusCondition, spellId, spellName, casterId, casterName, continual } = entry;

        // Continual statuses never expire from round processing
        if (continual) {
          remaining.push(entry);
          continue;
        }

        // Check if the caster is Focusing on this spell
        const caster = game.actors.get(casterId);
        const focusedSpells = caster?.system?.focus?.spellIds || [];
        const isFocused = focusedSpells.includes(spellId);

        if (!isFocused) {
          // Not focused — remove the status condition
          if (actor.statuses?.has(statusCondition)) {
            await actor.toggleStatusEffect(statusCondition, { active: false });
          }
          expiredStatuses.push({ targetName: actor.name, statusCondition, spellName, casterName, reason: 'no focus' });
          continue;
        }

        // Focused — determine if target is hostile or friendly
        // NPC type = hostile (requires Cast Check + mana), character = friendly (free)
        const isHostileTarget = actor.type === 'npc';

        if (!isHostileTarget) {
          // Friendly/self target: Focus is free, silently persists
          remaining.push(entry);
          continue;
        }

        // Hostile target: needs Cast Check — collect for interactive prompt
        // Check mana first — if caster can't pay, auto-expire
        const currentMana = caster.system.mana?.current ?? 0;
        if (currentMana < 1) {
          // Can't pay — remove Focus and status
          const newFocused = focusedSpells.filter(id => id !== spellId);
          await caster.update({ 'system.focus.spellIds': newFocused });
          if (newFocused.length === 0 && caster.statuses?.has('focusing')) {
            await caster.toggleStatusEffect('focusing', { active: false });
          }
          if (actor.statuses?.has(statusCondition)) {
            await actor.toggleStatusEffect(statusCondition, { active: false });
          }
          expiredStatuses.push({ targetName: actor.name, statusCondition, spellName, casterName, reason: 'no mana' });
          continue;
        }

        // Has mana — queue the interactive prompt (don't remove yet)
        remaining.push(entry); // Keep for now; the button handler will remove on fail
        if (!hostileFocusPrompts.has(casterId)) {
          hostileFocusPrompts.set(casterId, []);
        }
        hostileFocusPrompts.get(casterId).push({
          entry,
          targetActorId: actor.id,
          targetName: actor.name,
          targetTokenId: tokenDoc.id,
          sceneId: scene.id
        });
      }

      // Update the flag with remaining statuses
      if (remaining.length !== spellStatuses.length) {
        if (remaining.length === 0) {
          await actor.unsetFlag('vagabond', 'spellStatuses');
        } else {
          await actor.setFlag('vagabond', 'spellStatuses', remaining);
        }
      }
    }

    // Post expiry notifications for auto-removed statuses
    if (expiredStatuses.length > 0) {
      const lines = expiredStatuses.map(expired => {
        const condLabel = CONFIG.VAGABOND.onHitStatusConditions?.[expired.statusCondition]
          ? game.i18n.localize(CONFIG.VAGABOND.onHitStatusConditions[expired.statusCondition])
          : expired.statusCondition;
        const reason = expired.reason === 'no mana' ? '(out of mana)' : '(not Focused)';
        return `<strong>${expired.targetName}</strong> is no longer <strong>${condLabel}</strong> ${reason}`;
      });

      await ChatMessage.create({
        content: `<div class="vagabond-spell-status-update">
          <h3><i class="fas fa-magic"></i> Spell Status Update</h3>
          ${lines.map(l => `<p>${l}</p>`).join('')}
        </div>`,
        speaker: { alias: 'Spell System' }
      });
    }

    // Post interactive "Maintain Focus" chat cards — one per caster+spell combination
    // Re-group prompts by casterId + spellId so each focused spell gets its own check
    const perSpellPrompts = new Map(); // key: "casterId|spellId"
    for (const [casterId, prompts] of hostileFocusPrompts) {
      for (const p of prompts) {
        const key = `${casterId}|${p.entry.spellId}`;
        if (!perSpellPrompts.has(key)) {
          perSpellPrompts.set(key, { casterId, spellId: p.entry.spellId, spellName: p.entry.spellName, targets: [] });
        }
        perSpellPrompts.get(key).targets.push(p);
      }
    }

    for (const [, group] of perSpellPrompts) {
      const caster = game.actors.get(group.casterId);
      if (!caster) continue;

      const manaSkill = caster.system.classData?.manaSkill;
      const skill = manaSkill ? caster.system.skills[manaSkill] : null;
      const difficulty = skill?.difficulty ?? 10;
      const skillLabel = skill?.label || 'Magic';

      // Build a list of targets for this spell
      const targetLines = group.targets.map(p => {
        const condLabel = CONFIG.VAGABOND.onHitStatusConditions?.[p.entry.statusCondition]
          ? game.i18n.localize(CONFIG.VAGABOND.onHitStatusConditions[p.entry.statusCondition])
          : p.entry.statusCondition;
        return `<strong>${p.targetName}</strong> — ${condLabel}`;
      });

      // Encode prompt data for the button handler
      const promptData = JSON.stringify(group.targets.map(p => ({
        statusCondition: p.entry.statusCondition,
        spellId: p.entry.spellId,
        spellName: p.entry.spellName,
        targetActorId: p.targetActorId,
        targetName: p.targetName,
        targetTokenId: p.targetTokenId,
        sceneId: p.sceneId
      }))).replace(/"/g, '&quot;');

      await ChatMessage.create({
        content: `<div class="vagabond-spell-status-update">
          <h3><i class="fas fa-magic"></i> Focus Maintenance — ${caster.name}</h3>
          <p><strong>${group.spellName}</strong>: Cast Check required (${skillLabel}, DC ${difficulty}) to maintain Focus:</p>
          ${targetLines.map(l => `<p>${l}</p>`).join('')}
          <div class="save-buttons-row">
            <button class="vagabond-focus-maintain-button vagabond-save-button"
              data-vagabond-button="true"
              data-caster-id="${group.casterId}"
              data-mana-skill="${manaSkill}"
              data-difficulty="${difficulty}"
              data-prompts="${promptData}">
              <i class="fas fa-magic"></i> Roll Cast Check (1 mana)
            </button>
            <button class="vagabond-focus-drop-button vagabond-save-button"
              data-vagabond-button="true"
              data-caster-id="${group.casterId}"
              data-prompts="${promptData}">
              <i class="fas fa-times"></i> Drop Focus
            </button>
          </div>
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor: caster })
      });
    }
  }

  /**
   * Drop Focus on spell statuses for specific targets.
   * Removes status conditions from targets, cleans up spellStatuses flags,
   * and removes spells from caster's Focus list.
   * @param {Actor} caster - The caster actor dropping Focus
   * @param {Array<Object>} prompts - Array of {statusCondition, spellId, spellName, targetActorId, targetName, targetTokenId, sceneId}
   * @static
   */
  static async _dropFocusStatuses(caster, prompts) {
    if (!caster || !prompts?.length) return;

    const spellIdsToRemove = new Set();

    // Remove status conditions from each target
    for (const prompt of prompts) {
      const targetActor = game.actors.get(prompt.targetActorId);
      if (!targetActor) continue;

      // Remove the status condition
      if (targetActor.statuses?.has(prompt.statusCondition)) {
        await targetActor.toggleStatusEffect(prompt.statusCondition, { active: false });
      }

      // Remove this entry from the target's spellStatuses flag
      const spellStatuses = targetActor.getFlag('vagabond', 'spellStatuses') || [];
      const updated = spellStatuses.filter(entry =>
        !(entry.statusCondition === prompt.statusCondition &&
          entry.spellId === prompt.spellId &&
          entry.casterId === caster.id)
      );
      if (updated.length === 0) {
        await targetActor.unsetFlag('vagabond', 'spellStatuses');
      } else if (updated.length !== spellStatuses.length) {
        await targetActor.setFlag('vagabond', 'spellStatuses', updated);
      }

      spellIdsToRemove.add(prompt.spellId);
    }

    // Remove spells from caster's Focus list
    const focusedSpells = caster.system?.focus?.spellIds || [];
    const newFocused = focusedSpells.filter(id => !spellIdsToRemove.has(id));
    if (newFocused.length !== focusedSpells.length) {
      await caster.update({ 'system.focus.spellIds': newFocused });
    }

    // Remove Focusing status if no more focused spells
    if (newFocused.length === 0 && caster.statuses?.has('focusing')) {
      await caster.toggleStatusEffect('focusing', { active: false });
    }
  }

  /** @override */
  _sortCombatants(a, b) {
    // Check if we're using initiative rolls
    const hideInitiative = game.settings.get('vagabond', 'hideInitiativeRoll');

    // Get initiative values (handling null/undefined)
    const ia = typeof a.initiative === 'number' ? a.initiative : null;
    const ib = typeof b.initiative === 'number' ? b.initiative : null;

    if (!hideInitiative) {
      // STANDARD MODE (Rolled Initiative)
      // Sort by initiative (DESCENDING - Highest First)
      if (ia !== null && ib !== null) {
        return ib - ia;
      }
      // If only one has initiative, it goes first
      if (ia !== null) return -1;
      if (ib !== null) return 1;
    } else {
      // MANUAL MODE (Popcorn/Hidden Initiative)
      // Sort by initiative (ASCENDING - Smallest First) if manually set
      if (ia !== null && ib !== null) {
        return ia - ib;
      }
      // If only one has initiative, it goes first
      if (ia !== null) return -1;
      if (ib !== null) return 1;
    }

    // Fallback to disposition and name sorting
    const da = a.token?.disposition ?? -2;
    const db = b.token?.disposition ?? -2;
    if (da !== db) return db - da;
    return (a.name || "").localeCompare(b.name || "");
  }
}