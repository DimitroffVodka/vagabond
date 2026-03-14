import { VagabondSpellSequencer } from '../../helpers/spell-sequencer.mjs';
import { TargetHelper } from '../../helpers/target-helper.mjs';

/**
 * Handler for spell-related functionality in the character sheet.
 * Manages spell state persistence, mana cost calculations, delivery mechanics, and spell casting.
 */
export class SpellHandler {
  /**
   * @param {VagabondActorSheet} sheet - The parent actor sheet
   */
  constructor(sheet) {
    this.sheet = sheet;
    this.actor = sheet.actor;
    this.spellStates = this._loadSpellStates();
  }

  // ===========================
  // State Management
  // ===========================

  /**
   * Load spell states from localStorage for this character
   * @returns {Object} Spell states keyed by spell ID
   * @private
   */
  _loadSpellStates() {
    const key = `vagabond.spell-states.${this.actor.id}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Save spell states to localStorage for this character
   * @private
   */
  _saveSpellStates() {
    const key = `vagabond.spell-states.${this.actor.id}`;
    localStorage.setItem(key, JSON.stringify(this.spellStates));
  }

  /**
   * Get spell state for a specific spell, creating default if needed
   * @param {string} spellId - The spell ID
   * @returns {Object} Spell state with damageDice, deliveryType, deliveryIncrease, useFx, previewActive
   * @private
   */
  _getSpellState(spellId) {
    if (!this.spellStates[spellId]) {
      const spell = this.actor.items.get(spellId);
      const defaultUseFx = spell?.system?.damageType === '-';
      // Healing spells default to 0 dice (base effect only, no mana cost for healing)
      const isHealing = ['healing', 'recover', 'recharge'].includes(spell?.system?.damageType);
      const defaultDice = isHealing ? 0 : 1;

      this.spellStates[spellId] = {
        damageDice: defaultDice,
        deliveryType: null,
        deliveryIncrease: 0,
        useFx: defaultUseFx,
        previewActive: false,
      };
    }
    return this.spellStates[spellId];
  }

  // ===========================
  // Cost Calculations
  // ===========================

  /**
   * Calculate total mana cost for casting a spell
   * @param {string} spellId - The spell ID
   * @returns {Object} Cost breakdown: damageCost, fxCost, deliveryBaseCost, deliveryIncreaseCost, totalCost
   * @private
   */
  _calculateSpellCost(spellId) {
    const state = this._getSpellState(spellId);
    const spell = this.actor.items.get(spellId);
    if (!spell) return { damageCost: 0, fxCost: 0, deliveryBaseCost: 0, deliveryIncreaseCost: 0, totalCost: 0 };

    // Damage cost: 0 for 1d6, +1 per extra die, 0 dice = no damage cost
    // Healing spells: 1 mana per die (d6 HP per Mana spent)
    const isHealing = ['healing', 'recover', 'recharge'].includes(spell.system.damageType);
    const hasDamage = spell.system.damageType !== '-' && state.damageDice >= 1;
    const damageCost = hasDamage
      ? (isHealing ? state.damageDice : (state.damageDice > 1 ? state.damageDice - 1 : 0))
      : 0;

    // Fx cost: +1 mana ONLY when using both damage AND effects
    // 0 dice = effect-only cast, Fx is free (no combo surcharge)
    const fxCost = state.useFx && hasDamage ? 1 : 0;

    // Delivery base cost
    let deliveryBaseCost = state.deliveryType
      ? CONFIG.VAGABOND.deliveryDefaults[state.deliveryType].cost
      : 0;

    // Apply delivery mana cost reduction bonus from actor
    if (deliveryBaseCost > 0) {
      const deliveryReduction = this.actor.system.bonuses?.deliveryManaCostReduction || 0;
      deliveryBaseCost = Math.max(0, deliveryBaseCost - deliveryReduction);
    }

    // Delivery increase cost
    const increasePerStep = state.deliveryType
      ? CONFIG.VAGABOND.deliveryIncreaseCost[state.deliveryType]
      : 0;
    const deliveryIncreaseCost = state.deliveryIncrease * increasePerStep;

    let totalCost = damageCost + fxCost + deliveryBaseCost + deliveryIncreaseCost;

    // Apply total spell mana cost reduction bonus from actor
    const spellReduction = this.actor.system.bonuses?.spellManaCostReduction || 0;
    totalCost = Math.max(0, totalCost - spellReduction);

    return { damageCost, fxCost, deliveryBaseCost, deliveryIncreaseCost, totalCost };
  }

  /**
   * Get delivery size/range hint text (e.g., "(25 foot)" for increased cone)
   * NOTE: Distances stored in feet for future grid conversion (5 feet = 1 grid)
   * @param {string} deliveryType - The delivery type
   * @param {number} increaseCount - Number of increases
   * @returns {string} Size hint text
   * @private
   */
  _getDeliverySizeHint(deliveryType, increaseCount) {
    if (!deliveryType || increaseCount === 0) return '';

    const baseRange = CONFIG.VAGABOND.deliveryBaseRanges[deliveryType];
    const increment = CONFIG.VAGABOND.deliveryIncrement[deliveryType];

    if (!baseRange.value || increment === 0) return '';

    const newValue = baseRange.value + increment * increaseCount;

    if (baseRange.type === 'count') {
      // For imbue/remote: "2 targets"
      return `(${newValue} ${baseRange.unit}${newValue > 1 ? 's' : ''})`;
    } else if (baseRange.type === 'radius') {
      // For aura/sphere: "(15-foot radius)"
      return `(${newValue}-${baseRange.unit} ${baseRange.type})`;
    } else if (baseRange.type === 'length') {
      // For cone/line: "(20 foot)"
      return `(${newValue}-${baseRange.unit})`;
    } else if (baseRange.type === 'cube') {
      // For cube: "(10-foot cube)"
      return `(${newValue}-${baseRange.unit} ${baseRange.type})`;
    } else if (baseRange.type === 'square') {
      // For glyph: "(5-foot square)"
      return `(${newValue}-${baseRange.unit} ${baseRange.type})`;
    }

    return '';
  }

  /**
   * Get total delivery area/range for metadata display (e.g., "20'" for cone)
   * @param {string} deliveryType - The delivery type
   * @param {number} increaseCount - Number of increases
   * @returns {string} Total area text (e.g., "20'", "15' radius", "2 targets")
   * @private
   */
  _getDeliveryTotalArea(deliveryType, increaseCount) {
    if (!deliveryType) return '';

    const baseRange = CONFIG.VAGABOND.deliveryBaseRanges[deliveryType];
    const increment = CONFIG.VAGABOND.deliveryIncrement[deliveryType];

    if (!baseRange.value) return '';

    const totalValue = baseRange.value + increment * increaseCount;

    if (baseRange.type === 'count') {
      // For imbue/remote: "2 targets"
      return `${totalValue} ${baseRange.unit}${totalValue > 1 ? 's' : ''}`;
    } else if (baseRange.type === 'radius') {
      // For aura/sphere: "15' radius"
      return `${totalValue}' ${baseRange.type}`;
    } else if (baseRange.type === 'length') {
      // For cone/line: "20'"
      return `${totalValue}'`;
    } else if (baseRange.type === 'cube') {
      // For cube: "10' cube"
      return `${totalValue}' ${baseRange.type}`;
    } else if (baseRange.type === 'square') {
      // For glyph: "5' square"
      return `${totalValue}' ${baseRange.type}`;
    }

