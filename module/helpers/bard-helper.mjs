/**
 * Bard class feature helpers — Virtuoso, Starstruck, Song of Rest, etc.
 */

import { VagabondChatCard } from './chat-card.mjs';
import { VagabondRollBuilder } from './roll-builder.mjs';

/**
 * Get friendly PC actors that have tokens on the current scene.
 * @returns {Actor[]} Array of PC actors present on the scene
 */
function _getScenePCs() {
  const sceneTokens = canvas.tokens?.placeables || [];
  const seen = new Set();
  const pcs = [];
  for (const token of sceneTokens) {
    const a = token.actor;
    if (!a || a.type !== 'character') continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    pcs.push(a);
  }
  return pcs;
}

/**
 * Build target data from scene PCs for the chat card targets section.
 * Mirrors the format used by TargetHelper.captureCurrentTargets().
 * @param {Actor[]} pcs - Array of PC actors
 * @returns {Object[]} Array of target data objects
 */
function _buildTargetData(pcs) {
  const sceneTokens = canvas.tokens?.placeables || [];
  const sceneId = canvas.scene?.id || '';
  return pcs.map(pc => {
    const token = sceneTokens.find(t => t.actor?.id === pc.id);
    return {
      actorId: pc.id,
      tokenId: token?.id || '',
      sceneId: sceneId,
      actorName: pc.name,
      actorImg: token?.document?.texture?.src || pc.img
    };
  });
}

/**
 * Core Virtuoso logic — show benefit picker, roll Performance, apply buffs to Group.
 * @param {Actor} actor - The Bard actor performing
 * @param {Array} targetsAtRollTime - Captured targets (for Starstruck)
 */
