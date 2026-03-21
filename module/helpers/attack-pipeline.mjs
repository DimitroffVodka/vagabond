/**
 * Shared weapon attack pipeline used by both the character sheet and crawler bar.
 * This is the SINGLE SOURCE OF TRUTH for all weapon attack logic including
 * class features, favor modifiers, range validation, brawl intents, etc.
 *
 * IMPORTANT: Any new class features that affect weapon attacks MUST be added here
 * and will automatically work in both the character sheet and crawler bar.
 */

import { TargetHelper } from './target-helper.mjs';
import { VagabondItemSequencer } from './item-sequencer.mjs';

/**
 * Perform a full weapon attack: validation, favor, class features, roll, damage, chat card.
 *
 * @param {Actor} actor - The attacking actor
 * @param {Item} item - The weapon item
 * @param {Object} [options={}]
 * @param {boolean} [options.shiftKey=false] - Shift held (favor toggle)
 * @param {boolean} [options.ctrlKey=false] - Ctrl held (hinder toggle)
 * @param {Array}  [options.targets] - Pre-captured targets; defaults to game.user.targets
 * @returns {Promise<Roll|null>} The attack roll, or null if cancelled/failed
 */
export async function performWeaponAttack(actor, item, options = {}) {
  const { VagabondChatCard } = globalThis.vagabond.utils;
  const { EquipmentHelper } = globalThis.vagabond.utils;
  const { VagabondDamageHelper } = await import('./damage-helper.mjs');
  const { VagabondRollBuilder } = await import('./roll-builder.mjs');

  const isWeapon = EquipmentHelper.isWeapon(item);
  const isAlchemical = EquipmentHelper.isAlchemical(item);

  if (!isWeapon && !isAlchemical) {
    ui.notifications.warn('This item cannot be used as a weapon.');
    return null;
  }

  // ── Consumable requirements ──
  if (item.type === 'equipment') {
    const canUse = await item.checkConsumableRequirements?.();
    if (canUse === false) return null;
  }

  // ── Capture targets ──
  let targetsAtRollTime = options.targets ?? TargetHelper.captureCurrentTargets();

  // ── Bard — Virtuoso intercept ──
  if (isWeapon && item.system.weaponSkill === 'performance' && (actor.system.hasVirtuoso || false)) {
    const { performVirtuoso } = await import('./bard-helper.mjs');
    await performVirtuoso(actor, targetsAtRollTime);
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════
  // PATH A: ALCHEMICAL (no attack roll — direct damage)
  // ══════════════════════════════════════════════════════════════════════
  if (isAlchemical) {
    const hasDamage =
      item.system.damageType &&
      item.system.damageType !== '-' &&
      item.system.damageAmount;

    if (!hasDamage) {
      await VagabondChatCard.gearUse(actor, item, targetsAtRollTime);
      await item.handleConsumption?.();
      return null;
    }

    let damageFormula = item.system.damageAmount;
    const roll = new Roll(damageFormula);
    await roll.evaluate();

    const damageTypeKey = item.system.damageType || 'physical';
    const isRestorative = ['healing', 'recover', 'recharge'].includes(damageTypeKey);

    let description = '';
    if (item.system.description) {
      const { VagabondTextParser } = await import('./text-parser.mjs');
      const parsedDescription = VagabondTextParser.parseCountdownDice(item.system.description);
      description = await foundry.applications.ux.TextEditor.enrichHTML(parsedDescription, { async: true });
    }

    // FX
    const casterToken = actor.token?.object ?? actor.getActiveTokens(true)[0];
    const resolvedTargets = TargetHelper.resolveTargets(targetsAtRollTime);
    try { VagabondItemSequencer.play(item, casterToken, resolvedTargets, true); } catch {}

    await VagabondChatCard.createActionCard({
      actor, item,
      title: item.name,
      subtitle: actor.name,
      damageRoll: roll,
      damageType: damageTypeKey,
      description,
      attackType: isRestorative ? 'none' : 'melee',
      hasDefenses: !isRestorative,
      targetsAtRollTime,
    });

    await item.handleConsumption?.();
    return roll;
  }

  // ══════════════════════════════════════════════════════════════════════
  // PATH B: WEAPON ATTACK
  // ══════════════════════════════════════════════════════════════════════

  // ── Auto-fail check ──
  if (actor.system.autoFailAllRolls) {
    await VagabondChatCard.autoFailRoll(actor, 'weapon', item.name);
    ui.notifications.warn(`${actor.name} cannot attack due to status conditions.`);
    return null;
  }

  // ── Rage: prompt Berserk ──
  if (actor.system.hasRage && !actor.statuses?.has('berserk')) {
    const goBerserk = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Go Berserk?' },
      content: '<p>Activate Rage and go Berserk? (die upsize, explode, damage reduction)</p>',
      buttons: [
        { action: 'yes', label: 'Go Berserk!', icon: 'fas fa-fire-flame-curved' },
        { action: 'no', label: 'No', icon: 'fas fa-times' }
      ]
    });
    if (goBerserk === 'yes') {
      await actor.toggleStatusEffect('berserk');
    } else if (!goBerserk) {
      return null; // cancelled
    }
  }

  // ── Target validation ──
  if (isWeapon) {
    if (targetsAtRollTime.length === 0) {
      ui.notifications.warn('You must target an enemy before attacking.');
      return null;
    }
    const hasCleave = item.system?.properties?.includes('Cleave');
    const maxTargets = hasCleave ? 2 : 1;
    if (targetsAtRollTime.length > maxTargets) {
      ui.notifications.warn(`${item.name} can only target ${maxTargets} ${maxTargets === 1 ? 'enemy' : 'enemies'}. Targeting the first ${maxTargets}.`);
      targetsAtRollTime = targetsAtRollTime.slice(0, maxTargets);
    }
  }

  // ── Range validation ──
  let rangeHinder = false;
  let rangeBand = null;
  if (isWeapon && targetsAtRollTime.length > 0) {
    const attackerToken = actor.token?.object ?? actor.getActiveTokens(true)[0];
    if (attackerToken) {
      const targetTokenObj = canvas.tokens?.get(targetsAtRollTime[0].tokenId);
      if (targetTokenObj) {
        const rangeResult = TargetHelper.validateWeaponRange(item, attackerToken, targetTokenObj);
        rangeBand = rangeResult.band;
        if (!rangeResult.allowed) {
          ui.notifications.warn(`${item.name}: ${rangeResult.reason}`);
          return null;
        }
        if (rangeResult.hinder) {
          rangeHinder = true;
          ui.notifications.info(`${item.name}: ${rangeResult.reason}`);
        }
      }
    }
  }

  // ── Favor / Hinder calculation ──
  const systemFavorHinder = actor.system.favorHinder || 'none';
  let favorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(
    systemFavorHinder,
    options.shiftKey || false,
    options.ctrlKey || false
  );

  // Range-based Hinder
  if (rangeHinder) {
    if (favorHinder === 'favor') favorHinder = 'none';
    else if (favorHinder === 'none') favorHinder = 'hinder';
  }

  // Virtuoso Valor: Favor on Attack and Cast Checks
  if (favorHinder !== 'favor' && (actor.system.virtuosoAttacksFavor || false)) {
    if (favorHinder === 'hinder') { favorHinder = 'none'; }
    else if (favorHinder === 'none') { favorHinder = 'favor'; }
  }

  // Bloodthirsty: Favor on attacks against targets missing any HP
  if (favorHinder !== 'favor' && actor.system.hasBloodthirsty) {
    const hasWoundedTarget = targetsAtRollTime.some(t => {
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

  // Choreographer: one-check Favor (consume after roll)
  const hasChoreographerFavor = actor.getFlag('vagabond', 'choreographerFavorOneCheck') || false;
  if (hasChoreographerFavor) {
    if (favorHinder === 'hinder') { favorHinder = 'none'; }
    else { favorHinder = 'favor'; }
  }

  // ── Brawl / Entangle / Shield intent dialog ──
  let brawlIntent = 'damage';
  const hasBrawl = item.system?.properties?.includes('Brawl');
  const hasEntangle = item.system?.properties?.includes('Entangle');
  const hasShield = item.system?.properties?.includes('Shield');

  if ((hasBrawl || hasEntangle || hasShield) && targetsAtRollTime?.length >= 1) {
    const sizeOrder = ['small', 'medium', 'large', 'huge', 'giant', 'colossal'];
    const attackerSize = actor.system.ancestryData?.size || actor.system.size || 'medium';
    const attackerSizeIdx = sizeOrder.indexOf(attackerSize);
    const shoveSizeOverride = actor.system.shoveSizeOverride;
    const shoveSizeIdx = shoveSizeOverride ? sizeOrder.indexOf(shoveSizeOverride) : attackerSizeIdx;
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
      const buttons = [
        { action: 'damage', label: 'Damage', icon: 'fas fa-dice' }
      ];
      if ((hasBrawl || hasEntangle) && hasGrappleTarget) {
        buttons.push({ action: 'grapple', label: 'Grapple', icon: 'fas fa-hand-fist' });
      }
      if ((hasBrawl || hasShield) && hasShoveTarget) {
        buttons.push({ action: 'shove', label: 'Shove', icon: 'fas fa-hand-back-fist' });
      }

      const dialogTitle = hasBrawl ? 'Brawl Attack' : hasEntangle ? 'Entangle Attack' : 'Shield Attack';
      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: dialogTitle },
        content: '<p>Choose your attack intent:</p>',
        buttons
      });

      if (!choice) return null; // cancelled
      brawlIntent = choice;

      // Apply Favor for Grapple/Shove checks if actor has brawlCheckFavor
      if (brawlIntent !== 'damage') {
        const brawlCheckFavor = actor.system.brawlCheckFavor || false;
        let favorApplied = false;
        if (brawlCheckFavor) {
          if (favorHinder === 'hinder') favorHinder = 'none';
          else if (favorHinder === 'none') favorHinder = 'favor';
          favorApplied = true;
        }

        // Bully perk: Favor on Grapple/Shove only when target is STRICTLY SMALLER
        if (!favorApplied && (actor.system.hasBully || false)) {
          const hasStrictlySmallerTarget = targetsAtRollTime.some(t => {
            const tActor = game.actors.get(t.actorId);
            if (!tActor) return false;
            const tSize = tActor.system.ancestryData?.size || tActor.system.size || 'medium';
            return sizeOrder.indexOf(tSize) < attackerSizeIdx;
          });
          if (hasStrictlySmallerTarget) {
            if (favorHinder === 'hinder') favorHinder = 'none';
            else if (favorHinder === 'none') favorHinder = 'favor';
          }
        }
      }
    }
  }

  // ── Attack Roll ──
  const attackResult = await item.rollAttack(actor, favorHinder);
  if (!attackResult) return null;

  // Reset check bonus after attack
  if (actor.system.manualCheckBonus !== 0) {
    await actor.update({ 'system.manualCheckBonus': 0 });
  }

  // Consume choreographer one-check favor AFTER the roll
  if (hasChoreographerFavor) {
    await actor.unsetFlag('vagabond', 'choreographerFavorOneCheck');
  }

  // ── FX ──
  const casterToken = actor.token?.object ?? actor.getActiveTokens(true)[0];
  const resolvedTargets = TargetHelper.resolveTargets(targetsAtRollTime);
  try { VagabondItemSequencer.play(item, casterToken, resolvedTargets, attackResult.isHit); } catch {}

  // ── Damage Roll ──
  let damageRoll = null;
  if (VagabondDamageHelper.shouldRollDamage(attackResult.isHit)) {
    const statKey = attackResult.weaponSkill?.stat || null;
    damageRoll = await item.rollDamage(actor, attackResult.isCritical, statKey);
  }

  // ── Attach metadata ──
  if (rangeBand) attackResult.rangeBand = rangeBand;
  if (rangeHinder) attackResult.rangeHinder = true;
  attackResult.brawlIntent = brawlIntent;

  // Imbue spell data
  const imbueData = item.getFlag('vagabond', 'imbue');
  if (imbueData) {
    attackResult.imbue = imbueData;
  }

  // ── Chat Card ──
  await VagabondChatCard.weaponAttack(actor, item, attackResult, damageRoll, targetsAtRollTime);

  // ── Post-attack cleanup ──

  // Consume Imbue on hit (unless caster is Focusing the spell)
  if (imbueData && attackResult.isHit) {
    const casterActor = game.actors.get(imbueData.casterActorId);
    const focusedSpells = casterActor?.system?.focus?.spellIds || [];
    const isFocused = focusedSpells.includes(imbueData.spellId);
    if (!isFocused) {
      await item.unsetFlag('vagabond', 'imbue');
    }
  }

  // Handle consumption (throwable weapons, etc.)
  await item.handleConsumption?.();

  return attackResult.roll;
}
