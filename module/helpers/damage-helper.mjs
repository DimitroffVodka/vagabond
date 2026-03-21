/**
 * Universal Damage Helper
 * Handles damage rolling for weapons, spells, and any other damage sources
 */
export class VagabondDamageHelper {
  /**
   * Manually explode dice on specific values (recursive)
   * This bypasses Foundry's potentially buggy x=1x=4 syntax
   *
   * ✅ CANONICAL VERSION: This is the main implementation.
   * ⚠️ DUPLICATE EXISTS in module/documents/item.mjs - should be consolidated to use this version.
   *
   * @param {Roll} roll - The evaluated roll to explode
   * @param {Array<number>} explodeValues - Values that should trigger explosions (e.g., [1, 4])
   * @param {number} maxExplosions - Safety limit to prevent infinite loops (default 100)
   * @returns {Promise<Roll>} The modified roll with explosions applied
   * @private
   */
  static async _manuallyExplodeDice(roll, explodeValues, maxExplosions = 100) {
    if (!explodeValues || explodeValues.length === 0) {
      return roll;
    }

    // Convert explode values to numbers
    const explodeSet = new Set(explodeValues.map(v => parseInt(v)));
    let explosionCount = 0;

    // Find all Die terms in the roll
    for (let i = 0; i < roll.terms.length; i++) {
      const term = roll.terms[i];

      // Skip non-die terms (operators, numbers, etc.)
      if (term.constructor.name !== 'Die') continue;

      const faces = term.faces;
      const results = term.results || [];

      // Process each result in this die term
      // We need to track the original length because we'll be adding results
      const originalLength = results.length;

      for (let j = 0; j < originalLength; j++) {
        const result = results[j];

        // Check if this result should explode
        if (explodeSet.has(result.result)) {
          // Mark this die as exploded (it's causing an explosion)
          result.exploded = true;

          // Roll new dice recursively
          let previousResult = result;
          let newRoll = result.result;

          while (explodeSet.has(newRoll) && explosionCount < maxExplosions) {
            explosionCount++;

            // Roll another die of the same size
            const explosionRoll = Math.floor(Math.random() * faces) + 1;

            // Check if this new roll will also explode
            const willExplode = explodeSet.has(explosionRoll);

            // Add the explosion as a new result
            const newResult = {
              result: explosionRoll,
              active: true,
              exploded: willExplode  // Only mark as exploded if it will cause another explosion
            };
            results.push(newResult);

            // Update for next iteration
            previousResult = newResult;
            newRoll = explosionRoll;
          }
        }
      }

      // Recalculate the term's total
      term._total = results.reduce((sum, r) => sum + (r.active ? r.result : 0), 0);
    }

    // Recalculate the roll's total
    roll._total = roll._evaluateTotal();

    return roll;
  }

  /**
   * Get targets from button dataset with multi-tier fallback
   * @param {HTMLElement} button - The button element
   * @param {ChatMessage} message - The chat message (optional)
   * @returns {Array} Array of target data objects
   * @private
   */
  static _getTargetsFromButton(button, message = null) {
    // Tier 1: Button dataset (primary source)
    if (button.dataset.targets) {
      try {
        const stored = JSON.parse(button.dataset.targets.replace(/&quot;/g, '"'));
        if (stored && stored.length > 0) {
          return stored;
        }
      } catch (e) {
        console.warn('VagabondDamageHelper | Failed to parse button targets', e);
      }
    }

    // Tier 2: Message flags (fallback for old buttons)
    if (message?.flags?.vagabond?.targetsAtRollTime) {
      const flagTargets = message.flags.vagabond.targetsAtRollTime;
      if (flagTargets && flagTargets.length > 0) {
        return flagTargets;
      }
    }

    // Tier 3: Current game.user.targets (backward compatibility)
    const currentTargets = Array.from(game.user.targets).map(token => ({
      tokenId: token.id,
      sceneId: token.scene.id,
      actorId: token.actor?.id,
      actorName: token.name,
      actorImg: token.document.texture.src
    }));

    return currentTargets;
  }

  /**
   * Resolve stored target data to actual token references
   * @param {Array} storedTargets - Array of target objects
   * @returns {Array} Array of resolved Token documents
   * @private
   */
  static _resolveStoredTargets(storedTargets) {
    const resolved = [];

    for (const targetData of storedTargets) {
      // Cross-scene check
      if (targetData.sceneId !== canvas.scene?.id) {
        ui.notifications.warn(`${targetData.actorName} is on a different scene - skipping`);
        continue;
      }

      // Find token on current scene
      const token = canvas.tokens.get(targetData.tokenId);
      if (!token) {
        ui.notifications.warn(`Token for ${targetData.actorName} not found - may have been deleted`);
        continue;
      }

      resolved.push(token);
    }

    return resolved;
  }

  /**
   * Determine if damage should be rolled based on game settings
   * @param {boolean} isHit - Whether the attack/check was successful
   * @returns {boolean} - Whether to roll damage
   */
  static shouldRollDamage(isHit) {
    const rollWithCheck = game.settings.get('vagabond', 'rollDamageWithCheck');

    // If not rolling with check, never auto-roll (manual button only)
    if (!rollWithCheck) return false;

    const alwaysRoll = game.settings.get('vagabond', 'alwaysRollDamage');

    // If always roll is enabled, roll regardless of hit/miss
    if (alwaysRoll) return true;

    // Otherwise, only roll on hit
    return isHit;
  }

  /**
   * Create a damage roll button for chat cards
   * @param {string} actorId - Actor UUID
   * @param {string} itemId - Item UUID (if applicable)
   * @param {string} damageFormula - Damage formula to roll
   * @param {Object} context - Additional context for the damage roll
   * @returns {string} HTML button string
   */
  static createDamageButton(actorId, itemId, damageFormula, context = {}, targetsAtRollTime = []) {
    const contextJson = JSON.stringify(context).replace(/"/g, '&quot;');
    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    return `
      <button
        class="vagabond-damage-button"
        data-vagabond-button="true"
        data-actor-id="${actorId}"
        data-item-id="${itemId || ''}"
        data-damage-formula="${damageFormula}"
        data-context="${contextJson}"
        data-targets="${targetsJson}"
      >
        <i class="fas fa-dice"></i> Roll Damage
      </button>
    `;
  }

  /**
   * Roll damage from a chat message button and update the card in-place
   * @param {HTMLElement} button - The clicked button element
   * @param {string} messageId - The chat message ID
   */
  static async rollDamageFromButton(button, messageId) {
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const damageFormula = button.dataset.damageFormula;
    const context = JSON.parse(button.dataset.context.replace(/&quot;/g, '"'));

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found!');
      return;
    }

    // Security check: only owner or GM can roll
    if (!actor.isOwner && !game.user.isGM) {
      ui.notifications.warn("You don't have permission to roll damage for this actor.");
      return;
    }

    let item = null;
    if (itemId) {
      item = actor.items.get(itemId);
    }

    // Get roll data WITH item effects applied (important for on-use effects)
    const rollData = item ? actor.getRollDataWithItemEffects(item) : actor.getRollData();

    // Add stat bonus on critical hit (positive or negative)
    let finalFormula = damageFormula;
    if (context.isCritical && context.statKey) {
      // Use roll data (includes item effects) instead of actor.system directly
      const statValue = rollData.stats?.[context.statKey]?.value || 0;
      if (statValue !== 0) {  // ✅ FIX: Include negative stats too (they reduce damage)
        finalFormula += ` + ${statValue}`;
      }
    }

    // Brutal: add extra damage dice on crit, matching the weapon's die size
    if (context.isCritical && item?.system?.properties?.includes('Brutal')) {
      const brutalMaxDice = actor.system.brutalMaxDice ?? 1;
      const dieMatch = finalFormula.match(/d(\d+)/);
      if (dieMatch) finalFormula += ` + ${brutalMaxDice}d${dieMatch[1]}`;
    }

    // Determine item type and apply appropriate separated bonuses
    let equipmentType = null;
    if (item) {
      // For equipment items, check equipmentType field
      if (item.system.equipmentType) {
        equipmentType = item.system.equipmentType;
      }
      // For spell items
      else if (item.type === 'spell') {
        equipmentType = 'spell';
      }
    } else if (context.type) {
      // Fallback to context type if item not available
      equipmentType = context.type;
    }

    // Apply type-specific universal damage bonuses
    let typeFlatBonus = 0;
    let typeDiceBonus = '';

    if (equipmentType === 'weapon') {
      typeFlatBonus = actor.system.universalWeaponDamageBonus || 0;
      typeDiceBonus = actor.system.universalWeaponDamageDice || '';
    } else if (equipmentType === 'spell') {
      typeFlatBonus = actor.system.universalSpellDamageBonus || 0;
      typeDiceBonus = actor.system.universalSpellDamageDice || '';
    } else if (equipmentType === 'alchemical') {
      typeFlatBonus = actor.system.universalAlchemicalDamageBonus || 0;
      typeDiceBonus = actor.system.universalAlchemicalDamageDice || '';
    }

    // Safety check: ensure it's a string
    if (Array.isArray(typeDiceBonus)) {
      typeDiceBonus = typeDiceBonus.filter(d => !!d).join(' + ');
    }

    if (typeFlatBonus !== 0) {
      finalFormula += ` + ${typeFlatBonus}`;
    }
    if (typeof typeDiceBonus === 'string' && typeDiceBonus.trim() !== '') {
      finalFormula += ` + ${typeDiceBonus}`;
    }

    // Add legacy universal damage bonuses (backward compatibility)
    const universalFlatBonus = actor.system.universalDamageBonus || 0;
    let universalDiceBonus = actor.system.universalDamageDice || '';

    // Safety check: ensure it's a string
    if (Array.isArray(universalDiceBonus)) {
      universalDiceBonus = universalDiceBonus.filter(d => !!d).join(' + ');
    }

    if (universalFlatBonus !== 0) {
      finalFormula += ` + ${universalFlatBonus}`;
    }
    if (typeof universalDiceBonus === 'string' && universalDiceBonus.trim() !== '') {
      finalFormula += ` + ${universalDiceBonus}`;
    }

    // Rage: while Berserk + Light/No Armor, upsize damage dice and enable exploding
    let rageActive = false;
    const isBerserk = actor.statuses?.has('berserk');
    if (isBerserk) {
      const equippedArmor = actor.items.find(i => {
        const isArmor = (i.type === 'armor') ||
                       (i.type === 'equipment' && i.system.equipmentType === 'armor');
        return isArmor && i.system.equipped;
      });
      const armorType = equippedArmor?.system?.armorType;
      if (!equippedArmor || armorType === 'light') {
        // Die upsizing: step up the die ladder (d4->d6->d8->d10->d12)
        const dieLadder = [4, 6, 8, 10, 12];
        finalFormula = finalFormula.replace(/(\d*)d(\d+)/g, (match, count, size) => {
          const currentSize = parseInt(size);
          const ladderIdx = dieLadder.indexOf(currentSize);
          const newSize = ladderIdx >= 0 && ladderIdx < dieLadder.length - 1
            ? dieLadder[ladderIdx + 1]
            : currentSize + 2;
          return `${count}d${newSize}`;
        });
        rageActive = true;

        // Rip and Tear: +1 bonus per damage die dealt
        const classItem = actor.items.find(i => i.type === 'class');
        const actorLevel = actor.system.attributes?.level?.value || 1;
        const hasRipAndTear = classItem ? (classItem.system.levelFeatures || []).some(f =>
          (f.level || 99) <= actorLevel && (f.name || '').toLowerCase().includes('rip and tear')
        ) : false;
        if (hasRipAndTear) {
          const dieMatch = finalFormula.match(/(\d*)d\d+/);
          const dieCount = parseInt(dieMatch?.[1] || '1') || 1;
          finalFormula += ` + ${dieCount}`;
        }
      }
    }

    // Sneak Attack: add extra d4s on Favored attacks (deferred damage path)
    let sneakAttackApplied = 0;
    const sneakDice = actor.system.sneakAttackDice || 0;
    const isFavored = (context.favorHinder || 'none') === 'favor';
    if (sneakDice > 0 && isFavored) {
      const hasLethal = actor.system.hasLethalWeapon || false;
      const combat = game.combat;
      const currentRound = combat?.round || 0;
      const lastSneakRound = actor.getFlag('vagabond', 'lastSneakAttackRound') || 0;
      const noCombatActive = !combat || currentRound === 0;

      if (hasLethal || noCombatActive || lastSneakRound !== currentRound) {
        finalFormula += ` + ${sneakDice}d4`;
        sneakAttackApplied = sneakDice;
        if (!hasLethal && !noCombatActive) {
          await actor.setFlag('vagabond', 'lastSneakAttackRound', currentRound);
        }
      }
    }

    // Roll damage (without explosion modifiers in formula)
    const damageRoll = new Roll(finalFormula, actor.getRollData());
    await damageRoll.evaluate();

    // Attach sneak attack info to the roll for downstream use
    damageRoll.sneakAttackDice = sneakAttackApplied;

    // Apply manual explosions if item supports it
    let itemExploded = false;
    if (item) {
      const explodeValues = this._getExplodeValues(item, actor);
      if (explodeValues) {
        await this._manuallyExplodeDice(damageRoll, explodeValues);
        itemExploded = true;
      }
    }

    // Rage exploding: explode on max face value if no other explosion applied
    if (rageActive && !itemExploded) {
      const rageFaces = [];
      for (const term of damageRoll.terms) {
        if (term.constructor.name === 'Die') rageFaces.push(term.faces);
      }
      if (rageFaces.length > 0) {
        await this._manuallyExplodeDice(damageRoll, rageFaces);
      }
    }

    // Attach rage info to the roll
    damageRoll.rageActive = rageActive;

    // Determine damage type
    let damageTypeLabel = 'Physical';

    // For weapons, get damage type from context first, then item
    if (context.type === 'weapon') {
      // Check context first (from button creation)
      let damageTypeKey = context.damageType;

      // Fallback to item damage type if context doesn't have it
      if ((!damageTypeKey || damageTypeKey === '-') && item) {
        // For weapons, use currentDamageType (based on current grip)
        damageTypeKey = item.system.currentDamageType || item.system.damageType;
      }

      if (damageTypeKey && damageTypeKey !== '-') {
        damageTypeLabel = game.i18n.localize(CONFIG.VAGABOND.damageTypes[damageTypeKey]) || damageTypeKey;
      }
    }
    // For spells, get damage type from context
    else if (context.type === 'spell' && context.damageType) {
      const damageTypeKey = context.damageType;
      if (damageTypeKey && damageTypeKey !== '-') {
        damageTypeLabel = game.i18n.localize(CONFIG.VAGABOND.damageTypes[damageTypeKey]) || damageTypeKey;
      }
    }

    // Get the damage type key for icon lookup (from context, which stores the key)
    const finalDamageTypeKey = context.damageType || null;

    // Get attack type from context (defaults to 'melee' if not provided)
    const attackType = context.attackType || 'melee';

    // Post a SEPARATE damage message instead of updating the attack card
    // This prevents double-rolling issues and matches the save result flow
    await this.postDamageResult(damageRoll, damageTypeLabel, context.isCritical, actor, item, finalDamageTypeKey, attackType);
  }

  /**
   * Post a separate damage result message with save buttons
   * Uses existing createActionCard() to avoid code duplication
   */
  static async postDamageResult(damageRoll, damageType, isCritical, actor, item, damageTypeKey = null, attackType = 'melee') {
    const { VagabondChatCard } = await import('./chat-card.mjs');

    return await VagabondChatCard.createActionCard({
      actor,
      item,
      title: `${item?.name || 'Attack'} Damage`,
      damageRoll,
      damageType: damageTypeKey || damageType,
      hasDefenses: !this.isRestorativeDamageType(damageTypeKey || damageType),
      attackType,
      rollData: isCritical ? { isCritical: true } : null
    });
  }

