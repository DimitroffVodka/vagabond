import { VagabondActorSheet } from './actor-sheet.mjs';
import {
  SpellHandler,
  InventoryHandler,
  RollHandler,
  EquipmentHandler,
} from './handlers/_module.mjs';
import { EnrichmentHelper } from '../helpers/enrichment-helper.mjs';
import { AccordionHelper } from '../helpers/accordion-helper.mjs';

const { api, sheets } = foundry.applications;

/**
 * Classic wide-format character sheet inspired by the official Vagabond PDF
 * Landscape layout with everything visible - no tabs, no sliding panel
 *
 * Built as a standalone sheet extending the base VagabondActorSheet
 * to avoid polluting VagabondCharacterSheet statics.
 */
export class VagabondClassicSheet extends VagabondActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['vagabond', 'actor', 'character', 'classic-sheet'],
    position: {
      width: 860,
      height: 620,
    },
    actions: {
      ...VagabondActorSheet.DEFAULT_OPTIONS.actions,
      // Override toggle actions to use classic-feature selector
      toggleFeature: this._onToggleClassicAccordion,
      toggleTrait: this._onToggleClassicAccordion,
      togglePerk: this._onToggleClassicAccordion,
      toggleSection: this._onToggleSection,
    },
    window: {
      resizable: true,
    },
    dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
    form: {
      submitOnChange: true,
      submitDelay: 500,
    },
  };

  /** @override */
  static PARTS = {
    classicSheet: {
      template: 'systems/vagabond/templates/actor/classic-sheet.hbs',
      scrollable: ['.classic-col-center', '.classic-col-right'],
    },
  };

  constructor(object, options) {
    super(object, options);
    // Initialize handlers (same as VagabondCharacterSheet)
    this.spellHandler = new SpellHandler(this);
    this.inventoryHandler = new InventoryHandler(this);
    this.rollHandler = new RollHandler(this, { npcMode: false });
    this.equipmentHandler = new EquipmentHandler(this);
    this._listenerController = null;
  }

  /**
   * Unified toggle handler for features/traits/perks on the classic sheet.
   * The parent uses separate selectors (.feature, .trait, .perk-card) but
   * the classic sheet uses .classic-feature for all three.
   */
  static async _onToggleClassicAccordion(event, target) {
    const accordion = target.closest('.classic-feature.accordion-item');
    AccordionHelper.toggle(accordion);
  }

  /**
   * Toggle a collapsible section (e.g. Effects) open/closed.
   */
  static async _onToggleSection(event, target) {
    const section = target.closest('.classic-collapsible');
    if (section) section.classList.toggle('collapsed');
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ['classicSheet'];
  }

  /** @override */
  async _preparePartContext(partId, context) {
    if (partId === 'classicSheet') {
      try {
        await EnrichmentHelper.enrichFeatures(context, this.actor);
        await EnrichmentHelper.enrichTraits(context, this.actor);
        await EnrichmentHelper.enrichPerks(context, this.actor);
      } catch (error) {
        console.error("Vagabond | Classic sheet error enriching features:", error);
      }

      if (this.spellHandler) {
        try {
          await this.spellHandler.enrichSpellsContext(context);
        } catch (error) {
          console.error("Vagabond | Classic sheet error enriching spells:", error);
        }
      }

      return context;
    }
    return super._preparePartContext(partId, context);
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    this._listenerController?.abort();
    this._listenerController = new AbortController();
  }

  /** @override */
  async close(options) {
    this._listenerController?.abort();
    this._listenerController = null;
    return super.close(options);
  }
}
