/**
 * Manages creation and previewing of measured templates and aura regions for Vagabond.
 */
export class VagabondMeasureTemplates {
  constructor() {
    // Stores active preview IDs keyed by "${actorId}-${itemId}"
    // Values are either a plain string (template ID) or { type: 'region', id: regionId }
    this.activePreviews = new Map();

    // Stores active aura region IDs keyed by actorId
    this.activeAuras = new Map();
  }

  /* -------------------------------------------- */
  /* Aura Region API (V14)                       */
  /* -------------------------------------------- */

  /**
   * Creates an aura region attached to a token using V14 Scene Regions.
   * @param {TokenDocument} tokenDoc - The token document to attach the aura to.
   * @param {number} distanceFeet - The aura radius in feet.
   * @param {Object} options
   * @param {boolean} [options.isPreview=false] - Whether this is a preview aura.
   * @param {string} [options.actorId] - The caster's actor ID.
   * @param {string} [options.itemId] - The spell item ID.
   * @param {string} [options.spellName] - The spell name for labeling.
   * @returns {Promise<RegionDocument|null>} The created region document.
   */
  async _createAuraRegion(tokenDoc, distanceFeet, options = {}) {
    const { isPreview = false, actorId = '', itemId = '', spellName = 'Aura' } = options;

    // createTokenEmanation expects distance in scene units (feet), not grid units
    const range = distanceFeet;

    try {
      const regionDoc = await RegionDocument.createTokenEmanation(tokenDoc, range, {
        name: `${spellName}${isPreview ? ' (Preview)' : ''}`,
        color: game.user.color || '#FF0000',
        visibility: CONST.REGION_VISIBILITY.ALWAYS,
        flags: {
          vagabond: {
            isAura: true,
            isPreview: isPreview,
            actorId: actorId,
            itemId: itemId,
            spellName: spellName
          }
        }
      });

      return regionDoc;
    } catch (e) {
      console.error('Vagabond | Failed to create aura region:', e);
      ui.notifications.error('Failed to create aura region.');
      return null;
    }
  }

  /**
   * Dismisses an active aura region for a given actor.
   * @param {string} actorId - The actor whose aura to dismiss.
   */
  async dismissAura(actorId) {
    const regionId = this.activeAuras.get(actorId);
    if (regionId) {
      const region = canvas.scene.regions?.get(regionId);
      if (region) await region.delete();
      this.activeAuras.delete(actorId);
    }
  }

  /**
   * Dismisses all active aura regions.
   */
  async dismissAllAuras() {
    for (const [actorId, regionId] of this.activeAuras.entries()) {
      const region = canvas.scene.regions?.get(regionId);
      if (region) await region.delete();
    }
    this.activeAuras.clear();
  }

  /**
   * Recovers orphaned aura regions from the current scene into the activeAuras map.
   * Called on ready hook to handle page refresh / reconnect.
   */
  recoverOrphanedAuras() {
    if (!canvas.scene?.regions) return;
    for (const region of canvas.scene.regions) {
      const flags = region.flags?.vagabond;
      if (flags?.isAura && !flags?.isPreview && flags?.actorId) {
        this.activeAuras.set(flags.actorId, region.id);
      }
    }
    const count = this.activeAuras.size;
    if (count > 0) {
      console.log(`Vagabond | Recovered ${count} orphaned aura region(s)`);
    }
  }

  /* -------------------------------------------- */
  /* Sheet Preview API                           */
  /* -------------------------------------------- */

  /**
   * Updates (or creates) a preview template for a specific spell/item.
   * @param {Actor} actor - The actor casting the spell.
   * @param {string} itemId - The item ID.
   * @param {string} deliveryType - The delivery type (e.g. 'cone', 'aura').
   * @param {number} distance - The distance in feet.
   */
  async updatePreview(actor, itemId, deliveryType, distance) {
    // 1. Cleanup existing preview for this item
    await this.clearPreview(actor.id, itemId);

    if (!deliveryType || !distance) return;

    // 2. Get the token (Caster)
    const token = actor.token?.object || actor.getActiveTokens()[0];
    if (!token) {
      ui.notifications.warn("No token found for this actor on the current scene.");
      return;
    }

    // 3. Aura delivery → create V14 Region instead of MeasuredTemplate
    if (deliveryType.toLowerCase() === 'aura') {
      const spellItem = actor.items.get(itemId);
      const regionDoc = await this._createAuraRegion(token.document, distance, {
        isPreview: true,
        actorId: actor.id,
        itemId: itemId,
        spellName: spellItem?.name || 'Aura'
      });
      if (regionDoc) {
        this.activePreviews.set(`${actor.id}-${itemId}`, { type: 'region', id: regionDoc.id });
      }
      return;
    }

    // 4. Calculate centroid from current targets (non-aura types)
    const targetArray = Array.from(game.user.targets);
    let centroid = null;
    if (targetArray.length > 0) {
      centroid = this._calculateTargetCentroid(targetArray);
    }

    // 5. Construct Data
    const templateData = this._constructTemplateData({
      type: deliveryType,
      distance: distance,
      token: token,
      targets: game.user.targets,
      centroid: centroid
    });

    if (!templateData) return;

    // 6. Create the Template
    // Flag it so we know it's a Vagabond preview
    templateData.flags = {
      vagabond: {
        isPreview: true,
        actorId: actor.id,
        itemId: itemId
      }
    };

    const doc = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [templateData]);