    return '';
  }

  // ===========================
  // Preview Management
  // ===========================

  /**
   * Clear all template previews for this actor
   * Called when player changes ANY spell configuration (shows they're changing their mind)
   * @private
   */
  async _clearAllPreviews() {
    if (globalThis.vagabond.managers?.templates) {
      await globalThis.vagabond.managers.templates.clearActorPreviews(this.actor.id);
    }

    // Also reset all preview states
    for (const spellId in this.spellStates) {
      this.spellStates[spellId].previewActive = false;
    }

    // Update UI to show previews are off
    for (const spellId in this.spellStates) {
      this._updateSpellDisplay(spellId);
    }
  }

  /**
   * Logic to actually update/create the preview
   * (Helper function to be used by multiple listeners)
   * @param {string} spellId - The spell ID
   * @private
   */
  async _refreshSpellPreview(spellId) {
    const state = this._getSpellState(spellId);

    // If preview is OFF, ensure we clear it
    if (!state.previewActive) {
      if (globalThis.vagabond.managers?.templates) {
        await globalThis.vagabond.managers.templates.clearPreview(this.actor.id, spellId);
      }
      return;
    }

    // If preview is ON, calculate data and update
    const spell = this.actor.items.get(spellId);
    if (!state.deliveryType) return; // Can't draw without type

    // Calculate total distance
    const baseRange = CONFIG.VAGABOND.deliveryBaseRanges[state.deliveryType];
    const increment = CONFIG.VAGABOND.deliveryIncrement[state.deliveryType];
    const totalDistance = baseRange.value + increment * state.deliveryIncrease;

    if (globalThis.vagabond.managers?.templates) {
      await globalThis.vagabond.managers.templates.updatePreview(
        this.actor,
        spellId,
        state.deliveryType,
        totalDistance
      );
    }
  }

  /**
   * Toggle spell preview on/off
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async toggleSpellPreview(event, target) {
    event.preventDefault();
    const spellId = target.dataset.spellId;
    const state = this._getSpellState(spellId);

    // 1. Clear ALL other previews first
    // This ensures only one preview is active at a time
    for (const otherId in this.spellStates) {
      if (otherId !== spellId && this.spellStates[otherId].previewActive) {
        this.spellStates[otherId].previewActive = false;
        if (globalThis.vagabond.managers?.templates) {
          await globalThis.vagabond.managers.templates.clearPreview(this.actor.id, otherId);
        }
        this._updateSpellDisplay(otherId);
      }
    }

    // 2. Toggle THIS spell's preview state
    state.previewActive = !state.previewActive;

    // 3. Update Visuals
    this._updateSpellDisplay(spellId);

    // 4. Update Canvas
    await this._refreshSpellPreview(spellId);
  }

  // ===========================
  // UI Updates
  // ===========================

  /**
   * Update spell display in the UI with current state and costs
   * @param {string} spellId - The spell ID
   * @private
   */
  _updateSpellDisplay(spellId) {
    const state = this._getSpellState(spellId);
    const costs = this._calculateSpellCost(spellId);
    const spell = this.actor.items.get(spellId);

    const container = this.sheet.element.querySelector(`[data-spell-id="${spellId}"]`);
    if (!container) return;

    // Update damage dice display and color
    if (spell.system.damageType !== '-') {
      const damageElement = container.querySelector('.spell-damage-dice');
      if (damageElement) {
        damageElement.textContent = `${state.damageDice}`;
      }
      if (damageElement) {
        damageElement.style.color = state.damageDice > 1
          ? 'var(--vagabond-c-damage-orange)'
          : '';
      }
    }

    // Update Fx icon visual state
    const fxIcon = container.querySelector('.spell-fx-icon');
    if (fxIcon) {
      if (state.useFx) {
        fxIcon.classList.add('fx-active');
        fxIcon.classList.remove('fx-inactive');
      } else {
        fxIcon.classList.add('fx-inactive');
        fxIcon.classList.remove('fx-active');
      }
    }

    // Update delivery dropdown
    const deliverySelect = container.querySelector('.spell-delivery-select');
    if (deliverySelect) {
      deliverySelect.value = state.deliveryType || '';
    }

    // Update delivery cost display and hint
    const costSpan = container.querySelector('.spell-delivery-cost');
    if (costSpan) {
      if (state.deliveryType) {
        const deliveryCost = costs.deliveryBaseCost + costs.deliveryIncreaseCost;
        costSpan.textContent = deliveryCost;

        // Build hint with increase info
        const increaseHint = game.i18n.localize(
          CONFIG.VAGABOND.deliveryTypeHints[state.deliveryType]
        );
        if (state.deliveryIncrease > 0) {
          const sizeHint = this._getDeliverySizeHint(state.deliveryType, state.deliveryIncrease);
          costSpan.setAttribute('title', `${increaseHint} ${sizeHint}`);
        } else {
          costSpan.setAttribute('title', increaseHint);
        }

        // Disable increase if delivery doesn't support it
        if (CONFIG.VAGABOND.deliveryIncreaseCost[state.deliveryType] === 0) {
          costSpan.classList.remove('clickable');
          costSpan.classList.add('disabled');
        } else {
          costSpan.classList.add('clickable');
          costSpan.classList.remove('disabled');
        }
      } else {
        costSpan.textContent = '—';
        costSpan.setAttribute('title', 'Select a delivery type first');
        costSpan.classList.remove('clickable');
        costSpan.classList.add('disabled');
      }
    }

    // Update range display
    const rangeSpan = container.querySelector('.spell-range');
    if (rangeSpan) {
      // NEW: Toggle preview active visual state
      if (state.previewActive) {
        rangeSpan.classList.add('preview-active');
        // Visual feedback to show it's active (Bright Text + Glow)
        rangeSpan.style.color = 'var(--color-text-light-highlight)';
        rangeSpan.style.textShadow = '0 0 5px var(--color-shadow-highlight)';
      } else {
        rangeSpan.classList.remove('preview-active');
        rangeSpan.style.color = '';
        rangeSpan.style.textShadow = '';
      }

      if (state.deliveryType) {
        const baseRange = CONFIG.VAGABOND.deliveryBaseRanges[state.deliveryType];
        const increment = CONFIG.VAGABOND.deliveryIncrement[state.deliveryType];

        if (baseRange.value) {
          const totalValue = baseRange.value + increment * state.deliveryIncrease;

          if (baseRange.type === 'count') {
            // For targets: just the number
            rangeSpan.textContent = `${totalValue}`;
          } else {
            // For all distance types: just number and '
            rangeSpan.textContent = `${totalValue}'`;
          }
        } else {
          rangeSpan.textContent = '—';
        }
      } else {
        rangeSpan.textContent = '—';
      }
    }

    // Update total mana cost
    const totalSpan = container.querySelector('.spell-mana-total');
    if (totalSpan) {
      totalSpan.textContent = costs.totalCost;
    }
  }

  // ===========================
  // Action Handlers
  // ===========================

  /**
   * Cast a spell
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async castSpell(event, target) {
    event.preventDefault();
    const spellId = target.dataset.spellId;
    const spell = this.actor.items.get(spellId);
    const state = this._getSpellState(spellId);
    const costs = this._calculateSpellCost(spellId);

    if (!spell || spell.type !== 'spell') {
      ui.notifications.error('Spell not found!');
      return;
    }

    // Validation: Must select delivery
    if (!state.deliveryType) {
      ui.notifications.warn('Select a delivery type first!');
      return;
    }

    // Validation: Enough mana
    if (costs.totalCost > this.actor.system.mana.current) {
      ui.notifications.error(
        `Not enough mana! Need ${costs.totalCost}, have ${this.actor.system.mana.current}.`
      );
      return;
    }

    // Validation: Within casting max
    if (costs.totalCost > this.actor.system.mana.castingMax) {
      ui.notifications.error(
        `Cost exceeds casting max! Max: ${this.actor.system.mana.castingMax}, Cost: ${costs.totalCost}.`
      );
      return;
    }

    // Capture targeted tokens at cast time
    let targetsAtRollTime = TargetHelper.captureCurrentTargets();

    // Target confirmation dialog
    const spellActionType = TargetHelper.classifyActionType(spell.system.damageType);
    const confirmedTargets = await TargetHelper.confirmTargets(targetsAtRollTime, {
      actionType: spellActionType,
      actionName: spell.name,
      requireTargets: false,
    });
    if (confirmedTargets === null) return;
    targetsAtRollTime = confirmedTargets;

    // Get mana skill
    const manaSkill = this.actor.system.classData?.manaSkill;
    if (!manaSkill) {
      ui.notifications.error('No mana skill configured for this class!');
      return;
    }

    // Check if spellcaster
    if (!this.actor.system.classData?.isSpellcaster) {
      ui.notifications.warn('Your class cannot cast spells!');
      return;
    }

    // Check for auto-fail conditions (Dead status)
    const autoFailAllRolls = this.actor.system.autoFailAllRolls || false;
    if (autoFailAllRolls) {
      // Import chat card helper
      const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');

      // Post auto-fail message to chat
      await VagabondChatCard.autoFailRoll(this.actor, 'spell', spell.name);

      // Show notification
      ui.notifications.warn(`${this.actor.name} cannot cast spells due to status conditions.`);
      return;
    }

    // Get skill information for display
    const skill = this.actor.system.skills[manaSkill];
    const difficulty = skill.difficulty;

    // Check if spell bypasses roll requirement
    let roll = null;
    let isSuccess = false;
    let isCritical = false;

    if (spell.system.noRollRequired || event.altKey) {
      // BYPASS PATH: No roll needed (noRollRequired flag or Alt+Click), always succeeds, no criticals
      isSuccess = true;
      isCritical = false;
      roll = null; // No roll object created
    } else {
      // NORMAL PATH: Perform casting check roll
      const label = `${spell.name} (${skill.label})`;

      // Get roll data WITH this spell's "on-use" effects applied
      const rollData = this.actor.getRollDataWithItemEffects(spell);

      // Import roll builder and build roll with centralized utility
      const { VagabondRollBuilder } = await import('../../helpers/roll-builder.mjs');

      // Apply favor/hinder with keyboard modifiers
      const systemFavorHinder = this.actor.system.favorHinder || 'none';
      let favorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(
        systemFavorHinder,
        event.shiftKey,
        event.ctrlKey
      );

      // Virtuoso Valor: Favor on Cast Checks
      if (favorHinder !== 'favor' && (this.actor.system.virtuosoAttacksFavor || false)) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else if (favorHinder === 'none') { favorHinder = 'favor'; }
      }

      roll = await VagabondRollBuilder.buildAndEvaluateD20WithRollData(rollData, favorHinder);

      isSuccess = roll.total >= difficulty;

      // ✅ CRITICAL: Use type-specific crit threshold from rollData
      const critNumber = VagabondRollBuilder.calculateCritThreshold(rollData, 'spell');
      const d20Term = roll.terms.find(
        (term) => term.constructor.name === 'Die' && term.faces === 20
      );
      const d20Result = d20Term?.results?.[0]?.result || 0;
      isCritical = d20Result >= critNumber;
    }

    // Deduct mana on success (whether from successful roll or bypass)
    if (isSuccess) {
      const newMana = this.actor.system.mana.current - costs.totalCost;
      await this.actor.update({ 'system.mana.current': newMana });
    }
    // Failed - no mana cost (chat card will show failure)
    // Note: Bypass spells always succeed, so mana is always deducted

    // Life spell revive: 0 dice = revive dead target (1 HP + 1 Fatigue)
    if (isSuccess && spell.system.damageType === 'healing' && state.damageDice === 0) {
      await this._handleLifeRevive(spell, targetsAtRollTime);
    }

    // Create chat message
    await this._createSpellChatCard(
      spell,
      state,
      costs,
      roll,
      difficulty,
      isSuccess,
      isCritical,
      targetsAtRollTime
    );

    // ── Sequencer FX ──────────────────────────────────────────────────────────
    // actor.token returns a TokenDocument; Sequencer needs the Token placeable (.object).
    const casterToken = this.actor.token?.object ?? this.actor.getActiveTokens(true)[0];
    const liveTargets = Array.from(game.user.targets);
    VagabondSpellSequencer.play(spell, state.deliveryType, state.deliveryIncrease, casterToken, liveTargets);
    // ── End Sequencer FX ──────────────────────────────────────────────────────

    // Reset spell state (keep deliveryType, reset useFx to default)
    const defaultUseFx = spell?.system?.damageType === '-';
    const isHealingSpell = ['healing', 'recover', 'recharge'].includes(spell?.system?.damageType);
    this.spellStates[spellId] = {
      damageDice: isHealingSpell ? 0 : 1,
      deliveryType: state.deliveryType, // Keep last selected delivery
      deliveryIncrease: 0,
      useFx: defaultUseFx, // Reset to default based on spell type
    };
    this._saveSpellStates();
    this._updateSpellDisplay(spellId);
  }

  /**
   * Create chat card for spell cast
   * @param {Item} spell - The spell item
   * @param {Object} state - Spell state
   * @param {Object} costs - Cost breakdown
   * @param {Roll|null} roll - The roll result (null if noRollRequired)
   * @param {number} difficulty - Target difficulty
   * @param {boolean} isSuccess - Whether the cast succeeded
   * @param {boolean} isCritical - Whether the roll was a critical hit
   * @param {Array} targetsAtRollTime - Targets captured at cast time
   * @private
   */
  async _createSpellChatCard(
    spell,
    state,
    costs,
    roll,
    difficulty,
    isSuccess,
    isCritical,
    targetsAtRollTime = []
  ) {
    // Import damage helper
    const { VagabondDamageHelper } = await import('../../helpers/damage-helper.mjs');

    // Build delivery text with total area (e.g., "Cone 20'")
    const deliveryName = game.i18n.localize(CONFIG.VAGABOND.deliveryTypes[state.deliveryType]);
    const totalArea = this._getDeliveryTotalArea(state.deliveryType, state.deliveryIncrease);
    const deliveryText = totalArea ? `${deliveryName} ${totalArea}` : deliveryName;

    // Get the mana skill's stat for crit bonus damage
    const manaSkillKey = this.actor.system.classData?.manaSkill;
    const manaSkill = manaSkillKey ? this.actor.system.skills[manaSkillKey] : null;
    const manaSkillStat = manaSkill?.stat || 'reason'; // Fallback to reason if not found

    // Determine if we should auto-roll damage (skip if 0 dice = effect-only cast)
    let damageRoll = null;
    if (spell.system.damageType !== '-' && state.damageDice > 0) {
      if (VagabondDamageHelper.shouldRollDamage(isSuccess)) {
        damageRoll = await VagabondDamageHelper.rollSpellDamage(
          this.actor,
          spell,
          state,
          isCritical,
          manaSkillStat
        );
      }
    }

    // Build spell cast result object
    const spellCastResult = {
      roll,
      difficulty,
      isSuccess,
      isCritical,
      manaSkill,
      manaSkillKey,
      spellState: state,
      costs,
      deliveryText,
    };

    // Use universal chat card
    const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');
    await VagabondChatCard.spellCast(
      this.actor,
      spell,
      spellCastResult,
      damageRoll,
      targetsAtRollTime
    );
  }

  /**
   * Toggle spell favorite state
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async toggleSpellFavorite(event, target) {
    event.preventDefault();

    // Submit pending form changes before toggling spell favorite
    if (this.sheet.hasFrame) {
      try {
        await this.sheet.submit();
      } catch (err) {
        console.error('Vagabond | Error submitting form before spell favorite toggle:', err);
      }
    }

    const itemId = target.dataset.itemId;
    const spell = this.actor.items.get(itemId);

    if (!spell || spell.type !== 'spell') {
      ui.notifications.error('Spell not found!');
      return;
    }

    // Toggle favorite state
    const newState = !spell.system.favorite;
    await spell.update({ 'system.favorite': newState });
  }

  /**
   * Toggle Focus state for a spell (sustaining it)
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async toggleSpellFocus(event, target) {
    event.preventDefault();
    const spellId = target.dataset.spellId;
    const spell = this.actor.items.get(spellId);
    const current = this.actor.system.focus?.spellIds || [];
    const focusMax = this.actor.system.focus?.max ?? 5;

    const wasFocused = current.includes(spellId);
    let next;
    if (wasFocused) {
      next = current.filter(id => id !== spellId);
    } else {
      if (current.length >= focusMax) return;
      next = [...current, spellId];
    }

    await this.actor.update({ 'system.focus.spellIds': next });

    // Sync the "focusing" status effect with focus state
    const wasFocusing = current.length > 0;
    const isFocusing  = next.length > 0;
    if (isFocusing !== wasFocusing) {
      await this.actor.toggleStatusEffect('focusing', { active: isFocusing });
    }

    // Briar Healer: apply/remove +1 Armor and thorns AE on target when focusing Life
    if (this.actor.system.hasBriarHealer && spell?.name?.toLowerCase() === 'life') {
      await this._handleBriarHealer(wasFocused);
    }

    ui.combat?.render(false);
  }

  /**
   * Handle Briar Healer perk — apply/remove thorns AE on target when focusing Life
   * @param {boolean} wasActive - Whether the focus was previously active (toggling off)
   * @private
   */
  async _handleBriarHealer(wasActive) {
    if (wasActive) {
      // Un-focusing: remove Briar Healer AE from all actors
      for (const actor of game.actors) {
        const briarEffect = actor.effects.find(e => e.flags?.vagabond?.briarHealer);
        if (briarEffect) {
          await actor.deleteEmbeddedDocuments('ActiveEffect', [briarEffect.id]);
          ui.notifications.info(`Briar Healer thorns faded from ${actor.name}.`);
        }
      }
    } else {
      // Focusing: apply to currently targeted token
      const targets = Array.from(game.user.targets);
      if (targets.length === 0) {
        ui.notifications.warn('Target a token to apply Briar Healer thorns.');
        return;
      }

      for (const token of targets) {
        const targetActor = token.actor;
        if (!targetActor) continue;

        // Check if already has Briar Healer effect
        if (targetActor.effects.find(e => e.flags?.vagabond?.briarHealer)) continue;

        await targetActor.createEmbeddedDocuments('ActiveEffect', [{
          name: 'Briar Healer',
          img: 'icons/svg/heal.svg',
          disabled: false,
          changes: [{
            key: 'system.armorBonus',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: '1'
          }],
          description: 'Briar Healer: +1 Armor. Any Being that damages this target with a Melee Attack takes d6 damage.',
          flags: {
            vagabond: {
              briarHealer: true,
              briarHealerCasterId: this.actor.id
            }
          }
        }]);
        ui.notifications.info(`Briar Healer thorns surround ${targetActor.name}! (+1 Armor, d6 melee retaliation)`);
      }
    }
  }

  /**
   * Handle Life spell revive — restore a dead target to 1 HP and give 1 Fatigue.
   * Only works when the target has the Dead status condition.
   * @param {Item} spell - The spell being cast
   * @param {Array} targetsAtRollTime - Targets captured at cast time
   * @private
   */
  async _handleLifeRevive(spell, targetsAtRollTime) {
    // Resolve targets to actual tokens
    const { VagabondDamageHelper } = await import('../../helpers/damage-helper.mjs');
    const targetTokens = VagabondDamageHelper._resolveStoredTargets(targetsAtRollTime);

    if (targetTokens.length === 0) {
      // Fallback to live targets
      const liveTargets = Array.from(game.user.targets);
      for (const token of liveTargets) {
        targetTokens.push(token);
      }
    }

    if (targetTokens.length === 0) {
      ui.notifications.warn('No target selected for Life spell.');
      return;
    }

    const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');
    const revivedNames = [];

    for (const token of targetTokens) {
      const targetActor = token.actor;
      if (!targetActor) continue;

      // Only revive targets with Dead status
      if (!targetActor.statuses?.has('dead')) {
        ui.notifications.info(`${targetActor.name} is not dead — no effect.`);
        continue;
      }

      // Set HP to 1
      await targetActor.update({ 'system.health.value': 1 });

      // Remove Dead status (and Unconscious if present)
      if (targetActor.statuses.has('dead')) {
        await targetActor.toggleStatusEffect('dead', { active: false });
      }
      if (targetActor.statuses.has('unconscious')) {
        await targetActor.toggleStatusEffect('unconscious', { active: false });
      }

      // Add 1 Fatigue
      const currentFatigue = targetActor.system.fatigue ?? 0;
      await targetActor.update({ 'system.fatigue': currentFatigue + 1 });

      revivedNames.push(targetActor.name);
    }

    if (revivedNames.length > 0) {
      const card = new VagabondChatCard()
        .setType('generic')
        .setActor(this.actor)
        .setTitle('Life — Revive')
        .setSubtitle(this.actor.name)
        .setDescription(`
          <p><i class="fas fa-heart-pulse"></i> <strong>${revivedNames.join(', ')}</strong> ${revivedNames.length === 1 ? 'has' : 'have'} been revived!</p>
          <p>Restored to <strong>1 HP</strong> and gained <strong>1 Fatigue</strong>.</p>
        `);
      await card.send();
    }
  }

  /**
   * Toggle Fx (Effect) checkbox for a spell
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async toggleFx(event, target) {
    event.preventDefault();
    const spellId = target.dataset.spellId;
    const state = this._getSpellState(spellId);

    // Toggle Fx state
    state.useFx = !state.useFx;

    this._saveSpellStates();
    this._updateSpellDisplay(spellId);

    // Clear ALL previews (player is changing spell configuration)
    await this._clearAllPreviews();
  }

  /**
   * Toggle spell accordion in sliding panel
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   */
  async toggleSpellAccordion(event, target) {
    event.preventDefault();
    const accordion = target.closest('.favorited-spell.accordion-item');
    if (accordion) {
      const { AccordionHelper } = await import('../../helpers/accordion-helper.mjs');
      AccordionHelper.toggle(accordion);
    }
  }

  // ===========================
  // Setup Listeners
  // ===========================

  /**
   * Setup spell-related event listeners
   * Called during sheet render
   */
  setupListeners() {
    // Query for both spell rows (in spells tab) and favorited spells (in sliding panel)
    const spellRows = this.sheet.element.querySelectorAll('.spell-row[data-spell-id], .favorited-spell[data-spell-id]');

    spellRows.forEach((spellRow) => {
      const spellId = spellRow.dataset.spellId;

      // Initialize spell display with saved state
      this._updateSpellDisplay(spellId);

      // Delivery dropdown change
      const deliverySelect = spellRow.querySelector('.spell-delivery-select');
      if (deliverySelect) {
        deliverySelect.addEventListener('change', async (event) => {
          const state = this._getSpellState(spellId);
          state.deliveryType = event.target.value || null;
          state.deliveryIncrease = 0; // Reset increases when changing delivery
          this._saveSpellStates();
          this._updateSpellDisplay(spellId);

          // Clear ALL previews (player is changing spell configuration)
          await this._clearAllPreviews();
        });
      }

      // Damage dice: left-click increase, right-click decrease
      // Support both old selector (spells tab) and new selector (sliding panel)
      const damageElement = spellRow.querySelector('.spell-damage-dice, .spell-damage-dice-control, .spell-damage-trigger');
      if (damageElement) {
        damageElement.addEventListener('click', async (event) => {
          event.preventDefault();
          // Prevent triggering accordion toggle if it's the control or trigger container
          event.stopPropagation();

          const state = this._getSpellState(spellId);

          // When increasing from 0, turn off auto-Fx (damage is back)
          if (state.damageDice === 0) {
            state.useFx = false;
          }

          state.damageDice++;
          this._saveSpellStates();
          this._updateSpellDisplay(spellId);

          // Clear ALL previews (player is changing spell configuration)
          await this._clearAllPreviews();
        });

        damageElement.addEventListener('contextmenu', async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const state = this._getSpellState(spellId);
          if (state.damageDice > 0) {
            state.damageDice--;

            // Auto-activate Fx when damage reaches 0 (effect-only cast, no mana cost)
            if (state.damageDice === 0) {
              state.useFx = true;
            }

            this._saveSpellStates();
            this._updateSpellDisplay(spellId);

            // Clear ALL previews (player is changing spell configuration)
            await this._clearAllPreviews();
          }
        });
      }

      // Delivery cost: left-click increase, right-click decrease
      const deliveryCostElement = spellRow.querySelector('.spell-delivery-cost');
      if (deliveryCostElement) {
        deliveryCostElement.addEventListener('click', async (event) => {
          event.preventDefault();
          const state = this._getSpellState(spellId);

          if (!state.deliveryType) {
            ui.notifications.warn('Select a delivery type first!');
            return;
          }

          // Check if this delivery type supports increases
          if (CONFIG.VAGABOND.deliveryIncreaseCost[state.deliveryType] === 0) {
            return; // Ignore click if not increasable
          }

          state.deliveryIncrease++;
          this._saveSpellStates();
          this._updateSpellDisplay(spellId);

          // Update preview (don't clear, just update)
          await this._refreshSpellPreview(spellId);
        });

        deliveryCostElement.addEventListener('contextmenu', async (event) => {
          event.preventDefault();
          const state = this._getSpellState(spellId);

          if (!state.deliveryType) return;

          // Check if this delivery type supports increases
          if (CONFIG.VAGABOND.deliveryIncreaseCost[state.deliveryType] === 0) {
            return; // Ignore click if not increasable
          }

          if (state.deliveryIncrease > 0) {
            state.deliveryIncrease--;
            this._saveSpellStates();
            this._updateSpellDisplay(spellId);

            // Update preview (don't clear, just update)
            await this._refreshSpellPreview(spellId);
          }
        });
      }
    });
  }

  /**
   * Enrich spell data for rendering
   * @param {Object} context - The render context
   */
  async enrichSpellsContext(context) {
    // Import enrichment helper
    const { EnrichmentHelper } = await import('../../helpers/enrichment-helper.mjs');

    // Enrich spell descriptions
    await EnrichmentHelper.enrichSpells(context, this.actor);
  }
}