  /**
   * Render the Block/Dodge info section as an accordion
   * @param {string} attackType - 'melee' or 'ranged' or 'cast'
   * @returns {string} HTML string
   * @private
   */
  static _renderDefendInfoSection(attackType) {
    const isRanged = (attackType === 'ranged' || attackType === 'cast');
    const hinderedTag = isRanged ? '<span class="hindered-tag"><i class="fas fa-exclamation-triangle"></i> Hindered</span>' : '';

    return `
      <div class='card-defend-info'>
        <div class='defend-info-header' data-action='toggleDefendInfo'>
          <i class='fas fa-shield-alt'></i>
          <strong>Defending Options</strong>
          <i class='fas fa-chevron-right expand-icon'></i>
        </div>
        <div class='defend-info-details'>
          <div class='defend-info-row'>
            <div class='defend-option defend-dodge'>
              <div class='defend-title'>
                <i class='fas fa-running'></i>
                <strong>Dodge (Reflex):</strong>
                <span class='armor-hinder-note'>(Hindered if Heavy Armor)</span>
              </div>
              <p>Roll Reflex save. Success ignores one highest damage die.</p>
            </div>
            <div class='defend-option defend-block'>
              <div class='defend-title'>
                <i class='fas fa-shield-alt'></i>
                <strong>Block (Endure):</strong>
                ${hinderedTag}
              </div>
              <p>Roll Endure save. Success ignores one highest damage die.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get explosion values from an item if enabled
   * Checks both item properties AND actor global explode bonuses
   *
   * @param {Item} item - The item (spell or equipment) with canExplode and explodeValues
   * @param {Actor} actor - Optional actor for global explode bonuses
   * @returns {Array<number>|null} Array of values to explode on, or null if not enabled
   * @private
   */
  static _getExplodeValues(item, actor = null) {
    // 1. Get Local Item Settings
    let canExplode = item?.system?.canExplode;
    let explodeValuesStr = item?.system?.explodeValues;

    // 2. Check Global Actor Bonuses (from Perks/Traits Active Effects)
    if (actor) {
      // If a global effect says "Explode All", treat canExplode as true
      if (actor.system.bonuses?.globalExplode) {
        canExplode = true;
      }

      // If a global effect provides specific values (e.g. "1,2"), use those
      // You can decide if this overrides or appends. Here we override if present.
      const globalValues = actor.system.bonuses?.globalExplodeValues;
      if (globalValues) {
        explodeValuesStr = globalValues;
      }
    }

    // 3. Validation
    if (!canExplode || !explodeValuesStr) {
      return null;
    }

    // Parse explode values (comma-separated)
    const explodeValues = explodeValuesStr
      .split(',')
      .map(v => v.trim())
      .filter(v => v && !isNaN(v))
      .map(v => parseInt(v));

    return explodeValues.length > 0 ? explodeValues : null;
  }

  /**
   * Roll spell damage
   * @param {Actor} actor - The actor casting the spell
   * @param {Item} spell - The spell item
   * @param {Object} spellState - Spell state (damageDice, deliveryType, etc.)
   * @param {boolean} isCritical - Whether this was a critical hit
   * @param {string} statKey - The stat used for the cast (for crit bonus)
   * @returns {Roll} The damage roll (or null if no damage dice)
   */
  static async rollSpellDamage(actor, spell, spellState, isCritical = false, statKey = null) {
    // Allow typeless damage ("-") - only skip if there are no damage dice at all
    if (!spellState.damageDice || spellState.damageDice <= 0) return null;

    // Determine die size: base (spell override or default 6) + actor bonus
    const baseDieSize = spell.system.damageDieSize || 6;
    const dieSize = baseDieSize + (actor.system.spellDamageDieSizeBonus || 0);
    let damageFormula = `${spellState.damageDice}d${dieSize}`;

    // Add stat bonus on critical hit (positive or negative)
    if (isCritical && statKey) {
      const statValue = actor.system.stats[statKey]?.value || 0;
      if (statValue !== 0) {  // ✅ FIX: Include negative stats too (they reduce damage)
        damageFormula += ` + ${statValue}`;
      }
    }

    // Add spell-specific universal damage bonuses (new separated system)
    const spellFlatBonus = actor.system.universalSpellDamageBonus || 0;
    let spellDiceBonus = actor.system.universalSpellDamageDice || '';
    
    // Safety check: ensure it's a string (may be array if derived data failed to join)
    if (Array.isArray(spellDiceBonus)) {
      spellDiceBonus = spellDiceBonus.filter(d => !!d).join(' + ');
    }

    if (spellFlatBonus !== 0) {
      damageFormula += ` + ${spellFlatBonus}`;
    }
    if (typeof spellDiceBonus === 'string' && spellDiceBonus.trim() !== '') {
      damageFormula += ` + ${spellDiceBonus}`;
    }

    // Add legacy universal damage bonuses (backward compatibility)
    const universalFlatBonus = actor.system.universalDamageBonus || 0;
    let universalDiceBonus = actor.system.universalDamageDice || '';

    // Safety check: ensure it's a string
    if (Array.isArray(universalDiceBonus)) {
      universalDiceBonus = universalDiceBonus.filter(d => !!d).join(' + ');
    }

    if (universalFlatBonus !== 0) {
      damageFormula += ` + ${universalFlatBonus}`;
    }
    if (typeof universalDiceBonus === 'string' && universalDiceBonus.trim() !== '') {
      damageFormula += ` + ${universalDiceBonus}`;
    }

    // Roll damage (without explosion modifiers in formula)
    const roll = new Roll(damageFormula, actor.getRollData());
    await roll.evaluate();

    // Apply manual explosions if enabled
    const explodeValues = this._getExplodeValues(spell, actor);
    if (explodeValues) {
      await this._manuallyExplodeDice(roll, explodeValues);
    }

    return roll;
  }

  /**
   * Create a GM-only NPC damage button (flat or roll)
   * @param {string} actorId - NPC actor ID
   * @param {number} actionIndex - Index of the action in the actions array
   * @param {string} damageValue - Flat damage value or roll formula
   * @param {string} damageMode - 'flat' or 'roll'
   * @param {string} damageType - Type of damage
   * @param {string} damageTypeLabel - Localized damage type label
   * @param {string} attackType - Attack type ('melee', 'ranged', 'cast')
   * @returns {string} HTML button string
   */
  static createNPCDamageButton(actorId, actionIndex, damageValue, damageMode, damageType, damageTypeLabel, attackType = 'melee', targetsAtRollTime = []) {
    const isFlat = damageMode === 'flat';
    const icon = isFlat ? 'fa-hashtag' : 'fa-dice-d20';
    const label = isFlat ? `Apply ${damageValue} Damage` : `Roll ${damageValue} Damage`;
    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    return `
      <button
        class="vagabond-npc-damage-button gm-only"
        data-actor-id="${actorId}"
        data-action-index="${actionIndex}"
        data-damage-value="${damageValue}"
        data-damage-mode="${damageMode}"
        data-damage-type="${damageType}"
        data-damage-type-label="${damageTypeLabel}"
        data-attack-type="${attackType}"
        data-targets="${targetsJson}"
      >
        <i class="fas ${icon}"></i> ${label}
      </button>
    `;
  }

  /**
   * Create a damage button for item usage (healing potions, bombs, etc)
   * @param {string} actorId - Actor ID using the item
   * @param {string} itemId - Item ID being used
   * @param {string} damageAmount - Damage formula or flat amount
   * @param {string} damageType - Damage type key
   * @param {string} damageTypeLabel - Localized damage type label
   * @param {string} attackType - Attack type ('melee', 'ranged', 'none')
   * @param {Array} targetsAtRollTime - Targets captured at use time
   * @returns {string} HTML button string
   */
  static createItemDamageButton(actorId, itemId, damageAmount, damageType, damageTypeLabel, attackType = 'melee', targetsAtRollTime = []) {
    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    // Check if it's a restorative effect
    const isRestorative = ['healing', 'recover', 'recharge'].includes(damageType);

    // Determine icon and label
    let icon, label;
    if (isRestorative) {
      if (damageType === 'healing') {
        icon = 'fa-heart';
        label = `Apply ${damageAmount} Healing`;
      } else if (damageType === 'recover') {
        icon = 'fa-spa';
        label = `Recover ${damageAmount} Fatigue`;
      } else {
        icon = 'fa-bolt';
        label = `Recharge ${damageAmount} Mana`;
      }
    } else {
      // Check if it's a formula or flat damage
      const isFormula = /d\d+/i.test(damageAmount);
      icon = isFormula ? 'fa-dice-d20' : 'fa-hashtag';
      label = isFormula ? `Roll ${damageAmount} Damage` : `Apply ${damageAmount} Damage`;
    }

    return `
      <button
        class="vagabond-item-damage-button"
        data-actor-id="${actorId}"
        data-item-id="${itemId}"
        data-damage-amount="${damageAmount}"
        data-damage-type="${damageType}"
        data-damage-type-label="${damageTypeLabel}"
        data-attack-type="${attackType}"
        data-targets="${targetsJson}"
      >
        <i class="fas ${icon}"></i> ${label}
      </button>
    `;
  }

  /**
   * Handle item damage button click
   * @param {HTMLElement} button - The clicked button element
   * @param {string} messageId - The chat message ID
   */
  static async handleItemDamageButton(button, messageId) {
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const damageAmount = button.dataset.damageAmount;
    const damageType = button.dataset.damageType;
    const damageTypeLabel = button.dataset.damageTypeLabel || damageType;
    const attackType = button.dataset.attackType || 'melee';

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found!');
      return;
    }

    const item = actor.items.get(itemId);
    if (!item) {
      ui.notifications.error('Item not found!');
      return;
    }

    // Get targets from button (captured at item use time)
    const targetsAtRollTime = this._getTargetsFromButton(button);

    // Check if it's a formula or flat value
    const isFormula = /d\d+/i.test(damageAmount);
    let damageRoll;
    let finalDamage;

    if (isFormula) {
      // Roll damage
      damageRoll = new Roll(damageAmount, actor.getRollData());
      await damageRoll.evaluate();
      finalDamage = damageRoll.total;
    } else {
      // Flat damage/healing
      finalDamage = parseInt(damageAmount);
      damageRoll = null;
    }

    // Check if it's restorative or harmful
    const isRestorative = ['healing', 'recover', 'recharge'].includes(damageType);

    if (isRestorative) {
      // Post restorative effect message
      await this.postItemRestorativeEffect(
        damageRoll,
        finalDamage,
        damageTypeLabel,
        actor,
        item,
        damageType,
        targetsAtRollTime
      );
    } else {
      // Post damage message with save buttons
      await this.postItemDamage(
        damageRoll,
        finalDamage,
        damageTypeLabel,
        actor,
        item,
        damageType,
        attackType,
        targetsAtRollTime
      );
    }
  }

  /**
   * Post a new chat message with item damage
   * @param {Roll} damageRoll - The damage roll (or null for flat damage)
   * @param {number} finalDamage - The final damage amount
   * @param {string} damageTypeLabel - Localized damage type label
   * @param {Actor} actor - The actor using the item
   * @param {Item} item - The item being used
   * @param {string} damageTypeKey - The damage type key for icon lookup
   * @param {string} attackType - The attack type ('melee', 'ranged', 'none')
   * @param {Array} targetsAtRollTime - Targets captured at use time
   */
  static async postItemDamage(damageRoll, finalDamage, damageTypeLabel, actor, item, damageTypeKey = 'physical', attackType = 'melee', targetsAtRollTime = []) {
    // Dynamic Import to avoid circular dependency issues
    const { VagabondChatCard } = await import('./chat-card.mjs');

    // Handle Flat Damage - create dummy Roll object
    let rollObj = damageRoll;
    if (!rollObj) {
      rollObj = new Roll(`${finalDamage}`);
      await rollObj.evaluate();
    }

    // Create damage card with save buttons
    await VagabondChatCard.createActionCard({
      actor: actor,
      item: item,
      title: `${item.name} Damage`,
      subtitle: actor.name,
      damageRoll: rollObj,
      damageType: damageTypeKey,
      attackType: attackType,
      hasDefenses: true,
      targetsAtRollTime
    });
  }

  /**
   * Post a new chat message with item restorative effect (healing/recover/recharge)
   * @param {Roll} damageRoll - The healing/recovery roll (or null for flat amount)
   * @param {number} finalAmount - The final healing/recovery amount
   * @param {string} damageTypeLabel - Localized effect type label
   * @param {Actor} actor - The actor using the item
   * @param {Item} item - The item being used
   * @param {string} damageTypeKey - The effect type key ('healing', 'recover', 'recharge')
   * @param {Array} targetsAtRollTime - Targets captured at use time
   */
  static async postItemRestorativeEffect(damageRoll, finalAmount, damageTypeLabel, actor, item, damageTypeKey = 'healing', targetsAtRollTime = []) {
    // Dynamic Import to avoid circular dependency issues
    const { VagabondChatCard } = await import('./chat-card.mjs');

    // Handle Flat amount - create dummy Roll object
    let rollObj = damageRoll;
    if (!rollObj) {
      rollObj = new Roll(`${finalAmount}`);
      await rollObj.evaluate();
    }

    // Create restorative effect card with apply button
    await VagabondChatCard.createActionCard({
      actor: actor,
      item: item,
      title: item.name,
      subtitle: actor.name,
      damageRoll: rollObj,
      damageType: damageTypeKey,
      attackType: 'none',
      hasDefenses: false,
      targetsAtRollTime
    });
  }

  /**
   * Handle NPC damage button click (GM reveals damage to players)
   * @param {HTMLElement} button - The clicked button element
   * @param {string} messageId - The chat message ID
   */
  static async handleNPCDamageButton(button, messageId) {
    const actorId = button.dataset.actorId;
    const actionIndex = parseInt(button.dataset.actionIndex);
    const damageValue = button.dataset.damageValue;
    const damageMode = button.dataset.damageMode;
    const damageType = button.dataset.damageType;
    const damageTypeLabel = button.dataset.damageTypeLabel || damageType;
    const attackType = button.dataset.attackType || 'melee';

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('NPC not found!');
      return;
    }

    const action = actor.system.actions[actionIndex] ?? actor.system.abilities?.[actionIndex];
    if (!action) {
      ui.notifications.error('Action not found!');
      return;
    }

    // Get targets from button (captured at action roll time)
    const targetsAtRollTime = this._getTargetsFromButton(button);

    let damageRoll;
    let finalDamage;

    if (damageMode === 'flat') {
      // Flat damage - just use the value directly
      finalDamage = parseInt(damageValue);
      damageRoll = null;
    } else {
      // Roll damage
      damageRoll = new Roll(damageValue, actor.getRollData());
      await damageRoll.evaluate();
      finalDamage = damageRoll.total;
    }

    // Post a new damage message instead of updating the original
    await this.postNPCActionDamage(
      damageRoll,
      finalDamage,
      damageTypeLabel,
      actor,
      action,
      damageType,
      attackType,
      targetsAtRollTime,
      actionIndex
    );
  }

  /**
   * Post a new chat message with NPC action damage
   * @param {Roll} damageRoll - The damage roll (or null for flat damage)
   * @param {number} finalDamage - The final damage amount
   * @param {string} damageTypeLabel - Localized damage type label
   * @param {Actor} actor - The NPC actor
   * @param {Object} action - The action object
   * @param {string} damageTypeKey - The damage type key for icon lookup (optional)
   * @param {string} attackType - The attack type ('melee', 'ranged', 'cast')
   */

    static async postNPCActionDamage(damageRoll, finalDamage, damageTypeLabel, actor, action, damageTypeKey = null, attackType = 'melee', targetsAtRollTime = [], actionIndex = null) {
      // 1. Dynamic Import to avoid circular dependency issues
      const { VagabondChatCard } = await import('./chat-card.mjs');

      // 2. Handle Flat Damage
      // The builder expects a Roll object to extract the total and formula.
      // If this is flat damage (damageRoll is null), we create a dummy Roll object.
      let rollObj = damageRoll;
      if (!rollObj) {
          // Create a roll that is just the number (e.g., "10")
          rollObj = new Roll(`${finalDamage}`);
          await rollObj.evaluate();
      }

      // 3. Delegate to the Master Builder
      // This ensures NPC damage cards use the exact same template (.vagabond-chat-card-v2) as Players.
      await VagabondChatCard.createActionCard({
          actor: actor,
          title: `${action.name} Damage`,
          subtitle: actor.name,
          damageRoll: rollObj,
          damageType: damageTypeKey || 'physical',
          attackType: attackType,
          hasDefenses: !this.isRestorativeDamageType(damageTypeKey || 'physical'),
          targetsAtRollTime,
          actionIndex,
      });
    }

  /**
   * Render damage HTML using the template partial
   * @param {Roll} damageRoll - The damage roll (or null for flat damage)
   * @param {string} damageType - Type of damage (localized label)
   * @param {boolean} isCritical - Whether this is critical damage
   * @param {string} damageTypeKey - The damage type key for icon lookup (optional)
   * @param {number} flatDamage - Flat damage amount (for NPC actions, when damageRoll is null)
   * @returns {Promise<string>} Rendered HTML
   * @private
   */
  static async _renderDamagePartial(damageRoll, damageType, isCritical = false, damageTypeKey = null, flatDamage = null) {
    // Import VagabondChatCard for dice formatting
    const { VagabondChatCard } = await import('./chat-card.mjs');

    // Prepare damage data for template
    const damageData = {
      damage: {
        total: damageRoll ? damageRoll.total : flatDamage,
        type: damageType,
        typeKey: damageTypeKey,
        iconClass: null,
        isCritical: isCritical,
        diceDisplay: null,
        formula: damageRoll ? damageRoll.formula : null
      }
    };

    // Look up the damage type icon (skip for typeless "-" damage)
    if (damageTypeKey && damageTypeKey !== '-' && CONFIG.VAGABOND?.damageTypeIcons?.[damageTypeKey]) {
      damageData.damage.iconClass = CONFIG.VAGABOND.damageTypeIcons[damageTypeKey];
    }

    // Format dice display if rolling
    if (damageRoll) {
      damageData.damage.diceDisplay = VagabondChatCard.formatRollWithDice(damageRoll);
    }

    // Render the damage partial template
    const templatePath = 'systems/vagabond/templates/chat/damage-display.hbs';
    return await foundry.applications.handlebars.renderTemplate(templatePath, damageData);
  }

  /**
   * Check if a damage type is restorative (healing, recover, recharge)
   * @param {string} damageType - The damage type to check
   * @returns {boolean}
   */
  static isRestorativeDamageType(damageType) {
    const normalizedType = damageType?.toLowerCase() || '';
    return normalizedType === 'healing' || normalizedType === 'recover' || normalizedType === 'recharge';
  }

  /**
   * Create an "Apply Damage" button
   * @param {number} damageAmount - The amount of damage
   * @param {string} damageType - Type of damage (or healing/recover/recharge)
   * @param {string} actorId - Source actor ID
   * @param {string} itemId - Item ID (optional)
   * @returns {string} HTML button string
   */
  static createApplyDamageButton(damageAmount, damageType, actorId, itemId = null, targetsAtRollTime = [], actionIndex = null) {
    // Check damage type and set appropriate button style
    const normalizedType = damageType.toLowerCase();
    let icon, text, buttonClass;

    if (normalizedType === 'healing') {
      icon = 'fa-heart-pulse';
      text = `Apply ${damageAmount} Healing`;
      buttonClass = 'vagabond-apply-healing-button';
    } else if (normalizedType === 'recover') {
      icon = 'fa-arrows-rotate';
      text = `Recover ${damageAmount} Fatigue`;
      buttonClass = 'vagabond-apply-recover-button';
    } else if (normalizedType === 'recharge') {
      icon = 'fa-bolt';
      text = `Restore ${damageAmount} Mana`;
      buttonClass = 'vagabond-apply-recharge-button';
    } else {
      icon = 'fa-heart-crack';
      text = `Apply ${damageAmount} Damage`;
      buttonClass = 'vagabond-apply-damage-button';
    }

    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    return `
      <button
        class="${buttonClass}"
        data-damage-amount="${damageAmount}"
        data-damage-type="${damageType}"
        data-actor-id="${actorId}"
        data-item-id="${itemId || ''}"
        data-action-index="${actionIndex ?? ''}"
        data-targets="${targetsJson}"
      >
        <i class="fas ${icon}"></i> ${text}
      </button>
    `;
  }

  /**
   * Create "Apply to Target" button for save result cards
   * @param {string} actorId - The actor who rolled the save (damage applies to them)
   * @param {string} actorName - The actor's name for display
   * @param {number} finalDamage - Final damage amount (after save/armor/immunities)
   * @param {string} damageType - Type of damage
   * @returns {string} HTML button string
   */
  static createApplySaveDamageButton(actorId, actorName, finalDamage, damageType, statusContext = null) {
    // statusContext carries everything needed to process on-hit statuses at apply-time
    // { sourceActorId, sourceItemId, sourceActionIndex, saveType, saveSuccess, saveDifficulty, saveTotal, attackWasCrit }
    const sc = statusContext;
    const statusAttrs = sc ? `
          data-source-actor-id="${sc.sourceActorId || ''}"
          data-source-item-id="${sc.sourceItemId || ''}"
          data-source-action-index="${sc.sourceActionIndex ?? ''}"
          data-save-type="${sc.saveType}"
          data-save-success="${sc.saveSuccess}"
          data-save-difficulty="${sc.saveDifficulty}"
          data-save-total="${sc.saveTotal}"
          data-attack-was-crit="${sc.attackWasCrit}"` : '';
    return `
      <div class="save-apply-button-container">
        <button
          class="vagabond-apply-save-damage-button"
          data-actor-id="${actorId}"
          data-actor-name="${actorName}"
          data-damage-amount="${finalDamage}"
          data-damage-type="${damageType}"${statusAttrs}
        >
          <i class="fas fa-burst"></i> Apply ${finalDamage} to ${actorName}
        </button>
      </div>
    `;
  }

  /**
   * Calculate final damage per RAW rules: Armor/Immune/Weak
   *
   * RAW Rules:
   * - Armor: Subtracted from Attack damage (physical types only)
   * - Immune: Unharmed by the damage type (take 0 damage)
   * - Weak: Ignores Armor and Immune, deals extra damage die (extra die handled at roll time)
   * - Typeless ("-"): Treated as generic damage, applies armor but no special immunities/weaknesses
   *
   * @param {Actor} actor - The target actor
   * @param {number} damage - Base damage amount
   * @param {string} damageType - Type of damage (or "-" for typeless)
   * @param {Item} attackingWeapon - The weapon used (optional, for material weakness checks)
   * @returns {number} Final damage amount
   */
  static calculateFinalDamage(actor, damage, damageType, attackingWeapon = null, sneakDice = 0, incomingDiceCount = 0, breakdown = null) {
    // Normalize damage type for lookup
    const normalizedType = damageType.toLowerCase();

    // Start with base damage
    let finalDamage = damage;

    // Rage damage reduction: while Berserk + Light/No Armor, reduce damage by 1 per incoming die
    // (Rip and Tear upgrades this to 2 per die)
    // Flat damage (0 dice) still gets reduced as if 1 die minimum
    // NOTE: Rage DR applies to ALL damage types (including typeless "-"), so it must run
    // before any early returns for typeless/weakness/immunity
    if (actor.statuses?.has('berserk')) {
      // Check light/no armor requirement
      const ragArmor = actor.items.find(item => {
        const isArmor = (item.type === 'armor') ||
                       (item.type === 'equipment' && item.system.equipmentType === 'armor');
        return isArmor && item.system.equipped;
      });
      const ragArmorType = ragArmor?.system?.armorType;
      if (!ragArmor || ragArmorType === 'light') {
        // Determine DR amount: 1 per die base, 2 if Rip and Tear
        let rageDR = 1;
        const classItem = actor.items.find(i => i.type === 'class');
        if (classItem) {
          const actorLevel = actor.system.attributes?.level?.value || 1;
          const hasRipAndTear = (classItem.system.levelFeatures || []).some(f =>
            (f.level || 99) <= actorLevel && (f.name || '').toLowerCase().includes('rip and tear')
          );
          if (hasRipAndTear) rageDR = 2;
        }
        const effectiveDiceCount = Math.max(1, incomingDiceCount); // Minimum 1 die for flat damage
        const rageReduction = rageDR * effectiveDiceCount;
        finalDamage = Math.max(0, finalDamage - rageReduction);
        if (breakdown) breakdown.rageReduction = rageReduction;
      }
    }

    // Handle typeless damage ("-") - just apply armor, skip immunities/weaknesses
    if (normalizedType === '-') {
      const armorRating = Math.max(0, (actor.system.armor || 0) - sneakDice);
      if (breakdown) breakdown.armorReduction = Math.min(armorRating, finalDamage);
      return Math.max(0, finalDamage - armorRating);
    }

    // Get immunities and weaknesses arrays (for NPCs and from equipped armor)
    let immunities = actor.system.immunities || [];
    const weaknesses = actor.system.weaknesses || [];

    // For PCs, also check equipped armor for immunities
    if (actor.type === 'character') {
      const equippedArmor = actor.items.find(item => {
        const isArmor = (item.type === 'armor') ||
                       (item.type === 'equipment' && item.system.equipmentType === 'armor');
        return isArmor && item.system.equipped;
      });

      if (equippedArmor && equippedArmor.system.immunities) {
        // Combine actor immunities with armor immunities
        immunities = [...immunities, ...equippedArmor.system.immunities];
      }
    }

    // Check for material-based weakness (Cold Iron, Silver)
    if (attackingWeapon && attackingWeapon.system?.metal) {
      const weaponMetal = attackingWeapon.system.metal;

      // Check if NPC is weak to this metal type
      if (weaknesses.includes(weaponMetal)) {
        // Material weakness: Ignore armor and immunities, damage goes through
        return finalDamage;
      }
    }

    // RAW: Weak - Ignores Armor and Immune, and deals an extra damage die
    // Note: Extra damage die should be handled at roll time, not here
    // Here we just ensure armor/immunity are bypassed
    if (weaknesses.includes(normalizedType)) {
      // Weakness: Ignore armor and immunities, damage goes through as-is
      // (Extra die is handled during damage roll, not here)
      return finalDamage;
    }

    // RAW: Immune - Unharmed by the damage type
    // Check direct immunity first
    let isImmune = immunities.includes(normalizedType);

    // Physical immunity: covers blunt/piercing/slashing from non-magical weapons
    // A weapon is "magical" if it has a special metal OR has Active Effects (relic powers)
    if (!isImmune && immunities.includes('physical')) {
      const physicalTypes = ['blunt', 'piercing', 'slashing'];
      if (physicalTypes.includes(normalizedType)) {
        if (!attackingWeapon || !_isWeaponMagical(attackingWeapon)) {
          isImmune = true;
        }
      }
    }

    if (isImmune) {
      return 0;
    }

    // Resistances — half damage BEFORE armor
    // Gather from actor schema + equipped item AE flags (relic powers)
    const resistances = new Set(actor.system.resistances || []);

    // Check equipped items for relic resistance AEs
    if (actor.items) {
      for (const item of actor.items) {
        if (item.type !== 'equipment' || !item.system.equipped) continue;
        for (const ae of item.effects) {
          const dr = ae.flags?.vagabond?.damageResistance;
          if (dr) resistances.add(dr.toLowerCase());
        }
      }
    }

    let isResisted = false;

    if (resistances.has(normalizedType)) {
      isResisted = true;
    }

    // Physical resistance: applies to blunt/piercing/slashing from non-magical weapons
    if (!isResisted && resistances.has('physical')) {
      const physicalTypes = ['blunt', 'piercing', 'slashing'];
      if (physicalTypes.includes(normalizedType)) {
        if (!attackingWeapon || !_isWeaponMagical(attackingWeapon)) {
          isResisted = true;
        }
      }
    }

    if (isResisted) {
      finalDamage = Math.floor(finalDamage / 2);
    }

    // RAW: Armor - Subtracted from ALL incoming damage
    // Armor always reduces damage unless target is immune or weak
    // Sneak Attack: pierces armor equal to number of sneak dice
    const baseArmor = actor.system.armor || 0;
    const armorRating = Math.max(0, baseArmor - sneakDice);
    if (breakdown) breakdown.armorReduction = Math.min(armorRating, finalDamage);
    finalDamage = Math.max(0, finalDamage - armorRating);

    return finalDamage;
  }


  /**
   * Create defend options accordion HTML
   * @returns {string} HTML string
   */
  static createDefendOptions() {
    return `
      <div class="defend-info-box">
        <div class="defend-header">
          <i class="fas fa-shield-alt"></i>
          <span>${game.i18n.localize('VAGABOND.DefendMechanics.DefendingTitle')}</span>
          <i class="fas fa-chevron-down expand-icon"></i>
        </div>
        <div class="defend-content">
          <p>
            <strong>${game.i18n.localize('VAGABOND.DefendMechanics.DodgeTitle')}:</strong>
            ${game.i18n.localize('VAGABOND.DefendMechanics.DodgeDescription')}
          </p>
          <p>
            <strong>${game.i18n.localize('VAGABOND.DefendMechanics.BlockTitle')}:</strong>
            ${game.i18n.localize('VAGABOND.DefendMechanics.BlockDescription')}
          </p>
          <p>
            <strong>${game.i18n.localize('VAGABOND.DefendMechanics.CritTitle')}:</strong>
            ${game.i18n.localize('VAGABOND.DefendMechanics.CritDescription')}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Create save reminder buttons (no damage, just roll saves)
   * @param {string} attackType - Attack type for hinder calculation ('melee', 'ranged', 'cast')
   * @param {Array} targetsAtRollTime - Targets captured at roll time
   * @returns {string} HTML string
   */
  static createSaveReminderButtons(attackType = 'melee', targetsAtRollTime = [], actorId = '', itemId = '', actionIndex = null, statusSaveTypes = new Set()) {
    // Localize Labels
    const reflexLabel = game.i18n.localize('VAGABOND.Saves.Reflex.name');
    const endureLabel = game.i18n.localize('VAGABOND.Saves.Endure.name');
    const willLabel = game.i18n.localize('VAGABOND.Saves.Will.name');

    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    // Red tint classes for buttons required to resist an on-hit status
    const reflexClass = statusSaveTypes.has('reflex') ? ' save-has-status' : '';
    const endureClass = statusSaveTypes.has('endure') ? ' save-has-status' : '';
    const willClass   = statusSaveTypes.has('will')   ? ' save-has-status' : '';

    return `
      <div class="vagabond-save-buttons-container">
        <div class="save-buttons-row">
            <button class="vagabond-save-reminder-button save-reflex${reflexClass}"
              data-save-type="reflex"
              data-attack-type="${attackType}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-targets="${targetsJson}">
              <i class="fas fa-running"></i> ${reflexLabel}
            </button>
            <button class="vagabond-save-reminder-button save-endure${endureClass}"
              data-save-type="endure"
              data-attack-type="${attackType}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-targets="${targetsJson}">
              <i class="fas fa-shield-alt"></i> ${endureLabel}
            </button>
            <button class="vagabond-save-reminder-button save-will${willClass}"
              data-save-type="will"
              data-attack-type="${attackType}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-targets="${targetsJson}">
              <i class="fas fa-brain"></i> ${willLabel}
            </button>
        </div>
      </div>
    `;
  }

  /**
   * Create save buttons (Reflex, Endure, Will, Apply Direct)
   */
  static createSaveButtons(damageAmount, damageType, damageRoll, actorId, itemId, attackType, targetsAtRollTime = [], actionIndex = null, attackWasCrit = false, statusSaveTypes = new Set(), isCleave = false, sneakDice = 0) {
    // Encode the damage roll terms
    const rollTermsData = JSON.stringify({
      terms: damageRoll.terms.map(t => {
        if (t.constructor.name === 'Die') {
          return { type: t.constructor.name, faces: t.faces, results: t.results || [] };
        } else if (t.constructor.name === 'NumericTerm') {
          return { type: t.constructor.name, number: t.number };
        } else {
          return { type: t.constructor.name };
        }
      }),
      total: damageRoll.total
    }).replace(/"/g, '&quot;');

    // Encode targets
    const targetsJson = JSON.stringify(targetsAtRollTime).replace(/"/g, '&quot;');

    // Localize Labels
    const reflexLabel = game.i18n.localize('VAGABOND.Saves.Reflex.name');
    const endureLabel = game.i18n.localize('VAGABOND.Saves.Endure.name');
    const willLabel = game.i18n.localize('VAGABOND.Saves.Will.name');

    // FIX: Ensure Apply Direct key exists or fallback to English
    const applyKey = 'VAGABOND.Chat.ApplyDirect';
    let applyDirectLabel = game.i18n.localize(applyKey);
    if (applyDirectLabel === applyKey) applyDirectLabel = "Apply Direct";

    // Red tint classes for buttons that are required to resist an on-hit status
    const reflexClass = statusSaveTypes.has('reflex') ? ' save-has-status' : '';
    const endureClass = statusSaveTypes.has('endure') ? ' save-has-status' : '';
    const willClass   = statusSaveTypes.has('will')   ? ' save-has-status' : '';

    // Count total dice for Rage damage reduction
    let totalDiceCount = 0;
    for (const term of damageRoll.terms) {
      if (term.constructor.name === 'Die') {
        totalDiceCount += (term.results?.length || term.number || 0);
      }
    }
    const diceCountAttr = totalDiceCount > 0 ? ` data-dice-count="${totalDiceCount}"` : '';

    // Cleave attribute (halve damage when applied)
    const cleaveAttr = isCleave ? ' data-cleave="true"' : '';
    // Sneak Attack armor pierce attribute
    const sneakAttr = sneakDice > 0 ? ` data-sneak-dice="${sneakDice}"` : '';

    // LAYOUT FIX: Two rows. Top: Apply Direct. Bottom: Saves.
    return `
      <div class="vagabond-save-buttons-container">
        <div class="save-buttons-top">
            <button class="vagabond-apply-direct-button"
              data-damage-amount="${damageAmount}"
              data-damage-type="${damageType}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-is-critical="${attackWasCrit}"
              data-targets="${targetsJson}"${cleaveAttr}${sneakAttr}${diceCountAttr}>
              <i class="fas fa-burst"></i> ${applyDirectLabel}
            </button>
        </div>

        <div class="save-buttons-row">
            <button class="vagabond-save-button save-reflex${reflexClass}"
              data-save-type="reflex"
              data-damage-amount="${damageAmount}"
              data-damage-type="${damageType}"
              data-roll-terms="${rollTermsData}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-attack-type="${attackType}"
              data-attack-was-crit="${attackWasCrit}"
              data-targets="${targetsJson}"${cleaveAttr}${sneakAttr}${diceCountAttr}>
              <i class="fas fa-running"></i> ${reflexLabel}
            </button>
            <button class="vagabond-save-button save-endure${endureClass}"
              data-save-type="endure"
              data-damage-amount="${damageAmount}"
              data-damage-type="${damageType}"
              data-roll-terms="${rollTermsData}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-attack-type="${attackType}"
              data-attack-was-crit="${attackWasCrit}"
              data-targets="${targetsJson}"${cleaveAttr}${sneakAttr}${diceCountAttr}>
              <i class="fas fa-shield-alt"></i> ${endureLabel}
            </button>
            <button class="vagabond-save-button save-will${willClass}"
              data-save-type="will"
              data-damage-amount="${damageAmount}"
              data-damage-type="${damageType}"
              data-roll-terms="${rollTermsData}"
              data-actor-id="${actorId}"
              data-item-id="${itemId || ''}"
              data-action-index="${actionIndex ?? ''}"
              data-attack-type="${attackType}"
              data-attack-was-crit="${attackWasCrit}"
              data-targets="${targetsJson}"${cleaveAttr}${sneakAttr}${diceCountAttr}>
              <i class="fas fa-brain"></i> ${willLabel}
            </button>
        </div>
      </div>
    `;
  }

  /**
   * Handle save button click - roll saves for each targeted token
   * @param {HTMLElement} button - The clicked save button
   * @param {Event} event - The click event (for keyboard modifiers)
   */
  static async handleSaveRoll(button, event = null) {
    const saveType = button.dataset.saveType; // 'reflex', 'endure', 'will'
    const damageAmount = parseInt(button.dataset.damageAmount);
    const damageType = button.dataset.damageType;
    const rollTermsData = JSON.parse(button.dataset.rollTerms.replace(/&quot;/g, '"'));
    const attackType = button.dataset.attackType; // 'melee' or 'ranged' or 'cast'
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const attackWasCrit = button.dataset.attackWasCrit === 'true';
    const actionIndexRaw = button.dataset.actionIndex;
    const actionIdx = (actionIndexRaw !== '' && actionIndexRaw != null) ? parseInt(actionIndexRaw) : null;
    const sneakDice = parseInt(button.dataset.sneakDice) || 0;

    // Get targets with fallback
    const storedTargets = this._getTargetsFromButton(button);

    let actorsToRoll = [];

    if (!game.user.isGM) {
      // PLAYER: Use stored targets if available, otherwise smart single-char detection
      if (storedTargets.length > 0) {
        const targetTokens = this._resolveStoredTargets(storedTargets);
        actorsToRoll = targetTokens.map(t => t.actor).filter(a => a && a.isOwner);

        if (actorsToRoll.length === 0) {
          ui.notifications.warn('None of the targeted tokens belong to you.');
          return;
        }
      } else {
        // Fallback: single-character detection
        const ownedCharacters = game.actors.filter(a => a.type === 'character' && a.isOwner);
        if (ownedCharacters.length === 1) {
          actorsToRoll = [ownedCharacters[0]];
        } else if (ownedCharacters.length > 1) {
          ui.notifications.warn('You have multiple characters. Please target the token you want to roll for.');
          return;
        } else {
          ui.notifications.warn('You do not own any characters to roll saves for.');
          return;
        }
      }
    } else {
      // GM: Use stored targets
      if (storedTargets.length === 0) {
        ui.notifications.warn('No tokens targeted. Please target at least one token.');
        return;
      }

      const targetTokens = this._resolveStoredTargets(storedTargets);
      actorsToRoll = targetTokens.map(t => t.actor).filter(a => a);
    }

    // Cleave: pre-calculate per-actor damage shares from raw damage
    const isCleave = button.dataset.cleave === 'true';
    const cleaveShares = new Map();
    if (isCleave && actorsToRoll.length >= 2) {
      const pseudoTokens = actorsToRoll.map(a => ({ actor: a }));
      const shares = this._distributeCleave(damageAmount, pseudoTokens);
      for (const { target, share } of shares) {
        cleaveShares.set(target.actor, share);
      }
    }

    // Roll save for each actor
    for (const targetActor of actorsToRoll) {
      if (!targetActor) continue;

      // Check permissions
      if (!targetActor.isOwner && !game.user.isGM) {
        ui.notifications.warn(`You don't have permission to roll saves for ${targetActor.name}.`);
        continue;
      }

      // NPCs don't roll saves - they only have armor, immunities, and weaknesses
      if (targetActor.type === 'npc') {
        ui.notifications.warn(game.i18n.localize('VAGABOND.Saves.NPCNoSaves'));
        continue;
      }

      // Rage: prompt to go Berserk before rolling save (can go Berserk "after you take damage")
      if (!targetActor.statuses?.has('berserk')) {
        const defenderClassItem = targetActor.items.find(i => i.type === 'class');
        const defenderLevel = targetActor.system.attributes?.level?.value || 1;
        const defenderHasRage = defenderClassItem ? (defenderClassItem.system.levelFeatures || []).some(f =>
          (f.level || 99) <= defenderLevel && (f.name || '').toLowerCase().includes('rage')
        ) : false;
        if (defenderHasRage) {
          const goBerserk = await foundry.applications.api.DialogV2.wait({
            window: { title: 'Go Berserk?' },
            content: '<p>You\'re about to take damage! Activate Rage and go Berserk?</p><p><small>Die upsize, explode, and reduce incoming damage by 1 per die.</small></p>',
            buttons: [
              { action: 'yes', label: 'Go Berserk!', icon: 'fas fa-fire-flame-curved' },
              { action: 'no', label: 'No', icon: 'fas fa-times' }
            ]
          });
          if (goBerserk === 'yes') {
            await targetActor.toggleStatusEffect('berserk');
          }
        }
      }

      // Use cleave share or full damage
      const effectiveDamageAmount = cleaveShares.get(targetActor) ?? damageAmount;

      // Determine if save is Hindered by conditions (heavy armor, ranged attack, etc.)
      const isHindered = this._isSaveHindered(saveType, attackType, targetActor);

      // Check if attacker has outgoingSavesModifier (e.g., Confused: saves vs its attacks have Favor)
      const sourceActor = actorId ? game.actors.get(actorId) : null;
      let effectiveAttackerModifier = sourceActor?.system?.outgoingSavesModifier || 'none';

      // Protection ward: if defender has a relic Protection ward matching the attacker, grant Favor on save
      if (sourceActor?.type === 'npc') {
        const protectionFavor = this._checkProtectionWard(targetActor, sourceActor);
        if (protectionFavor && effectiveAttackerModifier !== 'favor') {
          effectiveAttackerModifier = effectiveAttackerModifier === 'hinder' ? 'none' : 'favor';
        }
      }

      // Check if target has status resistance granting Favor on this save type
      {
        const { StatusHelper } = await import('./status-helper.mjs');
        const sourceItem = sourceActor?.items.get(itemId);
        const itemEntries = sourceItem?.system?.causedStatuses ?? [];
        const actionEntries = (!sourceItem && actionIdx !== null && !isNaN(actionIdx))
          ? (sourceActor?.system?.actions?.[actionIdx]?.causedStatuses ?? [])
          : [];
        const passiveEntries = sourceActor
          ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
          : [];
        const allIncomingEntries = [...itemEntries, ...actionEntries, ...passiveEntries];
        const hasResistance = allIncomingEntries.some(e =>
          (e.saveType === saveType || e.saveType === 'any') && StatusHelper.isStatusResisted(targetActor, e.statusId)
        );
        if (hasResistance) {
          if (effectiveAttackerModifier === 'hinder') effectiveAttackerModifier = 'none';
          else if (effectiveAttackerModifier === 'none') effectiveAttackerModifier = 'favor';
        }
      }

      // Extract keyboard modifiers from event
      const shiftKey = event?.shiftKey || false;
      const ctrlKey = event?.ctrlKey || false;

      // Roll the save with keyboard modifiers and attacker's outgoing modifier
      const saveRoll = await this._rollSave(targetActor, saveType, isHindered, shiftKey, ctrlKey, effectiveAttackerModifier);

      // Dice So Nice animation is handled automatically by roll.evaluate() in Foundry v13
      // No need to manually call showForRoll here

      // Determine success and critical
      const difficulty = targetActor.system.saves?.[saveType]?.difficulty || 10;
      const isSuccess = saveRoll.total >= difficulty;
      const { VagabondChatCard } = await import('./chat-card.mjs');
      const { VagabondRollBuilder } = await import('./roll-builder.mjs');
      const saveCritType = saveType === 'reflex' ? 'reflex-save' : null;
      const critNumber = VagabondRollBuilder.calculateCritThreshold(targetActor.getRollData(), saveCritType);
      const isCritical = VagabondChatCard.isRollCritical(saveRoll, critNumber);

      // Crit save choice: luck or full negate
      let critSaveBenefit = false;
      if (isCritical) {
        const critChoice = await VagabondChatCard._grantLuckOnCrit(targetActor, null, 'Critical Save');
        critSaveBenefit = (critChoice === 'benefit');
      }

      // Calculate damage breakdown for display
      let damageAfterSave = effectiveDamageAmount;
      let saveReduction = 0;
      if (critSaveBenefit) {
        // Crit benefit: fully negate damage + gain an Action
        damageAfterSave = 0;
        saveReduction = effectiveDamageAmount;
      } else if (isSuccess) {
        // Evasive: remove TWO highest dice on Dodge (Reflex) saves instead of one
        const isEvasiveDodge = saveType === 'reflex' && targetActor.system.hasEvasive;
        damageAfterSave = isEvasiveDodge
          ? this._removeHighestDice(rollTermsData, 2)
          : this._removeHighestDie(rollTermsData);
        // For cleave, cap save-reduced damage at the cleave share
        if (isCleave) damageAfterSave = Math.min(damageAfterSave, effectiveDamageAmount);
        saveReduction = effectiveDamageAmount - damageAfterSave;
      }

      // Count incoming dice for Rage damage reduction
      let incomingDiceCount = 0;
      for (const term of (rollTermsData.terms || [])) {
        if (term.type === 'Die' && term.results) {
          incomingDiceCount += term.results.length;
        }
      }

      // Apply armor/immune/weak modifiers and track armor/rage reduction
      // sourceActor already declared above for outgoingSavesModifier check
      const sourceItem = sourceActor?.items.get(itemId);
      const dmgBreakdown = { rageReduction: 0, armorReduction: 0 };
      let finalDamage = critSaveBenefit ? 0 : this.calculateFinalDamage(targetActor, damageAfterSave, damageType, sourceItem, sneakDice, incomingDiceCount, dmgBreakdown);
      // Bane: bonus damage dice vs matching creature types
      let baneDamage = 0;
      if (!critSaveBenefit && sourceActor) {
        baneDamage = await this.checkBaneDamage(targetActor, sourceActor, sourceItem);
        finalDamage += baneDamage;
      }
      const armorReduction = dmgBreakdown.armorReduction;

      // Auto-apply damage if setting enabled
      const autoApply = game.settings.get('vagabond', 'autoApplySaveDamage');
      if (autoApply) {
        const currentHP = targetActor.system.health?.value || 0;
        const newHP = Math.max(0, currentHP - finalDamage);
        await targetActor.update({ 'system.health.value': newHP });
        // Fearmonger: frighten nearby weaker enemies on kill
        if (newHP <= 0 && sourceActor) await this.checkFearmonger(targetActor, sourceActor);
        // On-Hit Burning: apply burning/status from weapon properties or relic power (skip if crit negated)
        if (sourceActor && !critSaveBenefit) await this.checkOnHitBurning(targetActor, sourceActor, null, null, sourceItem);
        // On-Kill: Lifesteal/Manasteal triggers
        if (newHP <= 0 && currentHP > 0 && sourceActor) await this.checkOnKillEffects(targetActor, sourceActor, sourceItem);
      }

      // Collect on-hit status entries (item.causedStatuses with fallback to actor action)
      const { StatusHelper } = await import('./status-helper.mjs');
      const coatingEntries = (sourceItem?.system?.coating?.charges > 0)
        ? (sourceItem.system.coating.causedStatuses ?? [])
        : [];
      const normalEntries = sourceItem?.system?.causedStatuses?.length
        ? sourceItem.system.causedStatuses
        : (actionIdx !== null && !isNaN(actionIdx) && sourceActor?.system?.actions?.[actionIdx]?.causedStatuses?.length)
          ? sourceActor.system.actions[actionIdx].causedStatuses
          : [];
      const critEntries = attackWasCrit
        ? (sourceItem?.system?.critCausedStatuses?.length
            ? sourceItem.system.critCausedStatuses
            : (actionIdx !== null && !isNaN(actionIdx) && sourceActor?.system?.actions?.[actionIdx]?.critCausedStatuses?.length)
              ? sourceActor.system.actions[actionIdx].critCausedStatuses
              : [])
        : [];
      const mergedEntries = attackWasCrit
        ? [...critEntries, ...normalEntries.filter(e => !critEntries.some(c => c.statusId === e.statusId))]
        : normalEntries;
      const passiveEntries = sourceActor
        ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
        : [];
      const allStatusEntries = [...mergedEntries, ...coatingEntries, ...passiveEntries];

      // statusContext is embedded in the Apply button so handleApplySaveDamage can process
      // statuses at apply-time when autoApply is OFF.
      const statusContext = allStatusEntries.length > 0 ? {
        sourceActorId:    actorId,
        sourceItemId:     itemId,
        sourceActionIndex: actionIdx,
        saveType,
        saveSuccess:      isSuccess,
        saveDifficulty:   difficulty,
        saveTotal:        saveRoll.total,
        attackWasCrit,
      } : null;

      // Post save result to chat
      const saveMessage = await this._postSaveResult(
        targetActor,
        saveType,
        saveRoll,
        difficulty,
        isSuccess,
        isCritical,
        isHindered,
        effectiveDamageAmount,
        saveReduction,
        armorReduction,
        finalDamage,
        damageType,
        autoApply,
        autoApply ? null : statusContext,  // embed context only for manual-apply cards
        dmgBreakdown.rageReduction
      );

      // autoApply ON → damage was already applied; process statuses now.
      // autoApply OFF → defer status processing to handleApplySaveDamage (apply button click).
      if (autoApply && allStatusEntries.length > 0) {
        const damageWasBlocked = finalDamage === 0;
        const preRolledSave = {
          saveType,
          roll:       saveRoll,
          total:      saveRoll.total,
          success:    isSuccess,
          difficulty,
        };
        const sourceActorTokenName1 = canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActor?.id)?.document.name || sourceActor?.name || '';
        const statusResults = await StatusHelper.processCausedStatuses(
          targetActor, allStatusEntries, damageWasBlocked, sourceItem?.name ?? '', { preRolledSave, sourceActorName: sourceActorTokenName1 }
        );
        if (coatingEntries.length > 0) {
          await sourceItem.update({
            'system.coating.charges': 0,
            'system.coating.sourceName': '',
            'system.coating.causedStatuses': [],
          });
        }
        await VagabondChatCard.statusResults(statusResults, targetActor, sourceItem?.name ?? '', sourceItem?.img ?? null);
      }
    }

    // Button remains active so multiple players can roll saves
    // Each click generates new save result cards for currently targeted tokens
  }

  /**
   * Handle save reminder button click - roll saves without damage
   * @param {HTMLElement} button - The clicked save reminder button
   * @param {Event} event - The click event (for keyboard modifiers)
   */
  static async handleSaveReminderRoll(button, event = null) {
    const saveType = button.dataset.saveType; // 'reflex', 'endure', 'will'
    const attackType = button.dataset.attackType; // 'melee', 'ranged', or 'cast'
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const actionIndexRaw = button.dataset.actionIndex;
    const actionIdx = (actionIndexRaw !== '' && actionIndexRaw != null) ? parseInt(actionIndexRaw) : null;

    // Get targets with fallback
    const storedTargets = this._getTargetsFromButton(button);

    let actorsToRoll = [];

    if (!game.user.isGM) {
      // PLAYER: Use stored targets if available, otherwise smart single-char detection
      if (storedTargets.length > 0) {
        const targetTokens = this._resolveStoredTargets(storedTargets);
        actorsToRoll = targetTokens.map(t => t.actor).filter(a => a && a.isOwner);

        if (actorsToRoll.length === 0) {
          ui.notifications.warn('None of the targeted tokens belong to you.');
          return;
        }
      } else {
        // Fallback: single-character detection
        const ownedCharacters = game.actors.filter(a => a.type === 'character' && a.isOwner);
        if (ownedCharacters.length === 1) {
          actorsToRoll = [ownedCharacters[0]];
        } else if (ownedCharacters.length > 1) {
          ui.notifications.warn('You have multiple characters. Please target the token you want to roll for.');
          return;
        } else {
          ui.notifications.warn('You do not own any characters to roll saves for.');
          return;
        }
      }
    } else {
      // GM: Use stored targets
      if (storedTargets.length === 0) {
        ui.notifications.warn('No tokens targeted. Please target at least one token.');
        return;
      }

      const targetTokens = this._resolveStoredTargets(storedTargets);
      actorsToRoll = targetTokens.map(t => t.actor).filter(a => a);
    }

    // Roll save for each actor
    for (const targetActor of actorsToRoll) {
      if (!targetActor) continue;

      // Check permissions
      if (!targetActor.isOwner && !game.user.isGM) {
        ui.notifications.warn(`You don't have permission to roll saves for ${targetActor.name}.`);
        continue;
      }

      // NPCs don't roll saves - they only have armor, immunities, and weaknesses
      if (targetActor.type === 'npc') {
        ui.notifications.warn(game.i18n.localize('VAGABOND.Saves.NPCNoSaves'));
        continue;
      }

      // Determine if save is Hindered by conditions (heavy armor, ranged attack, etc.)
      const isHindered = this._isSaveHindered(saveType, attackType, targetActor);

      // Check if attacker has outgoingSavesModifier (e.g., Confused: saves vs its attacks have Favor)
      const sourceActor = actorId ? game.actors.get(actorId) : null;
      let effectiveAttackerModifier2 = sourceActor?.system?.outgoingSavesModifier || 'none';

      // Check if target has status resistance granting Favor on this save type
      {
        const { StatusHelper } = await import('./status-helper.mjs');
        const sourceItem = sourceActor?.items.get(itemId);
        const itemEntries = sourceItem?.system?.causedStatuses ?? [];
        const actionEntries = (!sourceItem && actionIdx !== null && !isNaN(actionIdx))
          ? (sourceActor?.system?.actions?.[actionIdx]?.causedStatuses ?? [])
          : [];
        const passiveEntries = sourceActor
          ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
          : [];
        const allIncomingEntries = [...itemEntries, ...actionEntries, ...passiveEntries];
        const hasResistance = allIncomingEntries.some(e =>
          (e.saveType === saveType || e.saveType === 'any') && StatusHelper.isStatusResisted(targetActor, e.statusId)
        );
        if (hasResistance) {
          if (effectiveAttackerModifier2 === 'hinder') effectiveAttackerModifier2 = 'none';
          else if (effectiveAttackerModifier2 === 'none') effectiveAttackerModifier2 = 'favor';
        }
      }

      // Extract keyboard modifiers from event
      const shiftKey = event?.shiftKey || false;
      const ctrlKey = event?.ctrlKey || false;

      // Roll the save with keyboard modifiers and attacker's outgoing modifier
      const saveRoll = await this._rollSave(targetActor, saveType, isHindered, shiftKey, ctrlKey, effectiveAttackerModifier2);

      // Dice So Nice animation is handled automatically by roll.evaluate() in Foundry v13
      // No need to manually call showForRoll here

      // Determine success and critical
      const difficulty = targetActor.system.saves?.[saveType]?.difficulty || 10;
      const isSuccess = saveRoll.total >= difficulty;
      const { VagabondChatCard } = await import('./chat-card.mjs');
      const { VagabondRollBuilder } = await import('./roll-builder.mjs');
      const critNumber = VagabondRollBuilder.calculateCritThreshold(targetActor.getRollData());
      const isCritical = VagabondChatCard.isRollCritical(saveRoll, critNumber);

      // Post simplified save result to chat (no damage calculations)
      const saveMessage = await this._postSaveReminderResult(
        targetActor,
        saveType,
        saveRoll,
        difficulty,
        isSuccess,
        isCritical,
        isHindered
      );
      if (isCritical) await VagabondChatCard._grantLuckOnCrit(targetActor, saveMessage, 'Critical Save');

      // Process on-hit status effects using the save roll already made above
      // sourceActor is already declared above for outgoingSavesModifier
      const sourceItem = sourceActor?.items.get(itemId);
      const coatingEntries = (sourceItem?.system?.coating?.charges > 0)
        ? (sourceItem.system.coating.causedStatuses ?? [])
        : [];
      const itemNormalEntries = sourceItem?.system?.causedStatuses ?? [];
      const actionCausedStatuses = (!sourceItem && actionIdx !== null && !isNaN(actionIdx))
        ? (sourceActor?.system?.actions?.[actionIdx]?.causedStatuses ?? [])
        : [];
      const passiveEntries2 = sourceActor
        ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
        : [];
      const allStatusEntries = [...itemNormalEntries, ...coatingEntries, ...actionCausedStatuses, ...passiveEntries2];
      if (allStatusEntries.length > 0) {
        const { StatusHelper } = await import('./status-helper.mjs');
        const preRolledSave = {
          saveType,
          roll:       saveRoll,
          total:      saveRoll.total,
          success:    isSuccess,
          difficulty,
        };
        const sourceName = sourceItem?.name ?? (actionIdx !== null ? sourceActor?.system?.actions?.[actionIdx]?.name : '') ?? '';
        const sourceActorTokenName2 = canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActor?.id)?.document.name || sourceActor?.name || '';
        const statusResults = await StatusHelper.processCausedStatuses(
          targetActor, allStatusEntries, false, sourceName, { preRolledSave, sourceActorName: sourceActorTokenName2 }
        );
        if (coatingEntries.length > 0) {
          await sourceItem.update({
            'system.coating.charges': 0,
            'system.coating.sourceName': '',
            'system.coating.causedStatuses': [],
          });
        }
        await VagabondChatCard.statusResults(statusResults, targetActor, sourceName, sourceItem?.img ?? null);
      }
    }

    // Button remains active so multiple players can roll saves
  }

  /**
   * Check if actor has equipped shield with Shield property
   * @param {Actor} actor - The defending actor
   * @returns {boolean} True if shield equipped with Shield property
   * @private
   */
  static _hasEquippedShield(actor) {
    // Find equipped weapon with Shield property
    const equippedShield = actor.items.find(item => {
      const isWeapon = (item.type === 'weapon') ||
                      (item.type === 'equipment' && item.system.equipmentType === 'weapon');
      const isEquipped = item.system.equipped === true ||
                        item.system.equipmentState === 'oneHand' ||
                        item.system.equipmentState === 'twoHands';
      const hasShieldProperty = item.system.properties?.includes('Shield');

      return isWeapon && isEquipped && hasShieldProperty;
    });

    return !!equippedShield;
  }

  /**
   * Determine if a save should be Hindered
   * @param {string} saveType - 'reflex', 'endure', 'will'
   * @param {string} attackType - 'melee' or 'ranged' or 'cast'
   * @param {Actor} actor - The defending actor
   * @returns {boolean} True if save is Hindered
   * @private
   */
  static _isSaveHindered(saveType, attackType, actor) {
    // Block (Endure): Hindered if Ranged or Cast attack
    // EXCEPTION: Shield property negates ranged hinder (but not cast)
    if (saveType === 'endure' && (attackType === 'ranged' || attackType === 'cast')) {
      // Shield protects against ranged attacks, but not magical (cast) attacks
      if (attackType === 'ranged' && this._hasEquippedShield(actor)) {
        return false; // Shield negates the hinder
      }
      return true;
    }

    // Dodge (Reflex): Hindered if Heavy Armor (Evasive bypasses this)
    if (saveType === 'reflex') {
      if (actor.system.hasEvasive) return false;
      const equippedArmor = actor.items.find(item => {
        const isArmor = (item.type === 'armor') ||
                       (item.type === 'equipment' && item.system.equipmentType === 'armor');
        return isArmor && item.system.equipped;
      });
      if (equippedArmor && equippedArmor.system.armorType === 'heavy') {
        return true;
      }
    }

    return false;
  }

  /**
   * Roll a save for an actor
   * @param {Actor} actor - The actor rolling the save
   * @param {string} saveType - 'reflex', 'endure', 'will'
   * @param {boolean} isHindered - Whether the save is Hindered by conditions
   * @param {boolean} shiftKey - Whether Shift key was pressed (Favor modifier)
   * @param {boolean} ctrlKey - Whether Ctrl key was pressed (Hinder modifier)
   * @param {string} attackerModifier - Attacker's outgoingSavesModifier ('none', 'favor', 'hinder')
   * @returns {Promise<Roll>} The save roll
   * @private
   */
  static async _rollSave(actor, saveType, isHindered, shiftKey = false, ctrlKey = false, attackerModifier = 'none') {
    // Use centralized roll builder for all favor/hinder logic
    const { VagabondRollBuilder } = await import('./roll-builder.mjs');

    // Calculate effective favor/hinder from system state and keyboard modifiers
    const systemState = actor.system.favorHinder || 'none';

    let effectiveFavorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(
      systemState,
      shiftKey,
      ctrlKey
    );

    // Apply attacker's outgoingSavesModifier (e.g., Confused: saves vs its attacks have Favor)
    // This simulates the attacker's status affecting the defender's save
    if (attackerModifier === 'favor') {
      // If already favored/hindered, they cancel out
      if (effectiveFavorHinder === 'hinder') {
        effectiveFavorHinder = 'none';
      } else if (effectiveFavorHinder === 'none') {
        effectiveFavorHinder = 'favor';
      }
      // If already favored, stays favored (no double-favor)
    } else if (attackerModifier === 'hinder') {
      // If already favored/hindered, they cancel out
      if (effectiveFavorHinder === 'favor') {
        effectiveFavorHinder = 'none';
      } else if (effectiveFavorHinder === 'none') {
        effectiveFavorHinder = 'hinder';
      }
      // If already hindered, stays hindered (no double-hinder)
    }

    // Evasive: Reflex Saves can't be Hindered (while not Incapacitated)
    if (saveType === 'reflex' && (actor.system.hasEvasive || false) && !actor.statuses?.has('incapacitated')) {
      if (effectiveFavorHinder === 'hinder') effectiveFavorHinder = 'none';
      if (isHindered) isHindered = false;
    }

    // Don't Stop Me Now: Favor on Saves vs Paralyzed/Restrained/moved
    if ((actor.system.hasDontStopMeNow || false) &&
        (actor.statuses?.has('paralyzed') || actor.statuses?.has('restrained'))) {
      if (effectiveFavorHinder === 'hinder') { effectiveFavorHinder = 'none'; }
      else if (effectiveFavorHinder === 'none') { effectiveFavorHinder = 'favor'; }
    }

    // Virtuoso Resolve: Favor on Saves (granted by Bard's Virtuoso performance)
    if (actor.system.virtuosoSavesFavor || false) {
      if (effectiveFavorHinder === 'hinder') { effectiveFavorHinder = 'none'; }
      else if (effectiveFavorHinder === 'none') { effectiveFavorHinder = 'favor'; }
    }

    // Dancer — Step Up Active: 2d20kh on Reflex Saves
    let baseFormula = null;
    if (saveType === 'reflex' && (actor.system.stepUpActive || false)) {
      baseFormula = '2d20kh';
    }

    // Dancer — Choreographer: one-check Favor (consume after this roll)
    if (actor.getFlag('vagabond', 'choreographerFavorOneCheck')) {
      if (effectiveFavorHinder === 'hinder') { effectiveFavorHinder = 'none'; }
      else if (effectiveFavorHinder === 'none') { effectiveFavorHinder = 'favor'; }
      await actor.update({ 'system.favorHinder': 'none' });
      await actor.unsetFlag('vagabond', 'choreographerFavorOneCheck');
    }

    // Build and evaluate roll with conditional hinder support
    // (isHindered = true when heavy armor for Dodge, or ranged/cast attack for Block)
    const roll = await VagabondRollBuilder.buildAndEvaluateD20WithConditionalHinder(
      actor,
      effectiveFavorHinder,
      isHindered,
      baseFormula
    );

    return roll;
  }

  /**
   * Remove the highest rolled damage die from the damage roll
   * @param {Object} rollTermsData - Encoded roll terms data
   * @returns {number} New damage total with highest die removed
   * @private
   */
  static _removeHighestDie(rollTermsData) {
    let total = rollTermsData.total;
    let highestDieValue = 0;
    let totalDiceCount = 0;

    // Find all dice terms and their results
    for (const term of rollTermsData.terms) {
      if (term.type === 'Die' && term.results) {
        for (const result of term.results) {
          totalDiceCount++;
          if (result.result > highestDieValue) {
            highestDieValue = result.result;
          }
        }
      }
    }

    // If only one die was rolled, save completely negates damage
    if (totalDiceCount === 1) {
      return 0;
    }

    // Subtract highest die
    return Math.max(0, total - highestDieValue);
  }

  /**
   * Post save result to chat
   * @param {Actor} actor - The defending actor
   * @param {string} saveType - 'reflex', 'endure', 'will'
   * @param {Roll} roll - The save roll
   * @param {number} difficulty - Save difficulty
   * @param {boolean} isSuccess - Whether the save succeeded
   * @param {boolean} isCritical - Whether the save was a critical (natural 20)
   * @param {boolean} isHindered - Whether the save was Hindered
   * @param {number} originalDamage - Original damage amount
   * @param {number} saveReduction - Damage prevented by save
   * @param {number} armorReduction - Damage prevented by armor
   * @param {number} finalDamage - Final damage after save/armor
   * @param {string} damageType - Damage type
   * @param {boolean} autoApplied - Whether damage was auto-applied
   * @returns {Promise<ChatMessage>}
   * @private
   */
  static async _postSaveResult(actor, saveType, roll, difficulty, isSuccess, isCritical, isHindered, originalDamage, saveReduction, armorReduction, finalDamage, damageType, autoApplied, statusContext = null, rageReduction = 0) {
    const saveLabel = game.i18n.localize(`VAGABOND.Saves.${saveType.charAt(0).toUpperCase() + saveType.slice(1)}.name`);

    // Import VagabondChatCard
    const { VagabondChatCard } = await import('./chat-card.mjs');

    const card = new VagabondChatCard()
      .setType('save-roll')
      .setActor(actor)
      .setTitle(`${saveLabel} Save`)
      .setSubtitle(actor.name)
      .addRoll(roll, difficulty)
      .setOutcome(isSuccess ? 'PASS' : 'FAIL', isCritical);

    // Build visual damage calculation display
    const damageCalculationHTML = this._buildDamageCalculation(
      originalDamage,
      saveReduction,
      armorReduction,
      finalDamage,
      damageType,
      saveType,
      actor,
      autoApplied,
      isHindered,
      rageReduction
    );

    // Add crit rule text if critical save
    let critRuleHTML = '';
    if (isCritical) {
      critRuleHTML = `
        <div class="save-crit-rule">
          <p>
            <strong>${game.i18n.localize('VAGABOND.DefendMechanics.CritTitle')}:</strong>
            ${game.i18n.localize('VAGABOND.DefendMechanics.CritDescription')}
          </p>
        </div>
      `;
      // Flash of Beauty: Crit on Save = two Actions
      if (actor.system.hasFlashOfBeauty) {
        critRuleHTML += `
          <div class="save-crit-rule" style="border-left:3px solid #d4af37; padding-left:8px; margin-top:4px;">
            <p>
              <strong>Flash of Beauty:</strong>
              ${actor.name} can take <strong>two Actions</strong> instead of one!
            </p>
          </div>
        `;
      }
    }

    card.setDescription((card.data.description || '') + damageCalculationHTML + critRuleHTML);

    // Add "Apply to Target" button if damage was not auto-applied
    // statusContext is embedded so handleApplySaveDamage can process statuses at apply-time
    if (!autoApplied && finalDamage > 0) {
      const applyButton = this.createApplySaveDamageButton(actor.id, actor.name, finalDamage, damageType, statusContext);
      card.setDescription((card.data.description || '') + applyButton);
    }

    return await card.send();
  }

  /**
   * Post simplified save reminder result to chat (no damage)
   * @param {Actor} actor - The defending actor
   * @param {string} saveType - 'reflex', 'endure', 'will'
   * @param {Roll} roll - The save roll
   * @param {number} difficulty - Save difficulty
   * @param {boolean} isSuccess - Whether the save succeeded
   * @param {boolean} isCritical - Whether the save was a critical (natural 20)
   * @param {boolean} isHindered - Whether the save was Hindered
   * @returns {Promise<ChatMessage>}
   * @private
   */
  static async _postSaveReminderResult(actor, saveType, roll, difficulty, isSuccess, isCritical, isHindered) {
    const saveLabel = game.i18n.localize(`VAGABOND.Saves.${saveType.charAt(0).toUpperCase() + saveType.slice(1)}.name`);

    // Import VagabondChatCard
    const { VagabondChatCard } = await import('./chat-card.mjs');

    const card = new VagabondChatCard()
      .setType('save-roll')
      .setActor(actor)
      .setTitle(`${saveLabel} Save`)
      .setSubtitle(actor.name)
      .addRoll(roll, difficulty)
      .setOutcome(isSuccess ? 'PASS' : 'FAIL', isCritical);

    // Add description explaining what happened
    let descriptionHTML = `<div class="save-reminder-result">`;

    if (isSuccess) {
      descriptionHTML += `<p><strong>Success!</strong> ${actor.name} successfully made their ${saveLabel} save.`;
      if (isCritical) {
        descriptionHTML += ` <strong>(Critical!)</strong>`;
      }
      descriptionHTML += `</p>`;
    } else {
      descriptionHTML += `<p><strong>Failed!</strong> ${actor.name} failed their ${saveLabel} save.`;
      descriptionHTML += `</p>`;
    }

    if (isHindered) {
      descriptionHTML += `<p class="save-hindered-note"><em>This save was Hindered.</em></p>`;
    }

    descriptionHTML += `</div>`;

    // Add crit rule text if critical save
    if (isCritical) {
      descriptionHTML += `
        <div class="save-crit-rule">
          <p>
            <strong>${game.i18n.localize('VAGABOND.DefendMechanics.CritTitle')}:</strong>
            ${game.i18n.localize('VAGABOND.DefendMechanics.CritDescription')}
          </p>
        </div>
      `;
      // Flash of Beauty: Crit on Save = two Actions
      if (actor.system.hasFlashOfBeauty) {
        descriptionHTML += `
          <div class="save-crit-rule" style="border-left:3px solid #d4af37; padding-left:8px; margin-top:4px;">
            <p>
              <strong>Flash of Beauty:</strong>
              ${actor.name} can take <strong>two Actions</strong> instead of one!
            </p>
          </div>
        `;
      }
    }

    card.setDescription(descriptionHTML);

    return await card.send();
  }

  /**
   * Build visual damage calculation HTML
   * @param {number} originalDamage - Starting damage
   * @param {number} saveReduction - Damage prevented by save
   * @param {number} armorReduction - Damage prevented by armor
   * @param {number} finalDamage - Final damage
   * @param {string} damageType - Damage type key
   * @param {string} saveType - Save type (reflex/endure/will)
   * @param {Actor} actor - The defending actor
   * @param {boolean} autoApplied - Whether damage was auto-applied
   * @param {boolean} isHindered - Whether the save was hindered
   * @returns {string} HTML string
   * @private
   */
  static _buildDamageCalculation(originalDamage, saveReduction, armorReduction, finalDamage, damageType, saveType, actor, autoApplied, isHindered, rageReduction = 0) {
    // Get save icon
    const saveIcons = {
      'reflex': 'fa-solid fa-running',
      'endure': 'fa-solid fa-shield-alt',
      'will': 'fa-solid fa-brain'
    };
    const saveIcon = saveIcons[saveType] || 'fa-solid fa-shield';

    // Get damage type icon and label (handle typeless "-" damage)
    let damageTypeIcon = null;
    let damageTypeLabel = '';
    if (damageType && damageType !== '-') {
      damageTypeIcon = CONFIG.VAGABOND?.damageTypeIcons?.[damageType] || 'fa-solid fa-burst';
      damageTypeLabel = game.i18n.localize(CONFIG.VAGABOND.damageTypes[damageType]) || damageType;
    }

    // Build save tooltip with favor/hinder state
    const saveLabel = game.i18n.localize(`VAGABOND.Saves.${saveType.charAt(0).toUpperCase() + saveType.slice(1)}.name`);
    const favorHinder = actor.system.favorHinder || 'none';
    const hasActorFavor = (favorHinder === 'favor');
    const hasActorHinder = (favorHinder === 'hinder');

    let saveTooltip = saveLabel;
    if (hasActorFavor && isHindered) {
      // Cancelled out - no modifier
      saveTooltip = `${saveLabel} ${game.i18n.localize('VAGABOND.Roll.SaveRoll')}`;
    } else if (hasActorFavor) {
      saveTooltip = `${saveLabel} ${game.i18n.localize('VAGABOND.Roll.Favored')}`;
    } else if (hasActorHinder || isHindered) {
      saveTooltip = `${saveLabel} ${game.i18n.localize('VAGABOND.Roll.Hindered')}`;
    }

    // Get equipped armor names for tooltip
    let armorTooltip = game.i18n.localize('VAGABOND.Armor.Label');
    const equippedArmor = actor.items.find(item => {
      const isArmor = (item.type === 'armor') ||
                     (item.type === 'equipment' && item.system.equipmentType === 'armor');
      return isArmor && item.system.equipped;
    });
    if (equippedArmor) {
      armorTooltip = `${game.i18n.localize('VAGABOND.Armor.Label')}: ${equippedArmor.name}`;
    }

    // Build calculation line with title separator
    let calculationHTML = `<div class="save-damage-calculation">
      <div class="damage-title">${game.i18n.localize('VAGABOND.Roll.SaveRoll')}</div>
      <div class="damage-formula-line">
        <span class="damage-component" title="${game.i18n.localize('VAGABOND.Damage.Total')}">
          <i class="fa-solid fa-dice"></i> ${originalDamage}
        </span>`;

    // Add save reduction if any
    if (saveReduction > 0) {
      const saveIconClass = isHindered ? 'save-icon-hindered' : '';
      calculationHTML += `
        <span class="damage-operator">-</span>
        <span class="damage-component" title="${saveTooltip}">
          <i class="${saveIcon} ${saveIconClass}"></i> ${saveReduction}
        </span>`;
    }

    // Add Rage damage reduction if any
    if (rageReduction > 0) {
      calculationHTML += `
        <span class="damage-operator">-</span>
        <span class="damage-component" title="Rage: reduce ${rageReduction} (per die)">
          <i class="fas fa-fire-flame-curved"></i> ${rageReduction}
        </span>`;
    }

    // Add armor reduction if any
    if (armorReduction > 0) {
      calculationHTML += `
        <span class="damage-operator">-</span>
        <span class="damage-component" title="${armorTooltip}">
          <i class="fa-sharp fa-regular fa-shield"></i> ${armorReduction}
        </span>`;
    }

    // Add final damage
    const finalDamageTooltip = damageTypeLabel
      ? `${game.i18n.localize('VAGABOND.Damage.Final')} ${damageTypeLabel}`
      : game.i18n.localize('VAGABOND.Damage.Final');
    const damageTypeIconHTML = damageTypeIcon ? `<i class="${damageTypeIcon} damage-type-icon-large"></i>` : '';
    calculationHTML += `
        <span class="damage-operator">=</span>
        <span class="damage-final" title="${finalDamageTooltip}">
          ${finalDamage} ${damageTypeIconHTML}
        </span>
      </div>`;

    // Add application note if damage was applied
    if (autoApplied) {
      calculationHTML += `
      <div class="damage-application-note">
        damage applied to ${actor.name}'s HP
      </div>`;
    }

    calculationHTML += `</div>`;

    return calculationHTML;
  }

  /**
   * Handle applying restorative effects (healing, recover, recharge)
   * @param {HTMLElement} button - The clicked button
   */
  static async handleApplyRestorative(button) {
    const amount = parseInt(button.dataset.damageAmount);
    const damageType = button.dataset.damageType.toLowerCase();

    // Get targets with fallback system
    const storedTargets = this._getTargetsFromButton(button);

    if (storedTargets.length === 0) {
      ui.notifications.warn('No tokens targeted. Please target at least one token.');
      return;
    }

    // Resolve to actual tokens
    const targetedTokens = this._resolveStoredTargets(storedTargets);

    if (targetedTokens.length === 0) {
      ui.notifications.warn('None of the targeted tokens could be found on this scene.');
      return;
    }

    // Apply restorative effect to each resolved target
    for (const target of targetedTokens) {
      const targetActor = target.actor;
      if (!targetActor) continue;

      // Check permissions
      if (!targetActor.isOwner && !game.user.isGM) {
        ui.notifications.warn(`You don't have permission to modify ${targetActor.name}.`);
        continue;
      }

      // Apply the appropriate restorative effect
      if (damageType === 'healing') {
        // Healing: Increase HP (up to max)
        // Apply incoming healing modifier (e.g., Sickened: -2)
        const healingModifier = targetActor.system.incomingHealingModifier || 0;
        const modifiedAmount = Math.max(0, amount + healingModifier);

        const currentHP = targetActor.system.health?.value || 0;
        const maxHP = targetActor.system.health?.max || 0;
        const newHP = Math.min(maxHP, currentHP + modifiedAmount);
        const actualHealing = newHP - currentHP;
        await targetActor.update({ 'system.health.value': newHP });

        // Show modifier in notification if present
        const modifierText = healingModifier !== 0 ? ` (${amount} ${healingModifier >= 0 ? '+' : ''}${healingModifier})` : '';
        ui.notifications.info(`${targetActor.name} healed ${actualHealing} HP${modifierText}`);

        const { VagabondChatCard: VCCHeal } = await import('./chat-card.mjs');
        await VCCHeal.applyResult(targetActor, {
          type: 'heal',
          rawAmount: amount,
          finalAmount: actualHealing,
          previousValue: currentHP,
          newValue: newHP,
        });
      } else if (damageType === 'recover') {
        // Recover: Decrease Fatigue (down to 0)
        const currentFatigue = targetActor.system.fatigue || 0;
        const newFatigue = Math.max(0, currentFatigue - amount);
        const actualRecovery = currentFatigue - newFatigue;
        await targetActor.update({ 'system.fatigue': newFatigue });
        ui.notifications.info(`${targetActor.name} recovered ${actualRecovery} fatigue`);

        const { VagabondChatCard: VCCRecover } = await import('./chat-card.mjs');
        await VCCRecover.applyResult(targetActor, {
          type: 'recover',
          finalAmount: actualRecovery,
          previousValue: currentFatigue,
          newValue: newFatigue,
        });
      } else if (damageType === 'recharge') {
        // Recharge: Increase Mana (up to max)
        const currentMana = targetActor.system.mana?.value || 0;
        const maxMana = targetActor.system.mana?.max || 0;
        const newMana = Math.min(maxMana, currentMana + amount);
        const actualRecharge = newMana - currentMana;
        await targetActor.update({ 'system.mana.value': newMana });
        ui.notifications.info(`${targetActor.name} recharged ${actualRecharge} mana`);

        const { VagabondChatCard: VCCRecharge } = await import('./chat-card.mjs');
        await VCCRecharge.applyResult(targetActor, {
          type: 'recharge',
          finalAmount: actualRecharge,
          previousValue: currentMana,
          newValue: newMana,
        });
      }
    }

    // Button remains active so effects can be applied to different tokens
  }

  /**
   * Handle "Apply Direct" button - bypass saves
   * @param {HTMLElement} button - The clicked button
   */
  static async handleApplyDirect(button) {
    const damageAmount = parseInt(button.dataset.damageAmount);
    const damageType = button.dataset.damageType;
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const sneakDice = parseInt(button.dataset.sneakDice) || 0;
    const diceCount = parseInt(button.dataset.diceCount) || 0;

    // Get weapon data for material weakness checks
    const sourceActor = game.actors.get(actorId);
    const sourceItem = sourceActor?.items.get(itemId);

    // Get targets with fallback system
    const storedTargets = this._getTargetsFromButton(button);

    if (storedTargets.length === 0) {
      ui.notifications.warn('No tokens targeted. Please target at least one token.');
      return;
    }

    // Resolve to actual tokens
    const targetedTokens = this._resolveStoredTargets(storedTargets);

    if (targetedTokens.length === 0) {
      ui.notifications.warn('None of the targeted tokens could be found on this scene.');
      return;
    }

    // Rage: prompt Barbarian targets to go Berserk before damage is applied
    for (const target of targetedTokens) {
      const tActor = target.actor;
      if (!tActor || tActor.type !== 'character') continue;
      if (tActor.statuses?.has('berserk')) continue;
      const rageClassItem = tActor.items.find(i => i.type === 'class');
      const rageLevel = tActor.system.attributes?.level?.value || 1;
      const targetHasRage = rageClassItem ? (rageClassItem.system.levelFeatures || []).some(f =>
        (f.level || 99) <= rageLevel && (f.name || '').toLowerCase().includes('rage')
      ) : false;
      if (targetHasRage) {
        const goBerserk = await foundry.applications.api.DialogV2.wait({
          window: { title: 'Go Berserk?' },
          content: `<p>${tActor.name} is about to take damage! Activate Rage and go Berserk?</p><p><small>Reduce incoming damage by 1 per die (2 with Rip and Tear).</small></p>`,
          buttons: [
            { action: 'yes', label: 'Go Berserk!', icon: 'fas fa-fire-flame-curved' },
            { action: 'no', label: 'No', icon: 'fas fa-times' }
          ]
        });
        if (goBerserk === 'yes') {
          await tActor.toggleStatusEffect('berserk');
        }
      }
    }

    // Cleave: smart damage distribution across targets
    const isCleave = button.dataset.cleave === 'true';

    if (isCleave && targetedTokens.length >= 2) {
      // Distribute raw damage using smart split, then apply armor per-target
      const shares = this._distributeCleave(damageAmount, targetedTokens);
      for (const { target, share } of shares) {
        const targetActor = target.actor;
        if (!targetActor) continue;
        if (!targetActor.isOwner && !game.user.isGM) {
          ui.notifications.warn(`You don't have permission to modify ${targetActor.name}.`);
          continue;
        }
        let finalDamage = this.calculateFinalDamage(targetActor, share, damageType, sourceItem, sneakDice, diceCount);
        const baneDamage = await this.checkBaneDamage(targetActor, sourceActor, sourceItem);
        finalDamage += baneDamage;
        const currentHP = targetActor.system.health?.value || 0;
        const newHP = Math.max(0, currentHP - finalDamage);
        await targetActor.update({ 'system.health.value': newHP });
        ui.notifications.info(`Applied ${finalDamage} (Cleave${baneDamage ? ` +${baneDamage} bane` : ''}) damage to ${targetActor.name}`);
        // Fearmonger: frighten nearby weaker enemies on kill
        if (newHP <= 0 && sourceActor) await this.checkFearmonger(targetActor, sourceActor);
        // On-Hit Burning: apply burning/status from weapon properties or relic power
        if (sourceActor) await this.checkOnHitBurning(targetActor, sourceActor, null, null, sourceItem);
        // On-Kill: Lifesteal/Manasteal triggers
        if (newHP <= 0 && currentHP > 0 && sourceActor) await this.checkOnKillEffects(targetActor, sourceActor, sourceItem);

        // Post damage result to chat
        const { VagabondChatCard: VCCCleave } = await import('./chat-card.mjs');
        await VCCCleave.applyResult(targetActor, {
          type: 'damage',
          rawAmount: share,
          armorReduction: share - (finalDamage - baneDamage),
          finalAmount: finalDamage,
          damageType,
          previousValue: currentHP,
          newValue: newHP,
        });
      }
    } else {
    // Normal (non-cleave) damage application
    for (const target of targetedTokens) {
      const targetActor = target.actor;
      if (!targetActor) continue;

      // Check permissions
      if (!targetActor.isOwner && !game.user.isGM) {
        ui.notifications.warn(`You don't have permission to modify ${targetActor.name}.`);
        continue;
      }

      // Calculate final damage (armor/immune/weak)
      let finalDamage = this.calculateFinalDamage(targetActor, damageAmount, damageType, sourceItem, sneakDice, diceCount);

      // Bane: bonus damage dice vs matching creature types (applied after armor)
      const baneDamage = await this.checkBaneDamage(targetActor, sourceActor, sourceItem);
      finalDamage += baneDamage;

      const currentHP = targetActor.system.health?.value || 0;
      const newHP = Math.max(0, currentHP - finalDamage);
      await targetActor.update({ 'system.health.value': newHP });

      ui.notifications.info(`Applied ${finalDamage}${baneDamage ? ` (incl. ${baneDamage} bane)` : ''} damage to ${targetActor.name}`);
      // Fearmonger: frighten nearby weaker enemies on kill
      if (newHP <= 0 && sourceActor) await this.checkFearmonger(targetActor, sourceActor);
      // On-Hit Burning: apply burning/status from weapon properties or relic power
      if (sourceActor) await this.checkOnHitBurning(targetActor, sourceActor, null, null, sourceItem);
      // On-Kill: Lifesteal/Manasteal triggers
      if (newHP <= 0 && currentHP > 0 && sourceActor) await this.checkOnKillEffects(targetActor, sourceActor, sourceItem);

      // Post damage result to chat
      const { VagabondChatCard: VCCDirect } = await import('./chat-card.mjs');
      await VCCDirect.applyResult(targetActor, {
        type: 'damage',
        rawAmount: damageAmount,
        armorReduction: damageAmount - (finalDamage - baneDamage),
        finalAmount: finalDamage,
        damageType,
        previousValue: currentHP,
        newValue: newHP,
      });

      // Process on-hit status effects
      const { StatusHelper } = await import('./status-helper.mjs');
      const actionIndexRaw = button.dataset.actionIndex;
      const actionIdx = (actionIndexRaw !== '' && actionIndexRaw != null) ? parseInt(actionIndexRaw) : null;
      const isCritical = button.dataset.isCritical === 'true';
      // NPC actions store causedStatuses on the action, not on an item
      const actionCausedStatuses = (!sourceItem && actionIdx !== null && !isNaN(actionIdx))
        ? (sourceActor?.system?.actions?.[actionIdx]?.causedStatuses ?? [])
        : [];
      const actionCritStatuses = (isCritical && !sourceItem && actionIdx !== null && !isNaN(actionIdx))
        ? (sourceActor?.system?.actions?.[actionIdx]?.critCausedStatuses ?? [])
        : [];
      const coatingEntries = (sourceItem?.system?.coating?.charges > 0)
        ? (sourceItem.system.coating.causedStatuses ?? [])
        : [];
      const itemNormalEntries = sourceItem?.system?.causedStatuses ?? [];
      const itemCritEntries = isCritical ? (sourceItem?.system?.critCausedStatuses ?? []) : [];
      // On a crit: crit entries replace same-statusId normal entries; unique normals still apply
      const mergedItemEntries = isCritical
        ? [...itemCritEntries, ...itemNormalEntries.filter(e => !itemCritEntries.some(c => c.statusId === e.statusId))]
        : itemNormalEntries;
      const passiveEntries3 = sourceActor
        ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
        : [];
      const allStatusEntries = [
        ...mergedItemEntries,
        ...coatingEntries,
        ...actionCausedStatuses,
        ...actionCritStatuses,
        ...passiveEntries3,
      ];
      if (allStatusEntries.length > 0) {
        const sourceName = sourceItem?.name ?? (actionIdx !== null ? sourceActor?.system?.actions?.[actionIdx]?.name : '') ?? '';
        const damageWasBlocked = finalDamage === 0;
        const sourceActorTokenName3 = canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActor?.id)?.document.name || sourceActor?.name || '';
        // Apply Direct bypasses all saves — statuses are applied unconditionally
        const statusResults = await StatusHelper.processCausedStatuses(
          targetActor, allStatusEntries, damageWasBlocked, sourceName, { skipSaveRoll: true, sourceActorName: sourceActorTokenName3 }
        );
        if (coatingEntries.length > 0) {
          await sourceItem.update({
            'system.coating.charges': 0,
            'system.coating.sourceName': '',
            'system.coating.causedStatuses': [],
          });
        }
        const { VagabondChatCard } = await import('./chat-card.mjs');
        await VagabondChatCard.statusResults(statusResults, targetActor, sourceName, sourceItem?.img ?? null);
      }
    }
    } // end else (non-cleave)

    // Button remains active so damage can be applied to different tokens
  }

