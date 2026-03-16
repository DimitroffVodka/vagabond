/**
 * Range band thresholds (in feet, edge-to-edge)
 * Close: ≤5ft  |  Near: 5–30ft  |  Far: >30ft
 */
const RANGE_CLOSE_MAX = 5;   // ft
const RANGE_NEAR_MAX  = 30;  // ft

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
    }));
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

  // ── Distance & Range Band Utilities ──────────────────────────────────────

  /**
   * Edge-to-edge Chebyshev distance between two tokens in feet.
   * Supports multi-square tokens (Large 2×2, Huge 3×3, etc.).
   * @param {Token} tokenA - First token (canvas object)
   * @param {Token} tokenB - Second token (canvas object)
   * @returns {number} Distance in feet (Infinity if no canvas)
   */
  static distanceFt(tokenA, tokenB) {
    const scene = canvas.scene;
    if (!scene) return Infinity;
    const gridSize = scene.grid?.size ?? 100;
    const gridDist = scene.grid?.distance ?? 5;

    const ax = Math.round(tokenA.document.x / gridSize);
    const ay = Math.round(tokenA.document.y / gridSize);
    const aw = tokenA.document.width;
    const ah = tokenA.document.height;

    const bx = Math.round(tokenB.document.x / gridSize);
    const by = Math.round(tokenB.document.y / gridSize);
    const bw = tokenB.document.width;
    const bh = tokenB.document.height;

    const gapX = Math.max(0, Math.max(ax, bx) - Math.min(ax + aw, bx + bw));
    const gapY = Math.max(0, Math.max(ay, by) - Math.min(ay + ah, by + bh));

    // +1 converts gap squares to Foundry-standard distance:
    // adjacent (gap 0) = 5ft, 1 gap = 10ft, etc.
    const gap = Math.max(gapX, gapY);
    return (gap + 1) * gridDist;
  }

  /**
   * Classify a distance in feet into a range band.
   * @param {number} distFt - Distance in feet
   * @returns {'close'|'near'|'far'}
   */
  static getDistanceBand(distFt) {
    if (distFt <= RANGE_CLOSE_MAX) return 'close';
    if (distFt <= RANGE_NEAR_MAX) return 'near';
    return 'far';
  }

  /**
   * Get the distance band label for display.
   * @param {'close'|'near'|'far'} band
   * @returns {string}
   */
  static bandLabel(band) {
    const labels = { close: 'Close (≤5ft)', near: 'Near (5–30ft)', far: 'Far (>30ft)' };
    return labels[band] ?? band;
  }

  /**
   * Validate weapon range against target distance, applying weapon property rules.
   *
   * Rules:
   * - Melee (range=close): can attack Close only (≤5ft). Long extends to 10ft.
   * - Near weapons (range=near or Near property): max range Near (≤30ft)
   * - Far weapons (range=far): no max range
   * - Ranged property: Hinder if target is Close (≤5ft)
   * - Thrown property: melee weapon can also attack Near, or Far with Hinder
   *
   * @param {Object} weapon - The weapon item
   * @param {Token} attackerToken - Attacker's canvas token
   * @param {Token} targetToken - Target's canvas token
   * @returns {{allowed: boolean, hinder: boolean, reason: string|null, distFt: number, band: string}}
   */
  static validateWeaponRange(weapon, attackerToken, targetToken) {
    const distFt = this.distanceFt(attackerToken, targetToken);
    const band = this.getDistanceBand(distFt);
    const range = weapon.system.range || 'close';
    const props = (weapon.system.properties || []).map(p => p.toLowerCase());

    const hasRanged = props.includes('ranged');
    const hasLong   = props.includes('long');
    const hasThrown = props.includes('thrown');
    const hasNear   = props.includes('near');

    let allowed = true;
    let hinder  = false;
    let reason  = null;

    // ── Melee weapons (range = close) ──────────────────────────────────
    if (range === 'close') {
      const meleeReach = hasLong ? 10 : 5;

      if (hasThrown) {
        // Thrown: melee at Close, throw at Near, throw at Far with Hinder
        if (distFt > RANGE_NEAR_MAX) {
          // Far range
          hinder = true;
          reason = `Thrown at Far range — Hindered`;
        }
        // Close and Near are fine
      } else {
        // Pure melee
        if (distFt > meleeReach) {
          allowed = false;
          reason = hasLong
            ? `Target is ${band} (${distFt}ft) — Long melee reach is 10ft`
            : `Target is ${band} (${distFt}ft) — melee reach is 5ft`;
        }
      }
    }

    // ── Near-range weapons ─────────────────────────────────────────────
    if (range === 'near' || hasNear) {
      if (distFt > RANGE_NEAR_MAX) {
        allowed = false;
        reason = `Target is Far (${distFt}ft) — weapon range is Near (≤30ft)`;
      }
    }

    // ── Ranged property: Hinder at Close ───────────────────────────────
    if (hasRanged && band === 'close') {
      hinder = true;
      reason = `Ranged weapon at Close range — Hindered`;
    }

    return { allowed, hinder, reason, distFt, band };
  }
}