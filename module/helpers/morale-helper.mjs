/**
 * Vagabond — Morale Checker
 *
 * Ported from vagabond-crawler module.
 * - Group: first death, half dead (updateCombatant, changes.defeated === true)
 * - Solo:  drops to half HP (updateActor, changes.system.health.value)
 * - Leader defeated: triggers check if the highest-TL NPC is defeated
 */

const SYSTEM_ID = 'vagabond';

let _state = {
  initialNPCCount: 0,
  isSolo:          false,
  firstDeathFired: false,
  halfGroupFired:  false,
  halfHPFired:     false,
  leaderDefeatedFired: false,
};

export const MoraleHelper = {

  init() {
    const initState = (combat) => {
      const npcCount = combat.combatants.filter(c => c.actor?.type === 'npc').length;
      _state = {
        initialNPCCount: npcCount,
        isSolo:          npcCount === 1,
        firstDeathFired: false,
        halfGroupFired:  false,
        halfHPFired:     false,
        leaderDefeatedFired: false,
      };
      console.log(`${SYSTEM_ID} | Morale init: ${npcCount} NPCs, solo=${npcCount === 1}`);
    };

    // combatStart fires when GM clicks Start Combat
    Hooks.on('combatStart', (combat) => {
      if (!game.settings.get(SYSTEM_ID, 'moraleEnabled')) return;
      initState(combat);
    });

    // createCombat fires when the combat document is first created
    Hooks.on('createCombat', () => {
      if (!game.settings.get(SYSTEM_ID, 'moraleEnabled')) return;
      _state = { initialNPCCount: 0, isSolo: false, firstDeathFired: false, halfGroupFired: false, halfHPFired: false, leaderDefeatedFired: false };
    });

    // Re-initialize once combatants are added (fallback for programmatic combat creation)
    Hooks.on('createCombatant', () => {
      if (!game.settings.get(SYSTEM_ID, 'moraleEnabled')) return;
      if (_state.initialNPCCount > 0) return; // already initialized
      clearTimeout(this._moraleInitTimer);
      this._moraleInitTimer = setTimeout(() => {
        if (!game.combat) return;
        const npcCount = game.combat.combatants.filter(c => c.actor?.type === 'npc').length;
        if (npcCount > 0 && _state.initialNPCCount === 0) {
          _state.initialNPCCount = npcCount;
          _state.isSolo = npcCount === 1;
          console.log(`${SYSTEM_ID} | Morale init (createCombatant): ${npcCount} NPCs, solo=${_state.isSolo}`);
        }
      }, 300);
    });

    // Group morale — NPC defeated
    Hooks.on('updateCombatant', async (combatant, changes) => {
      if (!game.settings.get(SYSTEM_ID, 'moraleEnabled')) return;
      if (!game.user.isGM || !game.combat) return;
      if (combatant.actor?.type !== 'npc') return;
      if (changes.defeated !== true) return;
      if (_state.isSolo) return;

      const allNPC   = game.combat.combatants.filter(c => c.actor?.type === 'npc');
      const defeated = allNPC.filter(c => c.defeated).length;

      // Check if the defeated NPC was the leader (highest TL)
      if (!_state.leaderDefeatedFired) {
        const npcAlive = allNPC.filter(c => !c.defeated);
        let highestTL = -Infinity;
        for (const c of allNPC) {
          const tl = c.actor.system.threatLevel ?? 0;
          if (tl > highestTL) highestTL = tl;
        }
        const defeatedTL = combatant.actor.system.threatLevel ?? 0;
        if (defeatedTL >= highestTL) {
          _state.leaderDefeatedFired = true;
          await this._check('Their leader has been defeated');
          return;
        }
      }

      if (!_state.firstDeathFired && defeated >= 1) {
        _state.firstDeathFired = true;
        await this._check('First death in the group');
      } else if (!_state.halfGroupFired && defeated >= Math.ceil(_state.initialNPCCount / 2)) {
        _state.halfGroupFired = true;
        await this._check('Half the group is defeated');
      }
    });

    // Solo morale — drops to half HP
    Hooks.on('updateActor', async (actor, changes) => {
      if (!game.settings.get(SYSTEM_ID, 'moraleEnabled')) return;
      if (!game.user.isGM || !game.combat) return;
      if (actor.type !== 'npc') return;
      if (!_state.isSolo) return;
      if (_state.halfHPFired) return;

      const newHP = changes?.system?.health?.value;
      if (newHP === undefined) return;
      const maxHP = actor.system.health.max;
      if (maxHP > 0 && newHP <= Math.floor(maxHP / 2)) {
        _state.halfHPFired = true;
        await this._check(`${actor.name} is at half HP or less`);
      }
    });

    console.log(`${SYSTEM_ID} | Morale helper initialized`);
  },

  async _check(reason) {
    const combat = game.combat;
    if (!combat) return;

    const npcAlive = combat.combatants.filter(c => c.actor?.type === 'npc' && !c.defeated);
    if (!npcAlive.length) return;

    // Find leader: highest threat level NPC among the living
    let leader = null, highestTL = -Infinity;
    for (const c of npcAlive) {
      const tl = c.actor.system.threatLevel ?? 0;
      if (tl > highestTL) { highestTL = tl; leader = c.actor; }
    }
    if (!leader) leader = npcAlive[0]?.actor;
    if (!leader) return;

    const morale = leader.system.morale;
    // NPCs with no Morale value always fight to the death
    if (morale === null || morale === undefined) {
      await ChatMessage.create({
        content: `<div class="vagabond-chat morale-check">
          <h3><i class="fas fa-flag"></i> Morale Check</h3>
          <div class="morale-body">
            <p><strong>Trigger:</strong> ${reason}</p>
            <p><strong>Leader:</strong> ${leader.name} (TL ${highestTL === -Infinity ? '?' : highestTL})</p>
            <p class="morale-result morale-pass">
              <i class="fas fa-skull-crossbones"></i>
              NO MORALE — Fights to the death!
            </p>
          </div>
        </div>`,
        speaker: { alias: 'Morale' },
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
      });
      return;
    }

    const roll = await new Roll('2d6').evaluate();
    const passed = roll.total <= morale;

    await ChatMessage.create({
      content: `<div class="vagabond-chat morale-check">
        <h3><i class="fas fa-flag"></i> Morale Check</h3>
        <div class="morale-body">
          <p><strong>Trigger:</strong> ${reason}</p>
          <p><strong>Leader:</strong> ${leader.name} (TL ${highestTL === -Infinity ? '?' : highestTL})</p>
          <p><strong>Morale:</strong> ${morale} | <strong>Roll:</strong> ${roll.total} (${roll.result})</p>
          <p class="morale-result ${passed ? 'morale-pass' : 'morale-fail'}">
            <i class="fas ${passed ? 'fa-shield-alt' : 'fa-person-running'}"></i>
            ${passed ? 'HOLDS — The group stands firm!' : 'FAILS — The group retreats or surrenders!'}
          </p>
        </div>
      </div>`,
      speaker: { alias: 'Morale' },
      whisper: game.users.filter(u => u.isGM).map(u => u.id),
      rolls:   [roll],
    });
  },

  async manualCheck(reason = 'Manual morale check') {
    await this._check(reason);
  },
};