export async function performVirtuoso(actor, targetsAtRollTime = []) {
  // Dialog to pick benefit
  const benefit = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Virtuoso — Choose Benefit' },
    content: `
      <p><strong>${actor.name}</strong> performs! Choose a benefit for the Group:</p>
    `,
    buttons: [
      { action: 'inspiration', label: 'Inspiration (d6 Healing)', icon: 'fas fa-heart' },
      { action: 'resolve', label: 'Resolve (Favor on Saves)', icon: 'fas fa-shield-halved' },
      { action: 'valor', label: 'Valor (Favor on Attack/Cast)', icon: 'fas fa-sword' }
    ]
  });

  if (!benefit) return; // Cancelled

  // Roll Performance Check
  const systemFavorHinder = actor.system.favorHinder || 'none';
  const favorHinder = VagabondRollBuilder.calculateEffectiveFavorHinder(systemFavorHinder, false, false);
  const roll = await VagabondRollBuilder.buildAndEvaluateD20(actor, favorHinder);

  const skillData = actor.system.skills?.performance;
  const difficulty = skillData?.difficulty || 10;
  const isSuccess = roll.total >= difficulty;

  // Labels for display
  const benefitLabels = {
    inspiration: { name: 'Inspiration', desc: 'd6 bonus to Healing rolls', icon: 'fa-heart' },
    resolve: { name: 'Resolve', desc: 'Favor on Saves', icon: 'fa-shield-halved' },
    valor: { name: 'Valor', desc: 'Favor on Attack and Cast Checks', icon: 'fa-sword' }
  };
  const chosen = benefitLabels[benefit];

  // Build description
  let descriptionHTML = `<p><i class="fas ${chosen.icon}"></i> <strong>${chosen.name}:</strong> ${chosen.desc}</p>`;

  // Get friendly PCs on the current scene (not all world actors)
  const scenePCs = _getScenePCs();
  const targetData = _buildTargetData(scenePCs);

  if (isSuccess) {
    // Apply buffs to scene PCs only
    const buffedNames = [];
    const grantExplode = actor.system.hasClimax || false;
    console.log(`Vagabond | Virtuoso cast: hasClimax=${actor.system.hasClimax}, grantExplode=${grantExplode}, actorName=${actor.name}`);

    for (const pc of scenePCs) {
      const updateData = {};

      switch (benefit) {
        case 'inspiration':
          updateData['system.virtuosoHealingBonus'] = 1;
          break;
        case 'resolve':
          updateData['system.virtuosoSavesFavor'] = true;
          break;
        case 'valor':
          updateData['system.virtuosoAttacksFavor'] = true;
          break;
      }

      if (grantExplode) {
        updateData['system.grantedDiceCanExplode'] = true;
      }

      await pc.update(updateData);

      // Add visible buff indicator as ActiveEffect with token status overlay
      const effectName = `Virtuoso: ${chosen.name}`;
      const benefitIcons = {
        inspiration: 'icons/svg/heal.svg',
        resolve: 'icons/svg/shield.svg',
        valor: 'icons/svg/sword.svg'
      };
      const effectIcon = benefitIcons[benefit] || 'icons/svg/aura.svg';
      const existing = pc.effects.find(e => e.flags?.vagabond?.isVirtuosoBuff);
      if (existing) await existing.delete();
      await pc.createEmbeddedDocuments('ActiveEffect', [{
        name: effectName,
        img: effectIcon,
        origin: actor.uuid,
        statuses: [`virtuoso-${benefit}`],
        flags: { vagabond: { isVirtuosoBuff: true } }
      }]);

      buffedNames.push(pc.name);
    }

    if (grantExplode) {
      descriptionHTML += `<p><i class="fas fa-explosion"></i> <em>Climax: granted dice can Explode!</em></p>`;
    }

    // Set expiry tracking
    const expireRound = (game.combat?.round || 0) + 1;
    for (const pc of scenePCs) {
      await pc.setFlag('vagabond', 'virtuosoExpireRound', expireRound);
      await pc.setFlag('vagabond', 'virtuosoBenefit', benefit);
    }

    // Handle Starstruck if Bard has it
    if (actor.system.hasStarstruck) {
      await handleStarstruck(actor, targetsAtRollTime);
    }
  } else {
    descriptionHTML += `<p><em>The performance falls flat...</em></p>`;
  }

  // Build proper action card (same format as weapon attacks / skill rolls)
  const tags = [
    { label: 'Performance', cssClass: 'tag-skill' },
    { label: chosen.name, cssClass: 'tag-info' }
  ];

  await VagabondChatCard.createActionCard({
    actor: actor,
    title: 'Virtuoso Performance',
    rollData: {
      roll: roll,
      difficulty: difficulty,
      isSuccess: isSuccess,
      isCritical: false
    },
    tags: tags,
    description: descriptionHTML,
    targetsAtRollTime: targetData
  });

  // Reset manual check bonus after roll
  if (actor.system.manualCheckBonus !== 0) {
    await actor.update({ 'system.manualCheckBonus': 0 });
  }
}

/**
 * Handle Starstruck — debuff Near Enemy(s) after Virtuoso performance.
 * @param {Actor} bardActor - The Bard performing
 * @param {Array} targetsAtRollTime - Pre-captured targets
 */
