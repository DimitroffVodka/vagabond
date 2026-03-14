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

      // Virtuoso Resolve: Favor on Saves (granted by Bard's Virtuoso performance)
      if (rollType === 'save' && (this.actor.system.virtuosoSavesFavor || false)) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else if (favorHinder === 'none') { favorHinder = 'favor'; }
      }

      const roll = await VagabondRollBuilder.buildAndEvaluateD20(
        this.actor,
        favorHinder
        // baseFormula intentionally omitted — uses homebrew dice.baseCheck config
      );

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

    // 1. Target Safety
    const element = target || event.currentTarget;
    const itemId = element.dataset.itemId || element.closest('[data-item-id]')?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) {
      ui.notifications.error('Item not found!');
      return;
    }

    // Import helpers
    const { EquipmentHelper } = globalThis.vagabond.utils;
    const { VagabondChatCard } = globalThis.vagabond.utils;

    // 2. Define Item Types
    const isWeapon = EquipmentHelper.isWeapon(item);
    const isAlchemical = EquipmentHelper.isAlchemical(item);

    if (!isWeapon && !isAlchemical) {
      ui.notifications.warn(game.i18n.localize('VAGABOND.UI.Errors.ItemNotRollable'));
      return;
    }

    // 3. Check consumable requirements
    if (item.type === 'equipment') {
      const canUse = await item.checkConsumableRequirements();
      if (!canUse) {
        return; // Notification already shown
      }
    }

    // Capture targeted tokens at roll time
    let targetsAtRollTime = TargetHelper.captureCurrentTargets();

    // Bard — Virtuoso: intercept weapon items using Performance skill when actor has Virtuoso
    if (isWeapon && item.system.weaponSkill === 'performance' && (this.actor.system.hasVirtuoso || false)) {
      const { performVirtuoso } = await import('../../helpers/bard-helper.mjs');
      await performVirtuoso(this.actor, targetsAtRollTime);
      return;
    }

    // Target confirmation dialog
    const actionType = TargetHelper.classifyActionType(item.system.damageType);
    const confirmed = await TargetHelper.confirmTargets(targetsAtRollTime, {
      actionType,
      actionName: item.name,
      requireTargets: false,
    });
    if (confirmed === null) return;
    targetsAtRollTime = confirmed;

    // ── Range Validation ──────────────────────────────────────────────────
    // Check weapon range vs distance to targets and apply Hinder/block as needed
    let rangeHinder = false;
    let rangeBand = null;
    if (isWeapon && targetsAtRollTime.length > 0) {
      const attackerToken = this.actor.token?.object ?? this.actor.getActiveTokens(true)[0];
      if (attackerToken) {
        // Check the first (primary) target for range
        const targetTokenObj = canvas.tokens?.get(targetsAtRollTime[0].tokenId);
        if (targetTokenObj) {
          const rangeResult = TargetHelper.validateWeaponRange(item, attackerToken, targetTokenObj);
          rangeBand = rangeResult.band;

          if (!rangeResult.allowed) {
            ui.notifications.warn(`${item.name}: ${rangeResult.reason}`);
            return;
          }
          if (rangeResult.hinder) {
            rangeHinder = true;
            ui.notifications.info(`${item.name}: ${rangeResult.reason}`);
          }
        }
      }
    }

    try {
      /* PATH A: ALCHEMICAL */
      if (isAlchemical) {
        // SMART CHECK: If no damage type or no formula, treat as generic "Use Item"
        const hasDamage =
          item.system.damageType &&
          item.system.damageType !== '-' &&
          item.system.damageAmount;

        if (!hasDamage) {
          // Redirect to the simple Gear Use card
          await VagabondChatCard.gearUse(this.actor, item, targetsAtRollTime);
          // Handle consumption after successful use
          await item.handleConsumption();
          return;
        }

        // Otherwise, proceed with the Roll logic
        let damageFormula = item.system.damageAmount;
        const roll = new Roll(damageFormula);
        await roll.evaluate();

        const damageTypeKey = item.system.damageType || 'physical';
        const isRestorative = ['healing', 'recover', 'recharge'].includes(damageTypeKey);

        // Build description
        let description = '';
        if (item.system.description) {
          const parsedDescription = VagabondTextParser.parseCountdownDice(
            item.system.description
          );
          description = await foundry.applications.ux.TextEditor.enrichHTML(parsedDescription, {
            async: true,
          });
        }

        // Play item FX animation (alchemicals always "hit" — no attack roll)
        const alcCasterToken = this.actor.token?.object ?? this.actor.getActiveTokens(true)[0];
        const alcTargets = TargetHelper.resolveTargets(targetsAtRollTime);
        VagabondItemSequencer.play(item, alcCasterToken, alcTargets, true);

        // Use createActionCard for consistency with other items
        await VagabondChatCard.createActionCard({
          actor: this.actor,
          item: item,
          title: item.name,
          subtitle: this.actor.name,
          damageRoll: roll,
          damageType: damageTypeKey,
          description: description,
          attackType: isRestorative ? 'none' : 'melee',
          hasDefenses: !isRestorative,
          targetsAtRollTime: targetsAtRollTime,
        });

        // Handle consumption after successful use
        await item.handleConsumption();
        return roll;
      }

      /* PATH B: WEAPONS */
      // Check for auto-fail conditions before rolling weapon attack
      const autoFailAllRolls = this.actor.system.autoFailAllRolls || false;
      if (autoFailAllRolls) {
        // Import chat card helper
        const { VagabondChatCard } = await import('../../helpers/chat-card.mjs');

        // Post auto-fail message to chat
        await VagabondChatCard.autoFailRoll(this.actor, 'weapon', item.name);

        // Show notification
        ui.notifications.warn(`${this.actor.name} cannot attack due to status conditions.`);
        return;
      }

      const { VagabondDamageHelper } = await import('../../helpers/damage-helper.mjs');
      const { VagabondRollBuilder } = await import('../../helpers/roll-builder.mjs');

      // Rage: prompt to go Berserk if Barbarian has Rage and isn't already Berserk
      const _classItem = this.actor.items.find(i => i.type === 'class');
      const _actorLevel = this.actor.system.attributes?.level?.value || 1;
      const _hasRage = _classItem ? (_classItem.system.levelFeatures || []).some(f =>
        (f.level || 99) <= _actorLevel && (f.name || '').toLowerCase().includes('rage')
      ) : false;
      if (_hasRage && !this.actor.statuses?.has('berserk')) {
        const goBerserk = await foundry.applications.api.DialogV2.wait({
          window: { title: 'Go Berserk?' },
          content: '<p>Activate Rage and go Berserk? (die upsize, explode, damage reduction)</p>',
          buttons: [
            { action: 'yes', label: 'Go Berserk!', icon: 'fas fa-fire-flame-curved' },
            { action: 'no', label: 'No', icon: 'fas fa-times' }
          ]
        });
        if (goBerserk === 'yes') {
          await this.actor.toggleStatusEffect('berserk');
        } else if (!goBerserk) {
          return; // Dialog closed/cancelled
        }
      }

      const systemFavorHinder = this.actor.system.favorHinder || 'none';
      let favorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(
        systemFavorHinder,
        event.shiftKey,
        event.ctrlKey
      );

      // Apply range-based Hinder (Ranged at Close, Thrown at Far)
      if (rangeHinder) {
        if (favorHinder === 'favor') favorHinder = 'none';
        else if (favorHinder === 'none') favorHinder = 'hinder';
        // Already hinder stays hinder
      }

      // Brawl/Shield property: pre-roll intent dialog
      // Brawl: Damage / Grapple / Shove — Shield: Damage / Shove only
      let brawlIntent = 'damage'; // default
      const hasBrawl = item.system?.properties?.includes('Brawl');
      const hasShield = item.system?.properties?.includes('Shield');

      if ((hasBrawl || hasShield) && targetsAtRollTime?.length >= 1) {
        // Size check: can only Grapple/Shove beings your size or smaller
        // Shove may use a different effective size (e.g., Vanguard: Large/Huge for Shoves)
        const sizeOrder = ['small', 'medium', 'large', 'huge', 'giant', 'colossal'];
        const attackerSize = this.actor.system.ancestryData?.size || this.actor.system.size || 'medium';
        const attackerSizeIdx = sizeOrder.indexOf(attackerSize);
        const shoveSizeOverride = this.actor.system.shoveSizeOverride;
        const shoveSizeIdx = shoveSizeOverride ? sizeOrder.indexOf(shoveSizeOverride) : attackerSizeIdx;
        // Use the larger of real size and shove override
        const effectiveShoveSizeIdx = Math.max(attackerSizeIdx, shoveSizeIdx);
        const hasGrappleTarget = targetsAtRollTime.some(t => {
          const targetActor = game.actors.get(t.actorId);
          if (!targetActor) return false;
          const targetSize = targetActor.system.ancestryData?.size || targetActor.system.size || 'medium';
          return sizeOrder.indexOf(targetSize) <= attackerSizeIdx;
        });

        const hasShoveTarget = targetsAtRollTime.some(t => {
          const targetActor = game.actors.get(t.actorId);
          if (!targetActor) return false;
          const targetSize = targetActor.system.ancestryData?.size || targetActor.system.size || 'medium';
          return sizeOrder.indexOf(targetSize) <= effectiveShoveSizeIdx;
        });

        if (hasGrappleTarget || hasShoveTarget) {
          // Build buttons based on weapon properties and eligible targets
          const buttons = [
            { action: 'damage', label: 'Damage', icon: 'fas fa-dice' }
          ];
          if (hasBrawl && hasGrappleTarget) {
            buttons.push({ action: 'grapple', label: 'Grapple', icon: 'fas fa-hand-fist' });
          }
          if (hasShoveTarget) {
            buttons.push({ action: 'shove', label: 'Shove', icon: 'fas fa-hand-back-fist' });
          }

          const dialogTitle = hasBrawl ? 'Brawl Attack' : 'Shield Attack';
          const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: dialogTitle },
            content: '<p>Choose your attack intent:</p>',
            buttons
          });

          if (!choice) return; // dialog cancelled
          brawlIntent = choice;

          // Apply Favor for Grapple/Shove checks if actor has brawlCheckFavor
          // (e.g., Orc Beefy trait: "Favor on Checks to Grapple or Shove")
          if (brawlIntent !== 'damage') {
            const brawlCheckFavor = this.actor.system.brawlCheckFavor || false;
            let favorApplied = false;
            if (brawlCheckFavor) {
              if (favorHinder === 'hinder') {
                favorHinder = 'none'; // Favor cancels Hinder
              } else if (favorHinder === 'none') {
                favorHinder = 'favor';
              }
              // If already 'favor', stays 'favor' (doesn't stack)
              favorApplied = true;
            }

            // Bully perk: Favor on Grapple/Shove only when target is STRICTLY SMALLER
            if (!favorApplied && (this.actor.system.hasBully || false)) {
              const hasStrictlySmallerTarget = targetsAtRollTime.some(t => {
                const tActor = game.actors.get(t.actorId);
                if (!tActor) return false;
                const tSize = tActor.system.ancestryData?.size || tActor.system.size || 'medium';
                return sizeOrder.indexOf(tSize) < attackerSizeIdx;
              });
              if (hasStrictlySmallerTarget) {
                if (favorHinder === 'hinder') {
                  favorHinder = 'none';
                } else if (favorHinder === 'none') {
                  favorHinder = 'favor';
                }
              }
            }
          }
        }
      }

      // Bloodthirsty: Favor on attacks against targets missing any HP
      const _hasBloodthirsty = _classItem ? (_classItem.system.levelFeatures || []).some(f =>
        (f.level || 99) <= _actorLevel && (f.name || '').toLowerCase().includes('bloodthirsty')
      ) : false;
      if (favorHinder !== 'favor' && _hasBloodthirsty) {
        const hasWoundedTarget = targetsAtRollTime.some(t => {
          // Resolve via token first (handles unlinked NPC tokens), fall back to world actor
          const token = canvas.tokens?.get(t.tokenId);
          const tActor = token?.actor || game.actors.get(t.actorId);
          if (!tActor) return false;
          const hp = tActor.system.health;
          return hp && hp.value < hp.max;
        });
        if (hasWoundedTarget) {
          if (favorHinder === 'hinder') { favorHinder = 'none'; }
          else if (favorHinder === 'none') { favorHinder = 'favor'; }
        }
      }

      // Virtuoso Valor: Favor on Attack and Cast Checks
      if (favorHinder !== 'favor' && (this.actor.system.virtuosoAttacksFavor || false)) {
        if (favorHinder === 'hinder') { favorHinder = 'none'; }
        else if (favorHinder === 'none') { favorHinder = 'favor'; }
      }

      // Luck spending: offer to spend 1 Luck for Favor if not already Favored
      const promptLuck = game.settings.get('vagabond', 'promptLuckSpend');
      if (promptLuck && favorHinder !== 'favor' && this.actor.system.currentLuck > 0 && this.actor.system.hasLuckPool) {
        const spendLuck = await foundry.applications.api.DialogV2.wait({
          window: { title: 'Spend Luck?' },
          content: `<p>Spend 1 Luck for Favor? (${this.actor.system.currentLuck}/${this.actor.system.maxLuck} remaining)</p>`,
          buttons: [
            { action: 'yes', label: 'Spend Luck', icon: 'fas fa-clover' },
            { action: 'no', label: 'No', icon: 'fas fa-times' }
          ]
        });
        if (spendLuck === 'yes') {
          const newLuck = this.actor.system.currentLuck - 1;
          await this.actor.update({ 'system.currentLuck': newLuck });
          favorHinder = favorHinder === 'hinder' ? 'none' : 'favor';

          // Unflinching Luck: roll refund die, if result < remaining Luck, refund
          const unflinchingDie = this.actor.system.unflinchingLuckDie || 0;
          if (unflinchingDie > 0) {
            const refundRoll = new Roll(`1d${unflinchingDie}`);
            await refundRoll.evaluate();
            const refunded = refundRoll.total < newLuck;
            await refundRoll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flavor: `<i class="fas fa-clover"></i> Unflinching Luck (d${unflinchingDie}) — rolled ${refundRoll.total} vs ${newLuck} remaining: ${refunded ? '<strong>Luck refunded!</strong>' : 'Luck spent.'}`
            });
            if (refunded) {
              await this.actor.update({ 'system.currentLuck': newLuck + 1 });
            }
          }
        } else if (!spendLuck) {
          return; // Dialog closed/cancelled
        }
      }

      const attackResult = await item.rollAttack(this.actor, favorHinder);
      if (!attackResult) return;

      // Reset check bonus to 0 after any attack roll
      if (this.actor.system.manualCheckBonus !== 0) {
        await this.actor.update({ 'system.manualCheckBonus': 0 });
      }

      // Play item FX animation immediately after attack result (before damage roll)
      // Placed here so it always fires regardless of whether damage rolling succeeds.
      const casterToken = this.actor.token?.object ?? this.actor.getActiveTokens(true)[0];
      const resolvedTargets = TargetHelper.resolveTargets(targetsAtRollTime);
      VagabondItemSequencer.play(item, casterToken, resolvedTargets, attackResult.isHit);

      let damageRoll = null;
      if (VagabondDamageHelper.shouldRollDamage(attackResult.isHit)) {
        const statKey = attackResult.weaponSkill?.stat || null;
        damageRoll = await item.rollDamage(this.actor, attackResult.isCritical, statKey, attackResult.favorHinder);
      }

      // Attach range info to attack result for chat card display
      if (rangeBand) attackResult.rangeBand = rangeBand;
      if (rangeHinder) attackResult.rangeHinder = true;

      await VagabondChatCard.weaponAttack(
        this.actor,
        item,
        attackResult,
        damageRoll,
        targetsAtRollTime,
        brawlIntent
      );
      // Handle consumption after successful attack (regardless of hit/miss)
      await item.handleConsumption();
      return attackResult.roll;
    } catch (error) {
      console.error(error);
      ui.notifications.warn(error.message);
      return;
    }
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

    // 2. Capture targets at use time
    const targetsAtRollTime = TargetHelper.captureCurrentTargets();

    // 3. Delegate to item.roll() which handles consumables, chat cards, and all logic
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