    // 7. Track the ID
    if (doc && doc[0]) {
      this.activePreviews.set(`${actor.id}-${itemId}`, doc[0].id);
    }
  }

  /**
   * Removes the preview template or region for a specific item.
   * @param {string} actorId
   * @param {string} itemId
   */
  async clearPreview(actorId, itemId) {
    const key = `${actorId}-${itemId}`;
    const tracked = this.activePreviews.get(key);

    if (!tracked) return;

    // Region-based preview (aura)
    if (typeof tracked === 'object' && tracked.type === 'region') {
      const region = canvas.scene.regions?.get(tracked.id);
      if (region) await region.delete();
    }
    // Template-based preview (cone, line, etc.)
    else if (typeof tracked === 'string') {
      const template = canvas.scene.templates.get(tracked);
      if (template) await template.delete();
    }

    this.activePreviews.delete(key);
  }

  /**
   * Clears all active previews for a specific actor (used when closing sheet).
   * @param {string} actorId
   */
  async clearActorPreviews(actorId) {
    for (const [key, tracked] of this.activePreviews.entries()) {
      if (key.startsWith(`${actorId}-`)) {
        if (typeof tracked === 'object' && tracked.type === 'region') {
          const region = canvas.scene.regions?.get(tracked.id);
          if (region) await region.delete();
        } else if (typeof tracked === 'string') {
          const template = canvas.scene.templates.get(tracked);
          if (template) await template.delete();
        }
        this.activePreviews.delete(key);
      }
    }
  }

  /* -------------------------------------------- */
  /* Chat Card API                               */
  /* -------------------------------------------- */

  /**
   * Creates a template or aura region from Chat Card metadata.
   * @param {string} deliveryType
   * @param {string} deliveryText
   * @param {ChatMessage} message
   */
  async fromChat(deliveryType, deliveryText, message) {
    // 1. Parse Distance
    const distanceMatch = deliveryText.match(/(\d+)'/);
    if (!distanceMatch) {
      ui.notifications.warn('Could not parse template distance from delivery text.');
      return;
    }
    const distance = parseInt(distanceMatch[1], 10);

    // 2. Get Caster Token
    const speaker = message.speaker;
    let casterToken = null;
    if (speaker?.token) casterToken = canvas.tokens.get(speaker.token);
    if (!casterToken && speaker?.actor) {
        const actor = game.actors.get(speaker.actor);
        casterToken = actor?.getActiveTokens()[0];
    }

    // 3. Aura delivery → create V14 Region attached to selected token
    if (deliveryType.toLowerCase() === 'aura') {
      // Determine attachment token: selected token first, caster fallback
      const attachToken = canvas.tokens.controlled[0] || casterToken;
      if (!attachToken) {
        ui.notifications.warn('Select a token to attach the aura to, or ensure the caster has a token on the scene.');
        return;
      }

      // Clean up previous aura for same actor
      const actorId = speaker?.actor || attachToken.actor?.id;
      if (actorId) await this.dismissAura(actorId);

      // Get spell name from message flags or content
      const spellName = message.flags?.vagabond?.spellName
        || message.flags?.vagabond?.itemName
        || 'Aura';

      const regionDoc = await this._createAuraRegion(attachToken.document, distance, {
        isPreview: false,
        actorId: actorId,
        spellName: spellName
      });

      if (regionDoc && actorId) {
        this.activeAuras.set(actorId, regionDoc.id);
        ui.notifications.info(`${spellName} aura attached to ${attachToken.name}.`);
      }
      return;
    }

    // 4. Non-aura types: get stored targets and resolve to tokens
    const storedTargets = message.flags?.vagabond?.targetsAtRollTime || [];
    const resolvedTargets = [];

    for (const targetData of storedTargets) {
      // Check if target is on current scene
      if (targetData.sceneId !== canvas.scene?.id) continue;

      // Get token from current scene
      const token = canvas.tokens.get(targetData.tokenId);
      if (token) {
        resolvedTargets.push(token);
      }
    }

    // 5. Calculate centroid if we have multiple targets
    let centroid = null;
    if (resolvedTargets.length > 0) {
      centroid = this._calculateTargetCentroid(resolvedTargets);
    }

    // 6. Construct Data with centroid
    const templateData = this._constructTemplateData({
      type: deliveryType,
      distance: distance,
      token: casterToken,
      targets: game.user.targets, // Still pass for fallback
      centroid: centroid
    });

    if (templateData) {
      templateData.flags = {
        vagabond: {
          deliveryType: deliveryType,
          deliveryText: deliveryText,
          targetsAtRollTime: storedTargets // Preserve stored targets
        }
      };
      await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [templateData]);
    }
  }

  /* -------------------------------------------- */
  /* Internal Geometry Logic                     */
  /* -------------------------------------------- */

  /**
   * Calculate the geometric centroid (midpoint) of multiple targets
   * @param {Array} targets - Array of Token objects
   * @returns {Object|null} {x, y} coordinates of centroid, or null if no targets
   */
  _calculateTargetCentroid(targets) {
    if (!targets || targets.length === 0) return null;

    // Sum all x and y coordinates
    const sum = targets.reduce((acc, token) => {
      acc.x += token.center.x;
      acc.y += token.center.y;
      return acc;
    }, { x: 0, y: 0 });

    // Return average (centroid)
    return {
      x: sum.x / targets.length,
      y: sum.y / targets.length
    };
  }

  /**
   * Generates the MeasuredTemplateDocument data.
   * Used for non-aura delivery types (cone, line, cube, sphere).
   * @param {Object} params
   * @param {string} params.type - Delivery type (cone, line, etc.)
   * @param {number} params.distance - Distance in feet
   * @param {Token} params.token - The caster token
   * @param {UserTargets} params.targets - The user's targets
   * @param {Object} params.centroid - Optional precalculated centroid {x, y}
   * @returns {Object|null} Template data
   */
  _constructTemplateData({ type, distance, token, targets, centroid = null }) {
    if (!token && ['cone','line'].includes(type)) {
       ui.notifications.warn('Could not determine origin point (Caster Token) for template.');
       return null;
    }

    const targetToken = targets?.first();

    const templateData = {
      t: '',
      distance: distance,
      fillColor: game.user.color || '#FF0000',
      direction: 0,
      x: 0,
      y: 0
    };

    // Use centroid for positioning if available, otherwise fall back to first target
    const destinationPoint = centroid || (targetToken ? targetToken.center : null);

    switch (type.toLowerCase()) {
      case 'cone':
        templateData.t = 'cone';
        templateData.angle = 90;
        templateData.x = token.center.x;
        templateData.y = token.center.y;

        // Use centroid or first target for direction
        if (destinationPoint) {
          const ray = new foundry.canvas.geometry.Ray(token.center, destinationPoint);
          templateData.direction = Math.toDegrees(ray.angle);
        } else {
          templateData.direction = token.document.rotation || 0;
        }
        break;

      case 'line':
        templateData.t = 'ray';
        templateData.width = canvas.scene.grid.distance; // usually 5ft width
        templateData.x = token.center.x;
        templateData.y = token.center.y;

        // Use centroid or first target for direction
        if (destinationPoint) {
          const ray = new foundry.canvas.geometry.Ray(token.center, destinationPoint);
          templateData.direction = Math.toDegrees(ray.angle);
        } else {
          templateData.direction = token.document.rotation || 0;
        }
        break;

      case 'cube':
        // Require either centroid or target for positioning
        if (!destinationPoint) {
          ui.notifications.warn(`Please target a token to place the ${type}.`);
          return null;
        }
        templateData.t = 'rect';

        // Cube logic: position so centroid is at the center of the rectangle
        const sideLength = distance;
        templateData.distance = sideLength * Math.sqrt(2); // Hypotenuse
        templateData.direction = 45;

        const gridPixels = canvas.grid.size;
        const sceneGridDist = canvas.scene.grid.distance;
        const sideLengthPixels = (sideLength / sceneGridDist) * gridPixels;

        // Center the cube on the destination point (centroid or target)
        templateData.x = destinationPoint.x - (sideLengthPixels / 2);
        templateData.y = destinationPoint.y - (sideLengthPixels / 2);
        break;

      case 'sphere':
        // Require either centroid or target for positioning
        if (!destinationPoint) {
          ui.notifications.warn(`Please target a token to place the ${type}.`);
          return null;
        }
        templateData.t = 'circle';
        // Center on destination point (centroid or target)
        templateData.x = destinationPoint.x;
        templateData.y = destinationPoint.y;
        break;

      default:
        ui.notifications.warn(`Template creation not supported: ${type}`);
        return null;
    }

    return templateData;
  }
}
