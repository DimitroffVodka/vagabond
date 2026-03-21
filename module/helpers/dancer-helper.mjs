/**
 * Dancer class feature helpers — Step Up, Choreographer, Double Time, etc.
 */

import { VagabondChatCard } from './chat-card.mjs';

/**
 * Get friendly PC actors that have tokens on the current scene (excluding the dancer).
 * @param {Actor} excludeActor - The actor to exclude (the dancer)
 * @returns {Actor[]} Array of PC actors present on the scene
 */
function _getScenePCsExcluding(excludeActor) {
  const sceneTokens = canvas.tokens?.placeables || [];
  const seen = new Set();
  const pcs = [];
  for (const token of sceneTokens) {
    const a = token.actor;
    if (!a || a.type !== 'character') continue;
    if (a.id === excludeActor?.id) continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    pcs.push(a);
  }
  return pcs;
}

/**
 * Core Step Up logic — Dancer uses Action to grant an ally a bonus Action
 * and gains 2d20 on Reflex Saves until next turn.
 * @param {Actor} actor - The Dancer actor
 */
export async function performStepUp(actor) {
  if (!actor.system.hasStepUp) {
    ui.notifications.warn(`${actor.name} does not have the Step Up feature.`);
    return;
  }

  const allies = _getScenePCsExcluding(actor);
  if (allies.length === 0) {
    ui.notifications.warn('No allies on the scene to target with Step Up.');
    return;
  }

  const hasDoubleTime = actor.system.hasDoubleTime || false;
  const hasChoreographer = actor.system.hasChoreographer || false;
  const maxTargets = hasDoubleTime ? 2 : 1;

  // Build ally selection dialog
  const allyOptions = allies.map(a => {
    const token = canvas.tokens?.placeables.find(t => t.actor?.id === a.id);
    const img = token?.document?.texture?.src || a.img;
    return `<label class="step-up-ally" style="display:flex; align-items:center; gap:8px; padding:4px; cursor:pointer;">
      <input type="checkbox" name="ally" value="${a.id}" style="width:16px; height:16px;">
      <img src="${img}" width="32" height="32" style="border:none; border-radius:4px;">
      <span>${a.name}</span>
    </label>`;
  }).join('');

  const targetLabel = hasDoubleTime ? 'up to 2 Allies' : '1 Ally';
  const content = `
    <p><strong>${actor.name}</strong> performs an enlivening dance!</p>
    <p>Choose ${targetLabel} to grant a bonus Action:</p>
    <div style="display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto;">
      ${allyOptions}
    </div>
  `;

  const selectedAllyIds = await new Promise(resolve => {
    const dlg = new foundry.applications.api.DialogV2({
      window: { title: 'Step Up — Choose Ally' },
      content: content,
      buttons: [
        {
          action: 'confirm',
          label: 'Perform Step Up',
          icon: 'fas fa-shoe-prints',
          callback: (_event, _button, dialog) => {
            const checked = dialog.element.querySelectorAll('input[name="ally"]:checked');
            resolve(Array.from(checked).map(cb => cb.value).slice(0, maxTargets));
          }
        },
        {
          action: 'cancel',
          label: 'Cancel',
          callback: () => resolve([])
        }
      ],
      close: () => resolve([])
    });
    dlg.render(true);
  });

  if (!selectedAllyIds || selectedAllyIds.length === 0) return;

  // Apply Step Up effects
  const buffedAllies = [];

  for (const allyId of selectedAllyIds) {
    const ally = game.actors.get(allyId);
    if (!ally) continue;

    // Set flag for bonus Action tracking (reminder/display)
    await ally.setFlag('vagabond', 'stepUpBonusAction', true);
    await ally.setFlag('vagabond', 'stepUpExpireRound', (game.combat?.round || 0) + 1);

    // Choreographer: Ally gets Favor on first check with the granted Action
    // Don't set global favorHinder — the flag drives favor injection at roll time only
    if (hasChoreographer) {
      await ally.setFlag('vagabond', 'choreographerFavorOneCheck', true);
      await ally.setFlag('vagabond', 'choreographerFavorExpireRound', (game.combat?.round || 0) + 1);
    }

    buffedAllies.push(ally);
  }

  // Dancer gains 2d20 on Reflex Saves until next turn
  await actor.update({ 'system.stepUpActive': true });
  await actor.setFlag('vagabond', 'stepUpActiveExpireRound', (game.combat?.round || 0) + 1);

  // Choreographer: Dancer also gains +10ft Speed for the Round
  if (hasChoreographer) {
    await actor.setFlag('vagabond', 'choreographerSpeedBonus', true);
    await actor.setFlag('vagabond', 'choreographerSpeedExpireRound', (game.combat?.round || 0) + 1);
    // Also give speed bonus to buffed allies
    for (const ally of buffedAllies) {
      await ally.setFlag('vagabond', 'choreographerSpeedBonus', true);
      await ally.setFlag('vagabond', 'choreographerSpeedExpireRound', (game.combat?.round || 0) + 1);
    }
    // Re-prepare data so speed updates immediately
    actor.prepareData();
    for (const ally of buffedAllies) ally.prepareData();
  }

  // Build chat card
  const allyNames = buffedAllies.map(a => a.name).join(' and ');
  const tags = [
    { label: 'Step Up', cssClass: 'tag-feature', icon: 'fas fa-shoe-prints' }
  ];
  if (hasChoreographer) {
    tags.push({ label: 'Choreographer', cssClass: 'tag-buff', icon: 'fas fa-crown' });
  }
  if (hasDoubleTime) {
    tags.push({ label: 'Double Time', cssClass: 'tag-buff', icon: 'fas fa-forward' });
  }

  let description = `<p><strong>${actor.name}</strong> performs an enlivening dance!</p>`;
  description += `<p><strong>${allyNames}</strong> ${buffedAllies.length > 1 ? 'gain' : 'gains'} a <strong>2nd Action</strong> this Turn!</p>`;
  description += `<p>${actor.name} Reflex saves are <strong>2d20kh</strong> until the start of your next turn.</p>`;

  if (hasChoreographer) {
    description += `<p>${allyNames} ${buffedAllies.length > 1 ? 'have' : 'has'} <strong>Favor</strong> on the first Check with the granted Action.</p>`;
    description += `<p>${actor.name} and ${allyNames} gain <strong>+10ft Speed</strong> for the Round.</p>`;
  }

  // Build target data for the card
  const sceneTokens = canvas.tokens?.placeables || [];
  const sceneId = canvas.scene?.id || '';
  const targetData = buffedAllies.map(a => {
    const token = sceneTokens.find(t => t.actor?.id === a.id);
    return {
      actorId: a.id,
      tokenId: token?.id || '',
      sceneId: sceneId,
      actorName: a.name,
      actorImg: token?.document?.texture?.src || a.img
    };
  });

  await VagabondChatCard.createActionCard({
    actor: actor,
    title: 'Step Up',
    description: description,
    tags: tags,
    targets: targetData
  });
}