  /**
   * Handle "Apply to Target" button from save result cards
   * Applies pre-calculated damage (after save/armor/immunities) to the specific character who rolled the save
   * @param {HTMLElement} button - The clicked button
   */
  static async handleApplySaveDamage(button) {
    const actorId = button.dataset.actorId;
    const actorName = button.dataset.actorName;
    const finalDamage = parseInt(button.dataset.damageAmount);
    const damageType = button.dataset.damageType;

    // Get the actor who rolled the save
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Character not found!');
      return;
    }

    // Check permissions - must own the character or be GM
    if (!actor.isOwner && !game.user.isGM) {
      ui.notifications.warn(`You don't have permission to modify ${actor.name}.`);
      return;
    }

    // Apply the pre-calculated damage to this specific character
    const currentHP = actor.system.health?.value || 0;
    const newHP = Math.max(0, currentHP - finalDamage);
    await actor.update({ 'system.health.value': newHP });

    // On-Kill: Lifesteal/Manasteal triggers
    if (newHP <= 0 && currentHP > 0) {
      const sourceActorIdKill = button.dataset.sourceActorId;
      const sourceItemIdKill = button.dataset.sourceItemId;
      const sourceActorKill = sourceActorIdKill ? game.actors.get(sourceActorIdKill) : null;
      const sourceItemKill = sourceActorKill?.items.get(sourceItemIdKill);
      if (sourceActorKill) await this.checkOnKillEffects(actor, sourceActorKill, sourceItemKill);
    }

