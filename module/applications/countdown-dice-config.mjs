import { CountdownDice } from '../documents/countdown-dice.mjs';

const { api } = foundry.applications;

/**
 * Configuration dialog for creating and editing countdown dice
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CountdownDiceConfig extends api.HandlebarsApplicationMixin(
  api.ApplicationV2
) {
  constructor(diceJournal = null, options = {}) {
    super(options);
    this.#diceJournal = diceJournal;
  }

  #diceJournal;

  static DEFAULT_OPTIONS = {
    id: 'countdown-dice-config-{id}',
    classes: ['vagabond', 'countdown-dice-config'],
    window: {
      title: 'VAGABOND.CountdownDice.Create',
      icon: 'fas fa-dice-d20',
      resizable: false,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: 400,
      height: 'auto',
    },
    actions: {
      cancel: this._onCancel,
    },
  };

  static PARTS = {
    form: {
      template: 'systems/vagabond/templates/countdown-dice/config.hbs',
    },
  };

  get title() {
    if (!this.#diceJournal) {
      return game.i18n.localize('VAGABOND.CountdownDice.Create');
    }
    return `Configure: ${this.#diceJournal.name}`;
  }

  /**
   * Attach event listeners after rendering
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Attach form submit handler
    const form = this.element.querySelector('form');
    if (form) {
      form.addEventListener('submit', this._onFormSubmit.bind(this));
    }

    // Toggle burning options visibility
    const burningCheckbox = this.element.querySelector('#is-burning');
    const burningOptions = this.element.querySelector('#burning-options');
    const nameInput = this.element.querySelector('#dice-name');
    if (burningCheckbox && burningOptions) {
      burningCheckbox.addEventListener('change', (e) => {
        burningOptions.style.display = e.target.checked ? '' : 'none';
        // Auto-update name when toggling burning
        if (e.target.checked && nameInput.value === 'Countdown') {
          const tokenSelect = this.element.querySelector('#target-token');
          const tokenName = tokenSelect?.selectedOptions[0]?.textContent?.trim();
          const damageSelect = this.element.querySelector('#damage-type');
          const damageType = damageSelect?.value || 'fire';
          const label = damageType.charAt(0).toUpperCase() + damageType.slice(1);
          nameInput.value = tokenName && tokenName !== '— None (manual) —'
            ? `Burning (${label}): ${tokenName}`
            : `Burning (${label})`;
        } else if (!e.target.checked && nameInput.value.startsWith('Burning')) {
          nameInput.value = 'Countdown';
        }
      });

      // Update name when target token changes
      const tokenSelect = this.element.querySelector('#target-token');
      if (tokenSelect) {
        tokenSelect.addEventListener('change', () => {
          if (!burningCheckbox.checked) return;
          const tokenName = tokenSelect.selectedOptions[0]?.textContent?.trim();
          const damageSelect = this.element.querySelector('#damage-type');
          const damageType = damageSelect?.value || 'fire';
          const label = damageType.charAt(0).toUpperCase() + damageType.slice(1);
          nameInput.value = tokenName && tokenName !== '— None (manual) —'
            ? `Burning (${label}): ${tokenName}`
            : `Burning (${label})`;
        });
      }

      // Update name when damage type changes
      const damageSelect = this.element.querySelector('#damage-type');
      if (damageSelect) {
        damageSelect.addEventListener('change', () => {
          if (!burningCheckbox.checked) return;
          const tokenName = tokenSelect?.selectedOptions[0]?.textContent?.trim();
          const damageType = damageSelect.value || 'fire';
          const label = damageType.charAt(0).toUpperCase() + damageType.slice(1);
          nameInput.value = tokenName && tokenName !== '— None (manual) —'
            ? `Burning (${label}): ${tokenName}`
            : `Burning (${label})`;
        });
      }
    }
  }

  /**
   * Prepare context data for rendering
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get dice types from config
    const diceTypes = CONFIG.VAGABOND.countdownDiceTypes || [
      'd4',
      'd6',
      'd8',
      'd10',
      'd12',
      'd20',
    ];

    context.diceTypes = diceTypes;

    // Set defaults
    if (this.#diceJournal) {
      const flags = this.#diceJournal.flags.vagabond.countdownDice;
      context.name = flags.name;
      context.diceType = flags.diceType;
      context.size = flags.size;
      context.isEdit = true;
    } else {
      context.name = 'Countdown';
      context.diceType = 'd4';
      context.size = 'M';
      context.isEdit = false;

      // Burning die options (only for new dice)
      context.isBurning = false;
      context.selectedDamageType = 'fire';
      context.selectedTokenId = '';

      // Filter damage types to only ones that make sense for burning
      // (exclude healing, recover, recharge, none, physical, blunt, piercing, slashing)
      const burningTypes = ['fire', 'acid', 'shock', 'poison', 'cold', 'necrotic', 'psychic', 'magical'];
      context.burningDamageTypes = {};
      const allTypes = CONFIG.VAGABOND?.damageTypes || {};
      for (const type of burningTypes) {
        if (allTypes[type]) {
          context.burningDamageTypes[type] = allTypes[type];
        }
      }

      // Get tokens on the current scene for the target picker
      context.tokens = [];
      if (canvas?.scene?.tokens) {
        for (const tokenDoc of canvas.scene.tokens) {
          context.tokens.push({
            id: tokenDoc.id,
            name: tokenDoc.name || tokenDoc.actor?.name || 'Unknown',
          });
        }
        // Sort alphabetically
        context.tokens.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return context;
  }

  /**
   * Handle form submission
   */
  async _onFormSubmit(event) {
    try {
      // Prevent default form submission
      event.preventDefault();
      event.stopPropagation();

      // Get form data
      const formData = new foundry.applications.ux.FormDataExtended(event.target);
      const data = formData.object;

      if (this.#diceJournal) {
        // Edit existing dice
        await this.#diceJournal.update({
          name: data.name,
          'flags.vagabond.countdownDice.name': data.name,
          'flags.vagabond.countdownDice.diceType': data.diceType,
          'flags.vagabond.countdownDice.size': data.size,
        });
      } else {
        // Create new dice
        const ownership = {
          default: 0, // NONE for everyone
          [game.user.id]: 3, // OWNER for creator
        };

        // If burning, make visible to all players
        if (data.isBurning) {
          ownership.default = 3;
        }

        const journal = await CountdownDice.create({
          name: data.name,
          diceType: data.diceType,
          size: data.size,
          ownership: ownership,
        });

        // If burning die, set up the linked status effect
        if (data.isBurning && journal) {
          const damageType = data.damageType || 'fire';
          const targetTokenId = data.targetTokenId || '';
          const sceneId = canvas?.scene?.id || '';
          const tokenIds = targetTokenId ? [targetTokenId] : [];

          await journal.setFlag('vagabond', 'linkedStatusEffect', {
            status: 'burning',
            label: `Burning (${damageType.charAt(0).toUpperCase() + damageType.slice(1)})`,
            damageType: damageType,
            tokenIds: tokenIds,
            sceneId: sceneId,
          });

          // Apply Burning status to the target token's actor
          if (targetTokenId && sceneId) {
            const tokenDoc = canvas.scene.tokens.get(targetTokenId);
            const actor = tokenDoc?.actor;
            if (actor && !actor.statuses?.has('burning')) {
              await actor.toggleStatusEffect('burning', { active: true });
            }
          }
        }
      }

      // Close dialog
      this.close();
    } catch (error) {
      console.error('Error submitting countdown dice config:', error);
    }
  }

  /**
   * Handle cancel button click
   */
  static _onCancel(event, target) {
    this.close();
  }
}