export async function handleStarstruck(bardActor, targetsAtRollTime = []) {
  // Get targets — either all Near Enemies (L10 Enhancement) or single target
  let targetTokens = [];
  const bardToken = canvas.tokens.placeables.find(t => t.actor?.id === bardActor.id);

  if (bardActor.system.hasStarstruckEnhancement && bardToken) {
    // L10: All Near Enemies (within 30ft) — auto-targeting, no confirmation needed
    targetTokens = canvas.tokens.placeables.filter(t => {
      if (!t.actor || t.actor.type !== 'npc') return false;
      const dist = canvas.grid.measurePath([bardToken.center, t.center]).distance;
      return dist <= 30;
    });

    if (targetTokens.length === 0) {
      ui.notifications.info('No Near Enemies found for Starstruck.');
      return;
    }
  } else {
    // Single target — check current targets for enemies
    const targets = Array.from(game.user.targets);
    targetTokens = targets.filter(t => t.actor && t.actor.type !== 'character');

    // If no enemy targeted, prompt to target or skip
    if (targetTokens.length === 0) {
      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Starstruck — Select Target', icon: 'fas fa-crosshairs' },
        content: `
          <div class="vagabond-target-confirm">
            <p style="text-align:center; margin: 8px 0;">
              <i class="fas fa-star" style="color: #DED656;"></i>
              <strong>Starstruck</strong> requires an enemy target.
            </p>
            <p style="text-align:center; font-size: 12px; color: #666;">
              Target an enemy token, then click <strong>Retry</strong>, or skip Starstruck this round.
            </p>
          </div>`,
        buttons: [
          { action: 'retry', label: 'Retry', icon: 'fas fa-crosshairs' },
          { action: 'skip', label: 'Skip Starstruck', icon: 'fas fa-forward' }
        ],
        close: () => 'skip'
      });

      if (choice === 'retry') {
        // Re-check targets after player has had a chance to target someone
        const retryTargets = Array.from(game.user.targets);
        targetTokens = retryTargets.filter(t => t.actor && t.actor.type !== 'character');

        if (targetTokens.length === 0) {
          ui.notifications.warn('Still no enemy targeted. Starstruck skipped.');
          return;
        }
      } else {
        // Skipped
        return;
      }
    }

    // Show target confirmation with enemy portraits
    const confirmContent = targetTokens.map(t => {
      const actor = t.actor;
      const img = t.document?.texture?.src || actor?.img || '';
      return `
        <div class="confirm-target enemy">
          <img src="${img}" alt="${actor?.name || 'Unknown'}">
          <span class="confirm-target-name">${actor?.name || 'Unknown'}</span>
          <span class="confirm-target-type">Enemy</span>
        </div>`;
    }).join('');

    const confirmed = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Starstruck — Confirm Target', icon: 'fas fa-star' },
      content: `
        <div class="vagabond-target-confirm">
          <p style="text-align:center; margin: 4px 0 8px;">
            <i class="fas fa-star" style="color: #DED656;"></i>
            Apply a status to this enemy?
          </p>
          <div class="confirm-targets-list">
            ${confirmContent}
          </div>
        </div>`,
      buttons: [
        { action: 'confirm', label: 'Confirm', icon: 'fas fa-check', default: true },
        { action: 'skip', label: 'Skip Starstruck', icon: 'fas fa-forward' }
      ],
      close: () => 'skip'
    });

    if (confirmed !== 'confirm') return;
  }

  // Choose status to apply
  const chosenStatus = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Starstruck — Choose Status' },
    content: '<p>Choose a status to apply to a Near Enemy:</p>',
    buttons: [
      { action: 'berserk', label: 'Berserk', icon: 'fas fa-fire' },
      { action: 'charmed', label: 'Charmed', icon: 'fas fa-heart' },
      { action: 'confused', label: 'Confused', icon: 'fas fa-question' },
      { action: 'frightened', label: 'Frightened', icon: 'fas fa-ghost' }
    ]
  });

  if (!chosenStatus) return;

  // Check status immunities and apply
  const affectedNames = [];

  for (const token of targetTokens) {
    const targetActor = token.actor;
    if (!targetActor) continue;

    // Check status immunity
    const immunities = targetActor.system?.statusImmunities || [];
    if (immunities.includes(chosenStatus)) {
      ui.notifications.info(`${targetActor.name} is immune to ${chosenStatus}!`);
      continue;
    }

    await targetActor.toggleStatusEffect(chosenStatus);

    affectedNames.push(targetActor.name);
  }

  if (affectedNames.length > 0) {
    const statusLabel = chosenStatus.charAt(0).toUpperCase() + chosenStatus.slice(1);

    // Collect affected token IDs + scene for auto-cleanup when countdown die expires
    // We store token IDs (not actor IDs) because NPC tokens are usually unlinked —
    // the status lives on the synthetic token actor, not the world actor.
    const affectedTokenIds = [];
    const sceneId = canvas.scene?.id || '';
    for (const token of targetTokens) {
      if (token.actor && affectedNames.includes(token.actor.name)) {
        affectedTokenIds.push(token.id);
      }
    }

    // Create a visible Cd4 countdown die to track Starstruck duration
    try {
      const { CountdownDice } = await import('../documents/countdown-dice.mjs');
      const dieName = `Starstruck: ${statusLabel} (${affectedNames.join(', ')})`;
      const journal = await CountdownDice.create({
        name: dieName,
        diceType: 'd4',
        size: 'S',
        ownership: { default: 3, [game.user.id]: 3 }
      });

      // Store linked status + token/scene IDs so the effect auto-removes on expiry
      if (journal) {
        await journal.setFlag('vagabond', 'starstruckLink', {
          status: chosenStatus,
          tokenIds: affectedTokenIds,
          sceneId: sceneId
        });
      }
    } catch (e) {
      console.warn('Vagabond | Failed to create Starstruck countdown die:', e);
    }

    // Post Starstruck result card
    const card = new VagabondChatCard()
      .setType('generic')
      .setActor(bardActor)
      .setTitle('Starstruck')
      .setSubtitle(bardActor.name)
      .setDescription(`
        <p><i class="fas fa-star"></i> <strong>Starstruck!</strong></p>
        <p><strong>${affectedNames.join(', ')}</strong> ${affectedNames.length === 1 ? 'is' : 'are'} now <strong>${statusLabel}</strong>!</p>
        <p><em>Cd4 countdown die created — status auto-removes when it expires.</em></p>
      `);
    await card.send();
  }
}

