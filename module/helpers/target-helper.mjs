/**
 * Helper class for managing target capture and resolution
 * Consolidates repeated target handling patterns across the system
 */
export class TargetHelper {
  /**
   * Captures current user targets as serializable data
   * @returns {Array<Object>} Array of target data objects
   */
  static captureCurrentTargets() {
    return Array.from(game.user.targets).map((token) => ({
      tokenId: token.id,
      sceneId: token.scene.id,
      actorId: token.actor?.id,
      actorName: token.name,
      actorImg: token.document.texture.src,
      actorType: token.actor?.type || 'npc',
    }));
  }

  /**
   * Classify an action as offensive, beneficial, or neutral based on damage type.
   * @param {string} damageType - The damage/effect type from the item/spell
   * @returns {'offensive'|'beneficial'|'neutral'}
   */
  static classifyActionType(damageType) {
    if (['healing', 'recover', 'recharge'].includes(damageType)) return 'beneficial';
    if (!damageType || damageType === '-' || damageType === 'none') return 'neutral';
    return 'offensive';
  }

  /**
   * Show a target confirmation dialog with token portraits.
   * Validates targeting rules (friendly fire, require targets) and lets the user confirm.
   *
   * @param {Array<Object>} targets - Array from captureCurrentTargets()
   * @param {Object} [options={}]
   * @param {'offensive'|'beneficial'|'neutral'} [options.actionType='neutral']
   * @param {string} [options.actionName='Action'] - Name shown in the dialog title
   * @param {boolean} [options.requireTargets=false] - If true and no targets, warn and return null
   * @param {boolean} [options.skipDialog=false] - If true, bypass the dialog entirely
   * @returns {Promise<Array<Object>|null>} Confirmed targets, or null if cancelled/aborted
   */
  static async confirmTargets(targets, options = {}) {
    const {
      actionType = 'neutral',
      actionName = 'Action',
      requireTargets = false,
      skipDialog = false,
    } = options;

    // Check if the setting is enabled
    try {
      if (!game.settings.get('vagabond', 'targetConfirmation')) {
        // Setting disabled — still enforce requireTargets
        if (requireTargets && (!targets || targets.length === 0)) {
          ui.notifications.warn(`Select at least one target for ${actionName}!`);
          return null;
        }
        return targets;
      }
    } catch {
      // Setting not registered yet — pass through
      return targets;
    }

    // Skip dialog for auto-targeting abilities
    if (skipDialog) return targets;

    // Require targets check
    if (requireTargets && (!targets || targets.length === 0)) {
      ui.notifications.warn(`Select at least one target for ${actionName}!`);
      return null;
    }

    // No targets and not required — pass through silently
    if (!targets || targets.length === 0) return targets;

    // Classify targets
    const friendlies = targets.filter(t => t.actorType === 'character');
    const enemies = targets.filter(t => t.actorType !== 'character');

    // Determine warning
    let warningHTML = '';
    if (actionType === 'offensive' && friendlies.length > 0) {
      warningHTML = `
        <div class="confirm-warning warning-friendly-fire">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Targeting friendly actors with an offensive action!</span>
        </div>`;
    } else if (actionType === 'beneficial' && enemies.length > 0) {
      warningHTML = `
        <div class="confirm-warning warning-enemy-heal">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Targeting enemies with a beneficial action!</span>
        </div>`;
    }

    // Build target portraits HTML
    const targetCards = targets.map(t => {
      const isFriendly = t.actorType === 'character';
      const cssClass = isFriendly ? 'friendly' : 'enemy';
      const typeLabel = isFriendly ? 'Ally' : 'Enemy';
      return `
        <div class="confirm-target ${cssClass}">
          <img src="${t.actorImg}" alt="${t.actorName}">
          <span class="confirm-target-name">${t.actorName}</span>
          <span class="confirm-target-type">${typeLabel}</span>
        </div>`;
    }).join('');

    const content = `
      <div class="vagabond-target-confirm">
        <div class="confirm-targets-list">
          ${targetCards}
        </div>
        ${warningHTML}
      </div>`;

    // Show dialog
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: `Targets — ${actionName}`, icon: 'fas fa-crosshairs' },
      content: content,
      buttons: [
        { action: 'confirm', label: 'Confirm', icon: 'fas fa-check', default: true },
        { action: 'cancel', label: 'Cancel', icon: 'fas fa-times' }
      ],
      close: () => null
    });

    if (result === 'confirm') return targets;
    return null;
  }

  /**
   * Resolves stored target data back to token references
   * @param {Array<Object>} targets - Stored target data
   * @returns {Array<Token>} Array of resolved tokens
   */
  static resolveTargets(targets) {
    if (!targets || !Array.isArray(targets)) {
      return [];
    }

    const resolvedTargets = [];

    for (const targetData of targets) {
      // Find the scene
      const scene = game.scenes.get(targetData.sceneId);
      if (!scene) {
        console.warn(`TargetHelper: Scene ${targetData.sceneId} not found for target ${targetData.tokenId}`);
        continue;
      }

      // Find the token in the scene
      const token = scene.tokens.get(targetData.tokenId);
      if (!token) {
        console.warn(`TargetHelper: Token ${targetData.tokenId} not found in scene ${targetData.sceneId}`);
        continue;
      }

      // Get the token object (for canvas operations)
      const tokenObject = token.object;
      if (tokenObject) {
        resolvedTargets.push(tokenObject);
      }
    }

    return resolvedTargets;
  }

  /**
   * Validates if targets are still valid (exist and are accessible)
   * @param {Array<Object>} targets - Stored target data
   * @returns {Object} Validation result with valid/invalid targets
   */
  static validateTargets(targets) {
    if (!targets || !Array.isArray(targets)) {
      return { valid: [], invalid: [], warnings: [] };
    }

    const valid = [];
    const invalid = [];
    const warnings = [];

    for (const targetData of targets) {
      // Check if scene exists
      const scene = game.scenes.get(targetData.sceneId);
      if (!scene) {
        invalid.push(targetData);
        warnings.push(`Scene ${targetData.sceneId} no longer exists`);
        continue;
      }

      // Check if token exists in scene
      const token = scene.tokens.get(targetData.tokenId);
      if (!token) {
        invalid.push(targetData);
        warnings.push(`Token ${targetData.actorName} no longer exists in scene`);
        continue;
      }

      // Check if we're in a different scene
      if (scene.id !== game.scenes.current?.id) {
        warnings.push(`Target ${targetData.actorName} is in a different scene`);
      }

      valid.push(targetData);
    }

    return { valid, invalid, warnings };
  }

  /**
   * Gets display names for targets (for UI purposes)
   * @param {Array<Object>} targets - Stored target data
   * @returns {Array<string>} Array of display names
   */
  static getTargetNames(targets) {
    if (!targets || !Array.isArray(targets)) {
      return [];
    }

    return targets.map(target => target.actorName || 'Unknown Target');
  }

  /**
   * Checks if any targets are in different scenes than current
   * @param {Array<Object>} targets - Stored target data
   * @returns {boolean} True if cross-scene targets exist
   */
  static hasCrossSceneTargets(targets) {
    if (!targets || !Array.isArray(targets) || !game.scenes.current) {
      return false;
    }

    return targets.some(target => target.sceneId !== game.scenes.current.id);
  }
}
