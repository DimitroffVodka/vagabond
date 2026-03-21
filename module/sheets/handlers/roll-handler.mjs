import { TargetHelper } from '../../helpers/target-helper.mjs';
import { VagabondTextParser } from '../../helpers/text-parser.mjs';
import { VagabondItemSequencer } from '../../helpers/item-sequencer.mjs';

/**
 * Handler for roll-related functionality.
 * Manages generic rolls, weapon rolls, and item usage.
 */
export class RollHandler {
  /**
   * @param {VagabondActorSheet} sheet - The parent actor sheet
   * @param {Object} options - Configuration options
   * @param {boolean} [options.npcMode=false] - Whether this is for NPC sheets
   */
  constructor(sheet, options = {}) {
    this.sheet = sheet;
    this.actor = sheet.actor;
    this.npcMode = options.npcMode || false;
  }

  /**
   * Handle generic d20 rolls (stats, skills, saves)
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async roll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls
    switch (dataset.rollType) {
      case 'item':
        const item = this.sheet._getEmbeddedDocument(target);
        if (item) return item.roll();
    }

    // Handle rolls that supply the formula directly
    if (dataset.roll) {
      // Import helpers
      const { VagabondRollBuilder } = await import('../../helpers/roll-builder.mjs');
      const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');

      // Determine if this is a skill or save roll FIRST (for auto-fail check)
      const rollKey = dataset.key; // e.g., 'awareness', 'might', 'reaction'
      const rollType = dataset.type; // 'skill' or 'save' or 'stat'

      // Check for auto-fail conditions
      const autoFailAllRolls = this.actor.system.autoFailAllRolls || false;
      const autoFailStats = this.actor.system.autoFailStats || [];

      // Auto-fail if Dead (autoFailAllRolls) or if specific stat is in autoFailStats array
      if (autoFailAllRolls || autoFailStats.includes(rollKey)) {
        // Import chat card helper
        const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');

        // Post auto-fail message to chat
        await VagabondChatCard.autoFailRoll(this.actor, rollType || 'stat', rollKey);

        // Show notification
        const label = dataset.label || game.i18n.localize(CONFIG.VAGABOND.stats[rollKey]) || rollKey;
        ui.notifications.warn(`${this.actor.name} automatically fails ${label} checks due to status conditions.`);

        // Create and return a dummy roll for consistency
        const autoFailRoll = new Roll('0');
        await autoFailRoll.evaluate();
        return autoFailRoll;
      }

      // Apply favor/hinder based on system state and keyboard modifiers
      const systemFavorHinder = this.actor.system.favorHinder || 'none';
      let favorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(
        systemFavorHinder,
        event.shiftKey,
        event.ctrlKey
      );

      // Bravado: Will Saves can't be Hindered while not Incapacitated
      if (rollType === 'save' && rollKey === 'will' && (this.actor.system.hasBravado || false) && !this.actor.statuses?.has('incapacitated')) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
      }

      // Evasive: Reflex Saves can't be Hindered (while not Incapacitated)
      if (rollType === 'save' && rollKey === 'reflex' && (this.actor.system.hasEvasive || false) && !this.actor.statuses?.has('incapacitated')) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
      }

      // Don't Stop Me Now: Favor on Saves vs Paralyzed/Restrained/moved
      if (rollType === 'save' && (this.actor.system.hasDontStopMeNow || false) &&
          (this.actor.statuses?.has('paralyzed') || this.actor.statuses?.has('restrained'))) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else if (favorHinder === 'none') { favorHinder = 'favor'; }
      }

      // Virtuoso Resolve: Favor on Saves (granted by Bard's Virtuoso performance)
      if (rollType === 'save' && (this.actor.system.virtuosoSavesFavor || false)) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else if (favorHinder === 'none') { favorHinder = 'favor'; }
      }

      // Dancer — Step Up Active: 2d20kh on Reflex Saves
      let baseFormula = null;
      if (rollType === 'save' && rollKey === 'reflex' && (this.actor.system.stepUpActive || false)) {
        baseFormula = '2d20kh';
      }

      // Dancer — Choreographer: one-check Favor (consume after this roll)
      const hasChoreographerFavor = this.actor.getFlag('vagabond', 'choreographerFavorOneCheck') || false;
      if (hasChoreographerFavor) {
        // Inject favor for this roll only
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else { favorHinder = 'favor'; }
      }

      const roll = await VagabondRollBuilder.buildAndEvaluateD20(
        this.actor,
        favorHinder,
        baseFormula
      );

      // Consume choreographer one-check favor AFTER the roll completes
      if (hasChoreographerFavor) {
        await this.actor.unsetFlag('vagabond', 'choreographerFavorOneCheck');
      }

      // For skills and saves, use the formatted chat cards
      if (rollType === 'skill' && rollKey) {
        // Check both regular skills and weapon skills
        const skillData = this.actor.system.skills?.[rollKey];
        const difficulty = skillData?.difficulty || 10;
        const isSuccess = roll.total >= difficulty;
        await VagabondChatCard.skillRoll(this.actor, rollKey, roll, difficulty, isSuccess);

        // Reset check bonus to 0 after any roll
        if (this.actor.system.manualCheckBonus !== 0) {
          await this.actor.update({ 'system.manualCheckBonus': 0 });
        }
        return roll;
      } else if (rollType === 'save' && rollKey) {
        const saveData = this.actor.system.saves?.[rollKey];
        const difficulty = saveData?.difficulty || 10;
        const isSuccess = roll.total >= difficulty;
        await VagabondChatCard.saveRoll(this.actor, rollKey, roll, difficulty, isSuccess);

        // Reset check bonus to 0 after any roll
        if (this.actor.system.manualCheckBonus !== 0) {
          await this.actor.update({ 'system.manualCheckBonus': 0 });
        }
        return roll;
      }

      // Fallback for generic rolls (stats, etc.)
      const label = dataset.label ? `${dataset.label}` : '';
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });

      // Reset check bonus to 0 after any roll
      if (this.actor.system.manualCheckBonus !== 0) {
        await this.actor.update({ 'system.manualCheckBonus': 0 });
      }
      return roll;
    }
  }

  /**
   * Handle weapon attack rolls
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async rollWeapon(event, target = null) {
    event.preventDefault();

    const element = target || event.currentTarget;
    const itemId = element.dataset.itemId || element.closest('[data-item-id]')?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) {
      ui.notifications.error('Item not found!');
      return;
    }

    // Delegate to the shared attack pipeline — single source of truth
    const { performWeaponAttack } = globalThis.vagabond.utils;
    return performWeaponAttack(this.actor, item, {
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
    });
  }

  /**
   * Handle using an item (gear, relic, or alchemical) to post to chat
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async useItem(event, target) {
    event.preventDefault();

    // 1. Target Safety
    const element = target || event.currentTarget;
    const itemId = element.dataset.itemId || element.closest('[data-item-id]')?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) {
      ui.notifications.error('Item not found!');
      return;
    }

    // 2. Class feature intercepts — relic items trigger class features
    const itemNameLower = (item.name || '').toLowerCase();
    if (itemNameLower.includes('step up') && this.actor.system.hasStepUp) {
      const { performStepUp } = await import('../../helpers/dancer-helper.mjs');
      await performStepUp(this.actor);
      return;
    }
    if (itemNameLower.includes('virtuoso') && this.actor.system.hasVirtuoso) {
      const targetsAtRollTime = TargetHelper.captureCurrentTargets();
      const { performVirtuoso } = await import('../../helpers/bard-helper.mjs');
      await performVirtuoso(this.actor, targetsAtRollTime);
      return;
    }

    // 3. Capture targets at use time
    const targetsAtRollTime = TargetHelper.captureCurrentTargets();

    // 4. Delegate to item.roll() which handles consumables, chat cards, and all logic
    if (typeof item.roll === 'function') {
      await item.roll(event, targetsAtRollTime);
    }
  }

  /**
   * NPC morale roll (NPC mode only)
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async rollMorale(event, target) {
    if (!this.npcMode) return;

    event.preventDefault();

    const roll = new Roll('2d6');
    await roll.evaluate();

    const morale = this.actor.system.morale || 7;
    const success = roll.total <= morale;

    const flavor = success
      ? `<strong>Morale Check: PASS</strong> (rolled ${roll.total} vs ${morale})`
      : `<strong>Morale Check: FAIL</strong> (rolled ${roll.total} vs ${morale})`;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavor,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }
}