/**
 * Expire all Virtuoso buffs from PCs.
 * Called on combat round change and combat end.
 */
export async function expireVirtuosoBuffs() {
  const allPCs = game.actors.filter(a => a.type === 'character');
  for (const pc of allPCs) {
    const hasVirtuosoBuff = pc.getFlag('vagabond', 'virtuosoExpireRound') != null;
    if (hasVirtuosoBuff) {
      // Remove visible buff ActiveEffect
      const virtuosoEffect = pc.effects.find(e => e.flags?.vagabond?.isVirtuosoBuff);
      if (virtuosoEffect) await virtuosoEffect.delete();

      await pc.update({
        'system.virtuosoSavesFavor': false,
        'system.virtuosoAttacksFavor': false,
        'system.virtuosoHealingBonus': 0,
        'system.grantedDiceCanExplode': false
      });
      await pc.unsetFlag('vagabond', 'virtuosoExpireRound');
      await pc.unsetFlag('vagabond', 'virtuosoBenefit');
    }
  }
}

/**
 * Expire Virtuoso buffs that have passed their expiration round.
 * Called on combat round change.
 * @param {number} currentRound - Current combat round
 */
export async function expireVirtuosoBuffsByRound(currentRound) {
  const allPCs = game.actors.filter(a => a.type === 'character');
  for (const pc of allPCs) {
    const expireRound = pc.getFlag('vagabond', 'virtuosoExpireRound');
    if (expireRound != null && currentRound >= expireRound) {
      // Remove visible buff ActiveEffect
      const virtuosoEffect = pc.effects.find(e => e.flags?.vagabond?.isVirtuosoBuff);
      if (virtuosoEffect) await virtuosoEffect.delete();

      await pc.update({
        'system.virtuosoSavesFavor': false,
        'system.virtuosoAttacksFavor': false,
        'system.virtuosoHealingBonus': 0,
        'system.grantedDiceCanExplode': false
      });
      await pc.unsetFlag('vagabond', 'virtuosoExpireRound');
      await pc.unsetFlag('vagabond', 'virtuosoBenefit');
    }
  }
}

// Starstruck duration is now tracked via a visible Cd4 countdown die.
// The GM rolls it each round and manually removes the status when it expires.