/**
 * Expire Step Up buffs when the round changes.
 * @param {number} currentRound - The current combat round
 */
export async function expireStepUpBuffsByRound(currentRound) {
  const allPCs = game.actors.filter(a => a.type === 'character');
  for (const pc of allPCs) {
    // Expire Step Up bonus Action
    const stepUpExpire = pc.getFlag('vagabond', 'stepUpExpireRound');
    if (stepUpExpire != null && currentRound >= stepUpExpire) {
      await pc.unsetFlag('vagabond', 'stepUpBonusAction');
      await pc.unsetFlag('vagabond', 'stepUpExpireRound');
    }

    // Expire Step Up Active (2d20 on Reflex)
    const stepUpActiveExpire = pc.getFlag('vagabond', 'stepUpActiveExpireRound');
    if (stepUpActiveExpire != null && currentRound >= stepUpActiveExpire) {
      await pc.update({ 'system.stepUpActive': false });
      await pc.unsetFlag('vagabond', 'stepUpActiveExpireRound');
    }

    // Expire Choreographer Favor (clean up flag if not consumed by a roll)
    const choreoFavorExpire = pc.getFlag('vagabond', 'choreographerFavorExpireRound');
    if (choreoFavorExpire != null && currentRound >= choreoFavorExpire) {
      if (pc.getFlag('vagabond', 'choreographerFavorOneCheck') != null) {
        await pc.unsetFlag('vagabond', 'choreographerFavorOneCheck');
      }
      await pc.unsetFlag('vagabond', 'choreographerFavorExpireRound');
    }

    // Expire Choreographer Speed Bonus
    const choreoSpeedExpire = pc.getFlag('vagabond', 'choreographerSpeedExpireRound');
    if (choreoSpeedExpire != null && currentRound >= choreoSpeedExpire) {
      await pc.unsetFlag('vagabond', 'choreographerSpeedBonus');
      await pc.unsetFlag('vagabond', 'choreographerSpeedExpireRound');
      // Re-prepare data so speed updates
      pc.prepareData();
    }
  }
}

/**
 * Clear all Step Up / Choreographer buffs (e.g. on combat end).
 */
export async function expireStepUpBuffs() {
  const allPCs = game.actors.filter(a => a.type === 'character');
  for (const pc of allPCs) {
    const updates = {};
    let needsUpdate = false;

    if (pc.system.stepUpActive) {
      updates['system.stepUpActive'] = false;
      needsUpdate = true;
    }
    // Reset favorHinder if choreographer one-check favor is still active
    if (pc.getFlag('vagabond', 'choreographerFavorOneCheck')) {
      updates['system.favorHinder'] = 'none';
    }
    if (needsUpdate || pc.getFlag('vagabond', 'choreographerFavorOneCheck')) await pc.update(updates);

    // Clean up flags
    if (pc.getFlag('vagabond', 'stepUpBonusAction') != null) await pc.unsetFlag('vagabond', 'stepUpBonusAction');
    if (pc.getFlag('vagabond', 'stepUpExpireRound') != null) await pc.unsetFlag('vagabond', 'stepUpExpireRound');
    if (pc.getFlag('vagabond', 'stepUpActiveExpireRound') != null) await pc.unsetFlag('vagabond', 'stepUpActiveExpireRound');
    if (pc.getFlag('vagabond', 'choreographerFavorOneCheck') != null) await pc.unsetFlag('vagabond', 'choreographerFavorOneCheck');
    if (pc.getFlag('vagabond', 'choreographerFavorExpireRound') != null) await pc.unsetFlag('vagabond', 'choreographerFavorExpireRound');
    if (pc.getFlag('vagabond', 'choreographerSpeedBonus') != null) await pc.unsetFlag('vagabond', 'choreographerSpeedBonus');
    if (pc.getFlag('vagabond', 'choreographerSpeedExpireRound') != null) await pc.unsetFlag('vagabond', 'choreographerSpeedExpireRound');
  }
}
