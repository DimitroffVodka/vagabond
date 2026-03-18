/**
 * NPC Passive Abilities — Automation hooks for monster abilities
 *
 * Extensible system: add entries to PASSIVE_ABILITIES keyed by the exact
 * ability name string found in actor.system.abilities[].name.
 *
 * Currently implemented:
 *   - Magic Ward I   — d4 penalty baked into Cast Check rolls
 *   - Magic Ward II  — d6 penalty
 *   - Magic Ward III — d8 penalty
 *
 * Also patches the system's missing target-modifier check for spell casts
 * (Vulnerable incomingAttacksModifier → Favor on cast checks).
 */

import { SpellHandler } from '../sheets/handlers/_module.mjs';
import { VagabondRollBuilder } from './roll-builder.mjs';

const SYSTEM_ID = "vagabond";

/* ──────────────────────────────────────────────────────────────────────────────
 * PASSIVE ABILITIES TABLE
 * ──────────────────────────────────────────────────────────────────────────── */

const PASSIVE_ABILITIES = {
  "Magic Ward I": {
    type: "castPenalty",
    penaltyDie: "1d4",
    label: "Magic Ward I",
  },
  "Magic Ward II": {
    type: "castPenalty",
    penaltyDie: "1d6",
    label: "Magic Ward II",
  },
  "Magic Ward III": {
    type: "castPenalty",
    penaltyDie: "1d8",
    label: "Magic Ward III",
  },
};

/* ──────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function getPassiveAbilities(actor, type) {
  const abilities = actor?.system?.abilities;
  if (!Array.isArray(abilities)) return [];

  const matches = [];
  for (const ability of abilities) {
    const def = PASSIVE_ABILITIES[ability.name];
    if (def && def.type === type) {
      matches.push(def);
    }
  }
  return matches;
}

function strongestCastPenalty(penalties) {
  if (!penalties.length) return null;
  const dieOrder = { "1d4": 1, "1d6": 2, "1d8": 3, "1d10": 4, "1d12": 5 };
  return penalties.reduce((best, cur) =>
    (dieOrder[cur.penaltyDie] ?? 0) > (dieOrder[best.penaltyDie] ?? 0) ? cur : best
  );
}

function getActiveWardFromTargets() {
  const targets = game.user?.targets;
  if (!targets?.size) return null;

  let allPenalties = [];
  for (const token of targets) {
    const actor = token.actor;
    if (!actor) continue;
    const p = getPassiveAbilities(actor, "castPenalty");
    if (p.length) allPenalties.push(...p);
  }
  return strongestCastPenalty(allPenalties);
}

/**
 * Check all current targets for incomingAttacksModifier and adjust
 * the caster's favorHinder accordingly.  Mirrors item.mjs logic for
 * weapon attacks, but the system never does this for spell casts.
 */
function applyTargetModifiers(favorHinder) {
  for (const token of game.user.targets) {
    const mod = token.actor?.system?.incomingAttacksModifier;
    if (!mod || mod === "none") continue;

    console.log(`${SYSTEM_ID} | Target "${token.name}" incomingAttacksModifier = "${mod}"`);

    if (mod === "favor") {
      if (favorHinder === "hinder") favorHinder = "none";
      else if (favorHinder === "none") favorHinder = "favor";
    } else if (mod === "hinder") {
      if (favorHinder === "favor") favorHinder = "none";
      else if (favorHinder === "none") favorHinder = "hinder";
    }
  }
  return favorHinder;
}

/* ──────────────────────────────────────────────────────────────────────────────
 * MAGIC WARD + VULNERABLE — INLINE ROLL INJECTION
 *
 * Strategy:
 *   1. Wrap SpellHandler.prototype.castSpell to set a module-scope flag
 *      so we know the next d20 roll is a Cast Check.
 *   2. Wrap VagabondRollBuilder.buildAndEvaluateD20WithRollData to:
 *      a) Check targets for incomingAttacksModifier → adjust favor/hinder
 *      b) Check targets for Magic Ward → inject penalty die into formula
 * ──────────────────────────────────────────────────────────────────────────── */

/** Module-scope flag: true while a Cast Check roll is in progress. */
let _isCastCheck = false;

/** Allow external callers (e.g. crawl-strip spell dialog) to bracket
 *  their own cast-check rolls with the same flag.                    */
export function setCastCheckFlag(val) { _isCastCheck = !!val; }

export function registerMagicWardHook() {
  _wrapSystemClasses();
  console.log(`${SYSTEM_ID} | Magic Ward / Cast-Check hooks registered.`);
}

function _wrapSystemClasses() {
  // Direct imports — no dynamic import needed since we're inside the system
  if (!SpellHandler?.prototype?.castSpell) {
    console.error(`${SYSTEM_ID} | SpellHandler.prototype.castSpell not found — cannot wrap`);
    return;
  }
  if (!VagabondRollBuilder?.buildAndEvaluateD20WithRollData) {
    console.error(`${SYSTEM_ID} | RollBuilder.buildAndEvaluateD20WithRollData not found — cannot wrap`);
    return;
  }

  // ── Wrap SpellHandler.prototype.castSpell ──────────────────────────────
  const origCastSpell = SpellHandler.prototype.castSpell;
  SpellHandler.prototype.castSpell = async function (event, target) {
    _isCastCheck = true;
    console.log(`${SYSTEM_ID} | castSpell wrapper: _isCastCheck = true`);
    try {
      return await origCastSpell.call(this, event, target);
    } finally {
      _isCastCheck = false;
    }
  };
  console.log(`${SYSTEM_ID} | ✓ Wrapped SpellHandler.castSpell`);

  // ── Wrap VagabondRollBuilder.buildAndEvaluateD20WithRollData ───────────
  const origBuild = VagabondRollBuilder.buildAndEvaluateD20WithRollData;
  VagabondRollBuilder.buildAndEvaluateD20WithRollData = async function (
    rollData,
    favorHinder,
    baseFormula = null
  ) {
    console.log(`${SYSTEM_ID} | buildAndEvaluateD20WithRollData wrapper called — _isCastCheck=${_isCastCheck}, favorHinder="${favorHinder}"`);

    if (_isCastCheck) {
      // ── A. Target incomingAttacksModifier (Vulnerable, etc.) ──────────
      const origFH = favorHinder;
      favorHinder = applyTargetModifiers(favorHinder);
      if (favorHinder !== origFH) {
        console.log(`${SYSTEM_ID} | Favor/Hinder adjusted: "${origFH}" → "${favorHinder}" (target modifier)`);
      }

      // ── B. Magic Ward penalty die ─────────────────────────────────────
      const ward = getActiveWardFromTargets();
      if (ward) {
        const dice = CONFIG.VAGABOND?.homebrew?.dice;
        const base = baseFormula ?? dice?.baseCheck ?? "1d20";
        baseFormula = `${base} - ${ward.penaltyDie}[${ward.label}]`;

        const targetNames = Array.from(game.user.targets)
          .filter((t) => getPassiveAbilities(t.actor, "castPenalty").length > 0)
          .map((t) => t.name)
          .join(", ");

        ui.notifications.info(
          `${ward.label}: Cast Check penalised by ${ward.penaltyDie} (${targetNames})`
        );
        console.log(`${SYSTEM_ID} | Magic Ward: formula="${baseFormula}"`);
      }
    }

    return origBuild.call(this, rollData, favorHinder, baseFormula);
  };
  console.log(`${SYSTEM_ID} | ✓ Wrapped RollBuilder.buildAndEvaluateD20WithRollData`);
}