    // Update button text and disable
    const icon = button.querySelector('i');
    button.textContent = `Applied to ${actorName}`;
    if (icon) button.prepend(icon); // Keep the icon
    button.disabled = true;

    ui.notifications.info(`Applied ${finalDamage} damage to ${actorName} (${currentHP} → ${newHP} HP)`);

    // Post damage result to chat
    const { VagabondChatCard: VCCSave } = await import('./chat-card.mjs');
    await VCCSave.applyResult(actor, {
      type: 'damage',
      rawAmount: finalDamage,
      finalAmount: finalDamage,
      damageType,
      previousValue: currentHP,
      newValue: newHP,
    });

    // Process on-hit statuses deferred from handleSaveRoll (autoApply was OFF)
    const sourceActorId = button.dataset.sourceActorId;
    if (sourceActorId) {
      const saveType       = button.dataset.saveType;
      const saveSuccess    = button.dataset.saveSuccess === 'true';
      const saveDifficulty = parseInt(button.dataset.saveDifficulty);
      const saveTotal      = parseInt(button.dataset.saveTotal);
      const sourceItemId   = button.dataset.sourceItemId;
      const sourceActionIndexRaw = button.dataset.sourceActionIndex;
      const sourceActionIdx = (sourceActionIndexRaw !== '' && sourceActionIndexRaw != null) ? parseInt(sourceActionIndexRaw) : null;
      const attackWasCrit  = button.dataset.attackWasCrit === 'true';

      const sourceActor = game.actors.get(sourceActorId);
      const sourceItem  = sourceActor?.items.get(sourceItemId);

      const coatingEntries = (sourceItem?.system?.coating?.charges > 0)
        ? (sourceItem.system.coating.causedStatuses ?? [])
        : [];
      const normalEntries = sourceItem?.system?.causedStatuses?.length
        ? sourceItem.system.causedStatuses
        : (sourceActionIdx !== null && !isNaN(sourceActionIdx) && sourceActor?.system?.actions?.[sourceActionIdx]?.causedStatuses?.length)
          ? sourceActor.system.actions[sourceActionIdx].causedStatuses
          : [];
      const critEntries = attackWasCrit
        ? (sourceItem?.system?.critCausedStatuses?.length
            ? sourceItem.system.critCausedStatuses
            : (sourceActionIdx !== null && !isNaN(sourceActionIdx) && sourceActor?.system?.actions?.[sourceActionIdx]?.critCausedStatuses?.length)
              ? sourceActor.system.actions[sourceActionIdx].critCausedStatuses
              : [])
        : [];
      const mergedEntries = attackWasCrit
        ? [...critEntries, ...normalEntries.filter(e => !critEntries.some(c => c.statusId === e.statusId))]
        : normalEntries;
      const passiveEntries4 = sourceActor
        ? sourceActor.items.filter(i => i.system?.equipped && i.system?.passiveCausedStatuses?.length).flatMap(i => i.system.passiveCausedStatuses)
        : [];
      const allStatusEntries = [...mergedEntries, ...coatingEntries, ...passiveEntries4];

      if (allStatusEntries.length > 0) {
        const { StatusHelper } = await import('./status-helper.mjs');
        const { VagabondChatCard } = await import('./chat-card.mjs');
        const damageWasBlocked = finalDamage === 0;
        const preRolledSave = { saveType, success: saveSuccess, total: saveTotal, difficulty: saveDifficulty, roll: null };
        const sourceName = sourceItem?.name ?? (sourceActionIdx !== null ? sourceActor?.system?.actions?.[sourceActionIdx]?.name : '') ?? '';
        const sourceActorTokenName4 = canvas.tokens?.placeables?.find(t => t.actor?.id === sourceActor?.id)?.document.name || sourceActor?.name || '';
        const statusResults = await StatusHelper.processCausedStatuses(
          actor, allStatusEntries, damageWasBlocked, sourceName, { preRolledSave, sourceActorName: sourceActorTokenName4 }
        );
        if (coatingEntries.length > 0) {
          await sourceItem.update({
            'system.coating.charges': 0,
            'system.coating.sourceName': '',
            'system.coating.causedStatuses': [],
          });
        }
        await VagabondChatCard.statusResults(statusResults, actor, sourceName, sourceItem?.img ?? null);
      }
    }
  }

  /**
   * Remove the N highest individual die results from the roll total.
   * Used by Evasive to ignore TWO highest dice on a successful Dodge save.
   * If total dice count <= count, damage is fully negated.
   * @param {object} rollTermsData - Parsed roll terms data with .total and .terms
   * @param {number} count - Number of highest dice to remove
   * @returns {number} Damage after removing N highest dice
   * @private
   */
  static _removeHighestDice(rollTermsData, count = 2) {
    let total = rollTermsData.total;
    const allDieResults = [];

    // Collect all individual die results
    for (const term of rollTermsData.terms) {
      if (term.type === 'Die' && term.results) {
        for (const result of term.results) {
          allDieResults.push(result.result);
        }
      }
    }

    // If dice count <= removal count, save completely negates damage
    if (allDieResults.length <= count) {
      return 0;
    }

    // Sort descending and sum the top N
    allDieResults.sort((a, b) => b - a);
    let removedSum = 0;
    for (let i = 0; i < count; i++) {
      removedSum += allDieResults[i];
    }

    return Math.max(0, total - removedSum);
  }

  /**
   * Smart Cleave damage distribution: split total damage between two targets,
   * weighting toward the lower-HP target (capped at their current HP).
   * @param {number} totalDamage - Raw damage to split
   * @param {Array} targets - Array of token-like objects with .actor
   * @returns {Array<{target, share}>} Each target with its damage share
   * @private
   */
  static _distributeCleave(totalDamage, targets) {
    if (targets.length < 2) {
      return targets.map(t => ({ target: t, share: totalDamage }));
    }

    // Sort by current HP ascending (lower HP first); ties keep original order
    const sorted = [...targets].map((t, i) => ({ target: t, hp: t.actor?.system.health?.value || 0, idx: i }));
    sorted.sort((a, b) => a.hp - b.hp || a.idx - b.idx);

    const lowerEntry = sorted[0];
    const higherEntry = sorted[1];

    // Ceil to lower-HP target, but cap at their current HP
    let lowerShare = Math.min(Math.ceil(totalDamage / 2), lowerEntry.hp);
    let higherShare = totalDamage - lowerShare;

    return [
      { target: lowerEntry.target, share: lowerShare },
      { target: higherEntry.target, share: higherShare },
    ];
  }

  /**
   * Check if a defender has a Protection ward matching the attacker.
   * Scans equipped item AE flags for wardType + wardTarget.
   * @param {Actor} defender - The character making the save
   * @param {Actor} attacker - The NPC whose attack triggered the save
   * @returns {boolean} True if a protection ward matches the attacker
   */
  static _checkProtectionWard(defender, attacker) {
    if (!defender?.items || !attacker) return false;

    const attackerBeingType = attacker.system?.beingType || '';
    const attackerName = attacker.name || '';

    for (const item of defender.items) {
      if (!item.system.equipped) continue;
      for (const ae of item.effects) {
        const flags = ae.flags?.vagabond;
        if (!flags?.wardType || !flags?.wardTarget) continue;

        const wardTarget = flags.wardTarget;
        let matches = false;

        switch (flags.wardType) {
          case 'niche':
            matches = attackerName.toLowerCase().includes(wardTarget.toLowerCase());
            break;
          case 'specific':
            matches = attackerBeingType.toLowerCase() === wardTarget.toLowerCase() ||
                      attackerName.toLowerCase().includes(wardTarget.toLowerCase());
            break;
          case 'general': {
            const nt = attackerBeingType.toLowerCase().replace(/s$/, '');
            const nw = wardTarget.toLowerCase().replace(/s$/, '');
            matches = nt === nw;
            break;
          }
        }

        if (matches) return true;
      }
    }
    return false;
  }

  /**
   * Check if a weapon has bane properties matching the target and roll bonus dice.
   * Scans the weapon's Active Effect flags for bane data (baneType + baneDice).
   * Matching logic:
   *   - Niche: target actor name matches the bane's stored creature name
   *   - Specific: target's beingType or name matches the bane subtype list
   *   - General: target's beingType matches the bane being type
   * @param {Actor} targetActor - The NPC being attacked
   * @param {Actor} sourceActor - The attacker
   * @param {Item|null} sourceItem - The weapon used
   * @returns {number} Bonus bane damage (0 if no match)
   */
  static async checkBaneDamage(targetActor, sourceActor, sourceItem) {
    if (!targetActor || !sourceItem?.effects) return 0;
    if (targetActor.type !== 'npc') return 0;

    const targetBeingType = targetActor.system.beingType || '';
    const targetName = targetActor.name || '';

    let totalBaneDamage = 0;

    for (const ae of sourceItem.effects) {
      const flags = ae.flags?.vagabond;
      if (!flags?.baneType || !flags?.baneDice) continue;

      let matches = false;
      const baneTarget = flags.baneTarget || '';

      switch (flags.baneType) {
        case 'niche':
          matches = targetName.toLowerCase().includes(baneTarget.toLowerCase());
          break;
        case 'specific':
          matches = targetBeingType.toLowerCase() === baneTarget.toLowerCase() ||
                    targetName.toLowerCase().includes(baneTarget.toLowerCase());
          break;
        case 'general': {
          const normalizedTarget = targetBeingType.toLowerCase().replace(/s$/, '');
          const normalizedBane = baneTarget.toLowerCase().replace(/s$/, '');
          matches = normalizedTarget === normalizedBane;
          break;
        }
      }

      if (matches) {
        const baneRoll = new Roll(flags.baneDice);
        await baneRoll.evaluate();
        totalBaneDamage += baneRoll.total;

        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
          content: `<div class="vagabond-bane-message">
            <strong>Bane!</strong> ${sourceItem.name} deals +${baneRoll.total} bonus damage
            vs ${targetName} (${flags.baneType}: ${baneTarget}, rolled ${flags.baneDice} = ${baneRoll.total})
          </div>`,
          type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
      }
    }

    // Also check equipped items on attacker (in case bane is on a non-weapon relic)
    if (totalBaneDamage === 0 && sourceActor?.items) {
      for (const item of sourceActor.items) {
        if (item === sourceItem || !item.system.equipped) continue;
        for (const ae of item.effects) {
          const flags = ae.flags?.vagabond;
          if (!flags?.baneType || !flags?.baneDice) continue;

          let matches = false;
          const baneTarget = flags.baneTarget || '';

          switch (flags.baneType) {
            case 'niche':
              matches = targetName.toLowerCase().includes(baneTarget.toLowerCase());
              break;
            case 'specific':
              matches = targetBeingType.toLowerCase() === baneTarget.toLowerCase() ||
                        targetName.toLowerCase().includes(baneTarget.toLowerCase());
              break;
            case 'general': {
              const nb = baneTarget.toLowerCase().replace(/s$/, '');
              const nt = targetBeingType.toLowerCase().replace(/s$/, '');
              matches = nt === nb;
              break;
            }
          }

          if (matches) {
            const baneRoll = new Roll(flags.baneDice);
            await baneRoll.evaluate();
            totalBaneDamage += baneRoll.total;

            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
              content: `<div class="vagabond-bane-message">
                <strong>Bane!</strong> ${item.name} deals +${baneRoll.total} bonus damage
                vs ${targetName} (${flags.baneType}: ${baneTarget}, rolled ${flags.baneDice} = ${baneRoll.total})
              </div>`,
              type: CONST.CHAT_MESSAGE_STYLES.OTHER
            });
          }
        }
      }
    }

    return totalBaneDamage;
  }

  /**
   * Check and apply on-kill relic effects (Lifesteal, Manasteal).
   * Scans the attacker's equipped weapon AE flags for onKillHealDice / onKillManaDice.
   * @param {Actor} targetActor - The target that was killed (HP reached 0)
   * @param {Actor} sourceActor - The attacker who dealt the killing blow
   * @param {Item|null} sourceItem - The weapon/item used
   */
  static async checkOnKillEffects(targetActor, sourceActor, sourceItem) {
    if (!sourceActor?.system) return;

    // Gather on-kill flags from the weapon's Active Effects
    let healDice = null;
    let manaDice = null;

    // Check source item AE flags first
    if (sourceItem?.effects) {
      for (const ae of sourceItem.effects) {
        const flags = ae.flags?.vagabond;
        if (!flags) continue;
        if (flags.onKillHealDice && !healDice) healDice = flags.onKillHealDice;
        if (flags.onKillManaDice && !manaDice) manaDice = flags.onKillManaDice;
      }
    }

    // Also check all equipped items on the attacker (in case a non-weapon grants it)
    if (!healDice || !manaDice) {
      for (const item of sourceActor.items) {
        if (!item.system.equipped) continue;
        for (const ae of item.effects) {
          const flags = ae.flags?.vagabond;
          if (!flags) continue;
          if (flags.onKillHealDice && !healDice) healDice = flags.onKillHealDice;
          if (flags.onKillManaDice && !manaDice) manaDice = flags.onKillManaDice;
        }
      }
    }

    // Lifesteal: heal the attacker
    if (healDice) {
      const healRoll = new Roll(healDice);
      await healRoll.evaluate();
      const healAmount = healRoll.total;
      const currentHP = sourceActor.system.health?.value || 0;
      const maxHP = sourceActor.system.health?.max || currentHP;
      const newHP = Math.min(maxHP, currentHP + healAmount);
      const actualHeal = newHP - currentHP;
      if (actualHeal > 0) {
        await sourceActor.update({ 'system.health.value': newHP });
      }
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
        content: `<div class="vagabond-onkill-message">
          <strong>Lifesteal!</strong> ${sourceActor.name} slays ${targetActor.name} and heals
          <span class="heal-amount">${actualHeal} HP</span> (rolled ${healDice} = ${healRoll.total})
        </div>`,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    }

    // Manasteal: restore attacker's mana
    if (manaDice) {
      const manaRoll = new Roll(manaDice);
      await manaRoll.evaluate();
      const manaAmount = manaRoll.total;
      const currentMana = sourceActor.system.mana?.value ?? 0;
      const maxMana = sourceActor.system.mana?.max ?? currentMana;
      const newMana = Math.min(maxMana, currentMana + manaAmount);
      const actualRestore = newMana - currentMana;
      if (actualRestore > 0) {
        await sourceActor.update({ 'system.mana.value': newMana });
      }
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
        content: `<div class="vagabond-onkill-message">
          <strong>Manasteal!</strong> ${sourceActor.name} slays ${targetActor.name} and restores
          <span class="mana-amount">${actualRestore} Mana</span> (rolled ${manaDice} = ${manaRoll.total})
        </div>`,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    }
  }

  /**
   * Fearmonger: When an enemy is killed, frighten nearby weaker enemies.
   * Applies Frightened status to NPC tokens within 30ft with HD < attacker's Level.
   * Sets auto-expire flag for removal at end of next round.
   * @param {Actor} targetActor - The actor that was killed
   * @param {Actor} attackingActor - The actor that dealt the killing blow
   */
  static async checkFearmonger(targetActor, attackingActor) {
    // Check if attacker has Fearmonger from class features
    const fmClassItem = attackingActor?.items?.find(i => i.type === 'class');
    const fmLevel = attackingActor?.system?.attributes?.level?.value || 1;
    const hasFearmonger = fmClassItem ? (fmClassItem.system.levelFeatures || []).some(f =>
      (f.level || 99) <= fmLevel && (f.name || '').toLowerCase().includes('fearmonger')
    ) : false;
    if (!hasFearmonger) return;
    if (!canvas?.tokens?.placeables) return;

    const attackerLevel = attackingActor.system.attributes?.level?.value || 1;
    const currentRound = game.combat?.round || 0;

    // Find the killed token on canvas
    const killedToken = canvas.tokens.placeables.find(t => t.actor?.id === targetActor.id);
    if (!killedToken) return;

    // Find nearby NPC tokens within 30ft with HD < attacker's Level
    const frightenedTokens = [];
    for (const token of canvas.tokens.placeables) {
      if (!token.actor || token.actor.type !== 'npc') continue;
      if (token.id === killedToken.id) continue;
      // Skip already-dead NPCs
      const tokenHP = token.actor.system.health?.value ?? token.actor.system.hp?.value ?? 1;
      if (tokenHP <= 0) continue;

      // Check distance (30ft = Near)
      const dist = canvas.grid.measurePath([killedToken.center, token.center]).distance;
      if (dist > 30) continue;

      // Check HD < attacker Level
      const hd = token.actor.system.hd || token.actor.system.hitDice || 0;
      if (hd >= attackerLevel) continue;

      // Check status immunity
      const statusImmunities = token.actor.system.statusImmunities || [];
      if (statusImmunities.includes('frightened')) continue;

      frightenedTokens.push(token);
    }

    if (frightenedTokens.length === 0) return;

    // Apply Frightened with auto-expire flag
    for (const token of frightenedTokens) {
      if (token.actor.statuses?.has('frightened')) continue;

      const frightDef = CONFIG.statusEffects.find(e => e.id === 'frightened');
      if (!frightDef) continue;

      const effectData = {
        name: frightDef.name || 'Frightened',
        img: frightDef.img || 'icons/svg/hazard.svg',
        statuses: ['frightened'],
        changes: frightDef.changes || [],
        flags: {
          vagabond: {
            fearmongerExpireRound: currentRound + 1
          }
        }
      };
      await token.actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }

    ui.notifications.info(`Fearmonger: ${frightenedTokens.length} enemy(s) Frightened!`);
  }

  /**
   * Check if a weapon hit should apply burning/status effects via countdown dice.
   * Three-source priority: explicit override > weapon flags > actor relic power.
   * @param {Actor} targetActor - The target being hit
   * @param {Actor} sourceActor - The attacker
   * @param {string|null} damageType - Override damage type
   * @param {string|null} dieTypeOverride - Override die type (e.g. from spell)
   * @param {Item|null} sourceItem - The weapon/item used
   */
  static async checkOnHitBurning(targetActor, sourceActor, damageType = null, dieTypeOverride = null, sourceItem = null) {
    if (!sourceActor?.system) return;

    // Don't apply effects to a dead target
    const targetHP = targetActor.system.health?.value ?? 0;
    if (targetHP <= 0) return;

    // Determine what on-hit effects apply
    const properties = sourceItem?.system?.properties || [];
    const hasBurningProperty = properties.includes('Burning');
    const hasStatusProperty = properties.includes('Status');
    const weaponFlags = sourceItem?.flags?.vagabond?.onHitBurning || {};

    // Determine countdown die source: explicit override > weapon flags > actor relic power
    let countdownDie = dieTypeOverride;
    let burningDamageType = damageType;
    let statusCondition = weaponFlags.statusCondition || '';

    // Check weapon-level flags (shared countdown die for both Burning and Status)
    if (!countdownDie && sourceItem) {
      if (weaponFlags.dieType) {
        countdownDie = weaponFlags.dieType;
        burningDamageType = burningDamageType || weaponFlags.damageType || sourceItem.system?.damageType || 'fire';
      }
    }

    // Fall back to actor-level relic power (burning only, always fire)
    if (!countdownDie) {
      countdownDie = sourceActor.system.onHitBurningDice;
      burningDamageType = burningDamageType || 'fire';
    }

    // Default damage type
    burningDamageType = burningDamageType || 'fire';

    // Determine if burning should apply
    const shouldBurn = hasBurningProperty || dieTypeOverride || (!hasBurningProperty && !hasStatusProperty && countdownDie);

    // Determine if status should apply
    const shouldStatus = hasStatusProperty && statusCondition;

    // If neither burning nor status applies, nothing to do
    if (!shouldBurn && !shouldStatus) return;
    if (!countdownDie || typeof countdownDie !== 'string' || countdownDie.trim() === '') return;

    // Validate die type
    const validDice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
    const finalDieType = validDice.includes(countdownDie.trim().toLowerCase()) ? countdownDie.trim().toLowerCase() : 'd4';

    // Find the target's token ID and scene for linked cleanup
    const targetToken = canvas?.tokens?.placeables?.find(t => t.actor?.id === targetActor.id);
    const tokenIds = targetToken ? [targetToken.id] : [];
    const sceneId = canvas?.scene?.id || '';

    const { CountdownDice } = await import('../documents/countdown-dice.mjs');

    // === BURNING LOGIC ===
    if (shouldBurn) {
      const statusImmunities = targetActor.system.statusImmunities || [];
      if (!statusImmunities.includes('burning')) {
        await this._applyBurningDie(targetActor, sourceActor, finalDieType, burningDamageType, tokenIds, sceneId, statusCondition, shouldStatus, CountdownDice);
        return;
      }
    }

    // === STATUS-ONLY LOGIC (no burning, or burning was immune) ===
    if (shouldStatus) {
      await this._applyStatusDie(targetActor, sourceActor, finalDieType, statusCondition, tokenIds, sceneId, CountdownDice);
    }
  }

  /**
   * Apply a burning countdown die to a target. If Status property is also active,
   * the same die tracks both burning damage and the status condition.
   * @private
   */
  static async _applyBurningDie(targetActor, sourceActor, finalDieType, burningDamageType, tokenIds, sceneId, statusCondition, shouldStatus, CountdownDice) {
    // Check for existing burning dice on this target with the same damage type
    const existingDice = CountdownDice.getAll().filter(dice => {
      const link = dice.flags?.vagabond?.linkedStatusEffect;
      if (!link || link.status !== 'burning') return false;
      if (link.damageType !== burningDamageType) return false;
      if (link.tokenIds?.some(id => tokenIds.includes(id))) return true;
      const diceName = dice.flags?.vagabond?.countdownDice?.name || '';
      if (diceName.includes(targetActor.name)) return true;
      return false;
    });

    if (existingDice.length > 0) {
      const DICE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      const existing = existingDice[0];
      const existingType = existing.flags.vagabond.countdownDice.diceType;
      const existingIndex = DICE_ORDER.indexOf(existingType);
      const newIndex = DICE_ORDER.indexOf(finalDieType);

      if (newIndex > existingIndex) {
        await existing.update({ 'flags.vagabond.countdownDice.diceType': finalDieType });
        ui.notifications.info(`${targetActor.name}'s ${burningDamageType} Burning upgraded to C${finalDieType}!`);
      }
      return;
    }

    try {
      if (!targetActor.statuses?.has('burning')) {
        await targetActor.toggleStatusEffect('burning', { active: true });
      }

      if (shouldStatus && statusCondition && statusCondition !== 'burning') {
        if (!targetActor.statuses?.has(statusCondition)) {
          await targetActor.toggleStatusEffect(statusCondition, { active: true });
        }
      }

      const typeIcons = {
        fire: 'fa-fire', cold: 'fa-snowflake', poison: 'fa-skull-crossbones',
        shock: 'fa-bolt', acid: 'fa-flask', necrotic: 'fa-ghost',
        psychic: 'fa-brain', magical: 'fa-sparkles',
      };
      const icon = typeIcons[burningDamageType] || 'fa-fire';
      const label = burningDamageType.charAt(0).toUpperCase() + burningDamageType.slice(1);

      let dieName = `Burning (${label}): ${targetActor.name}`;
      if (shouldStatus && statusCondition) {
        const statusLabel = statusCondition.charAt(0).toUpperCase() + statusCondition.slice(1);
        dieName = `Burning (${label}) + ${statusLabel}: ${targetActor.name}`;
      }

      const journal = await CountdownDice.create({
        name: dieName,
        diceType: finalDieType,
        size: 'S',
        ownership: { default: 3, [game.user.id]: 3 }
      });

      if (journal) {
        await journal.setFlag('vagabond', 'linkedStatusEffect', {
          status: 'burning',
          label: `Burning (${label})`,
          damageType: burningDamageType,
          statusCondition: shouldStatus ? statusCondition : '',
          tokenIds: tokenIds,
          sceneId: sceneId
        });
      }

      const { VagabondChatCard } = await import('./chat-card.mjs');
      let desc = `<p><i class="fas ${icon}"></i> <strong>${targetActor.name} is burning!</strong></p>
          <p>Burning (${label}) for <strong>C${finalDieType}</strong>!</p>`;
      if (shouldStatus && statusCondition) {
        const statusLabel = statusCondition.charAt(0).toUpperCase() + statusCondition.slice(1);
        desc += `<p><i class="fas fa-bolt"></i> Also applying <strong>${statusLabel}</strong> for the duration.</p>`;
      }
      desc += `<p><em>Roll the countdown die each round - on a 1, it shrinks or ends.</em></p>`;

      const card = new VagabondChatCard()
        .setType('generic')
        .setActor(sourceActor)
        .setTitle('Burning!')
        .setSubtitle(targetActor.name)
        .setDescription(desc);
      await card.send();
    } catch (e) {
      console.error('Vagabond | On-Hit Burning error:', e);
    }
  }

  /**
   * Apply a status-only countdown die (no burning damage).
   * The die tracks how long the status condition lasts.
   * @private
   */
  static async _applyStatusDie(targetActor, sourceActor, finalDieType, statusCondition, tokenIds, sceneId, CountdownDice) {
    const statusImmunities = targetActor.system.statusImmunities || [];
    if (statusImmunities.includes(statusCondition)) return;

    const existingDice = CountdownDice.getAll().filter(dice => {
      const link = dice.flags?.vagabond?.linkedStatusEffect;
      if (!link || link.status !== statusCondition) return false;
      if (link.tokenIds?.some(id => tokenIds.includes(id))) return true;
      const diceName = dice.flags?.vagabond?.countdownDice?.name || '';
      if (diceName.includes(targetActor.name)) return true;
      return false;
    });

    if (existingDice.length > 0) {
      const DICE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      const existing = existingDice[0];
      const existingType = existing.flags.vagabond.countdownDice.diceType;
      const existingIndex = DICE_ORDER.indexOf(existingType);
      const newIndex = DICE_ORDER.indexOf(finalDieType);

      if (newIndex > existingIndex) {
        await existing.update({ 'flags.vagabond.countdownDice.diceType': finalDieType });
        const statusLabel = statusCondition.charAt(0).toUpperCase() + statusCondition.slice(1);
        ui.notifications.info(`${targetActor.name}'s ${statusLabel} upgraded to C${finalDieType}!`);
      }
      return;
    }

    try {
      if (!targetActor.statuses?.has(statusCondition)) {
        await targetActor.toggleStatusEffect(statusCondition, { active: true });
      }

      const statusLabel = statusCondition.charAt(0).toUpperCase() + statusCondition.slice(1);

      const journal = await CountdownDice.create({
        name: `${statusLabel}: ${targetActor.name}`,
        diceType: finalDieType,
        size: 'S',
        ownership: { default: 3, [game.user.id]: 3 }
      });

      if (journal) {
        await journal.setFlag('vagabond', 'linkedStatusEffect', {
          status: statusCondition,
          label: statusLabel,
          tokenIds: tokenIds,
          sceneId: sceneId
        });
      }

      const { VagabondChatCard } = await import('./chat-card.mjs');
      const card = new VagabondChatCard()
        .setType('generic')
        .setActor(sourceActor)
        .setTitle(`${statusLabel}!`)
        .setSubtitle(targetActor.name)
        .setDescription(`
          <p><i class="fas fa-bolt"></i> <strong>${targetActor.name} is ${statusLabel}!</strong></p>
          <p>Duration: <strong>C${finalDieType}</strong></p>
          <p><em>Roll the countdown die each round - on a 1, it shrinks or ends.</em></p>
        `);
      await card.send();
    } catch (e) {
      console.error('Vagabond | On-Hit Status error:', e);
    }
  }
}
