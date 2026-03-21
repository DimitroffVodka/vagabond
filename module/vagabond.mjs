// Import document classes.
import { VagabondActor } from './documents/actor.mjs';
import { VagabondItem } from './documents/item.mjs';
import { VagabondCombat } from './documents/combat.mjs';
import { VagabondCombatant } from './documents/combatant.mjs';
import { VagabondActiveEffect } from './documents/active-effect.mjs';
import { ProgressClock } from './documents/progress-clock.mjs';
import { CountdownDice } from './documents/countdown-dice.mjs';
// Import sheet classes.
import {
  VagabondActorSheet,
  VagabondCharacterSheet,
  VagabondNPCSheet,
  VagabondPartySheet,
  VagabondConstructSheet,
  VagabondClassicSheet,
} from './sheets/_module.mjs';
import { VagabondItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { VAGABOND } from './helpers/config.mjs';
import { loadHomebrewConfig, applyTermOverrides } from './helpers/homebrew-config.mjs';
import { loadJB2ADefaults } from './helpers/sequencer-config.mjs';
import { VagabondChatCard } from './helpers/chat-card.mjs';
import { VagabondDiceAppearance } from './helpers/dice-appearance.mjs';
import { EquipmentHelper } from './helpers/equipment-helper.mjs';
import { performWeaponAttack } from './helpers/attack-pipeline.mjs';
import { ItemDropHelper } from './helpers/item-drop-helper.mjs';
import { LootDropHelper } from './helpers/loot-drop-helper.mjs';
import { ContextMenuHelper } from './helpers/context-menu-helper.mjs';
import { AccordionHelper } from './helpers/accordion-helper.mjs';
import { EnrichmentHelper } from './helpers/enrichment-helper.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';
// Import UI classes
import { ProgressClockOverlay } from './ui/progress-clock-overlay.mjs';
import { CountdownDiceOverlay } from './ui/countdown-dice-overlay.mjs';
// Import application classes
import { ProgressClockConfig } from './applications/progress-clock-config.mjs';
import { ProgressClockDeleteDialog } from './applications/progress-clock-delete-dialog.mjs';
import { CountdownDiceConfig } from './applications/countdown-dice-config.mjs';
import { DowntimeApp } from './applications/downtime-app.mjs';
import { HomebrewSettingsApp } from './applications/homebrew-settings-app.mjs';
import { VagabondMeasureTemplates } from './applications/measure-templates.mjs';
import { VagabondCharBuilder } from './applications/char-builder/index.mjs';
import { VagabondCombatTracker } from './ui/combat-tracker.mjs';
import { EncounterSettings } from './applications/encounter-settings.mjs';
import { SequencerFxConfig } from './applications/sequencer-fx-config.mjs';
import { CompendiumSettings } from './applications/compendium-settings.mjs';
import { FlankingHelper } from './helpers/flanking-helper.mjs';
import { MoraleHelper } from './helpers/morale-helper.mjs';
import { LightTracker } from './helpers/light-tracker.mjs';
import { LevelUpDialog } from './applications/level-up-dialog.mjs';
import { PartyCompactView } from './applications/party-compact-view.mjs';
import { RelicForge } from './applications/relic-forge.mjs';
import { OngoingPanel } from './applications/ongoing-panel.mjs';
import VagabondActiveEffectConfig from './applications/active-effect-config.mjs';
import { VagabondSpellSequencer } from './helpers/spell-sequencer.mjs';
import { VagabondItemSequencer } from './helpers/item-sequencer.mjs';
// Alchemy system
import { AlchemyCookbook, openCookbook } from './applications/alchemy-cookbook.mjs';
import {
  registerMaterialsHook, registerCountdownDamageHook, registerEffectExpirationHook,
  registerCountdownLinkedAEHook, registerOilBonusDamageHook, registerAlchemicalAttackHook,
  registerEurekaHook, registerConsumableUseHook, populateAlchemicalFolder,
  useConsumable, getConsumableEffect, getAlchemistData, craftItem,
} from './helpers/alchemy-helpers.mjs';
// NPC Passive Abilities (Magic Ward, etc.)
import { registerMagicWardHook, setCastCheckFlag } from './helpers/npc-abilities.mjs';

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Game Settings                               */
/* -------------------------------------------- */

/**
 * Register game settings for the Vagabond system
 */
function registerGameSettings() {
  // Setting 1: Roll damage with check
  game.settings.register('vagabond', 'rollDamageWithCheck', {
    name: 'VAGABOND.Settings.rollDamageWithCheck.name',
    hint: 'VAGABOND.Settings.rollDamageWithCheck.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  // Setting 2: Always roll damage (even on miss)
  game.settings.register('vagabond', 'alwaysRollDamage', {
    name: 'VAGABOND.Settings.alwaysRollDamage.name',
    hint: 'VAGABOND.Settings.alwaysRollDamage.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  // Setting 3: NPC flat damage preference
  game.settings.register('vagabond', 'npcUseFlatDamage', {
    name: 'VAGABOND.Settings.npcUseFlatDamage.name',
    hint: 'VAGABOND.Settings.npcUseFlatDamage.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  // Setting 4: Auto-apply save damage
  game.settings.register('vagabond', 'autoApplySaveDamage', {
    name: 'VAGABOND.Settings.autoApplySaveDamage.name',
    hint: 'VAGABOND.Settings.autoApplySaveDamage.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  // Setting 4: Default clock position
  game.settings.register('vagabond', 'defaultClockPosition', {
    name: 'VAGABOND.Settings.defaultClockPosition.name',
    hint: 'VAGABOND.Settings.defaultClockPosition.hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'top-right': 'VAGABOND.ProgressClock.Position.TopRight',
      'top-left': 'VAGABOND.ProgressClock.Position.TopLeft',
      'bottom-right': 'VAGABOND.ProgressClock.Position.BottomRight',
      'bottom-left': 'VAGABOND.ProgressClock.Position.BottomLeft'
    },
    default: 'top-right',
  });

  // Setting 6: Chat icons
  game.settings.register('vagabond', 'chatCardIconStyle', {
    name: 'VAGABOND.Settings.chatCardIconStyle.name', // "Chat Card Icon Style"
    hint: 'VAGABOND.Settings.chatCardIconStyle.hint', // "Choose what icon appears on the chat card."
    scope: 'client', // Client-side preference so each player can choose
    config: true,
    type: String,
    choices: {
      'item': 'VAGABOND.Settings.chatCardIconStyle.item', // "Always Item Icon (Default)"
      'smart': 'VAGABOND.Settings.chatCardIconStyle.smart' // "Actor Face for Attacks/Spells, Item Icon for Gear"
    },
    default: 'item',
    requiresReload: false
  });

  // Setting 7: Status Effects Mode
  game.settings.register('vagabond', 'statusEffectsMode', {
    name: 'VAGABOND.Settings.statusEffectsMode.name',
    hint: 'VAGABOND.Settings.statusEffectsMode.hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'vagabond': 'VAGABOND.Settings.statusEffectsMode.vagabond',
      'foundry': 'VAGABOND.Settings.statusEffectsMode.foundry'
    },
    default: 'vagabond',
    requiresReload: true
  });

  // Setting 8: Hide Initiative Roll
  game.settings.register('vagabond', 'hideInitiativeRoll', {
    name: 'VAGABOND.Settings.hideInitiativeRoll.name',
    hint: 'VAGABOND.Settings.hideInitiativeRoll.hint',
    scope: 'world',
    config: false, // Not shown in standard config - use Encounter Settings dialog instead
    type: Boolean,
    default: true,
    requiresReload: false
  });

  // Setting 9: Use Activation Points
  game.settings.register('vagabond', 'useActivationPoints', {
    name: 'VAGABOND.Settings.useActivationPoints.name',
    hint: 'VAGABOND.Settings.useActivationPoints.hint',
    scope: 'world',
    config: false, // Not shown in standard config - use Encounter Settings dialog instead
    type: Boolean,
    default: false,
    requiresReload: false
  });

  // Setting 10: Custom Initiative Formula (PCs)
  game.settings.register('vagabond', 'initiativeFormula', {
    name: 'VAGABOND.Settings.initiativeFormula.name',
    hint: 'VAGABOND.Settings.initiativeFormula.hint',
    scope: 'world',
    config: false, // Not shown in standard config - use Encounter Settings dialog instead
    type: String,
    default: '3d6 + @dexterity.value + @awareness.value',
    requiresReload: false
  });

  // Setting 11: Custom Initiative Formula (NPCs)
  game.settings.register('vagabond', 'npcInitiativeFormula', {
    name: 'VAGABOND.Settings.npcInitiativeFormula.name',
    hint: 'VAGABOND.Settings.npcInitiativeFormula.hint',
    scope: 'world',
    config: false, // Not shown in standard config - use Encounter Settings dialog instead
    type: String,
    default: '3d6 + ceil(@speed / 10)',
    requiresReload: false
  });

  // Setting 12: Default Activation Points
  game.settings.register('vagabond', 'defaultActivationPoints', {
    name: 'VAGABOND.Settings.defaultActivationPoints.name',
    hint: 'VAGABOND.Settings.defaultActivationPoints.hint',
    scope: 'world',
    config: false, // Not shown in standard config - use Encounter Settings dialog instead
    type: Number,
    default: 2,
    requiresReload: false
  });

  // Setting 12b: Faction Titles
  game.settings.register('vagabond', 'factionFriendly', {
    name: 'VAGABOND.EncounterSettings.Factions.Friendly',
    scope: 'world',
    config: false,
    type: String,
    default: 'Heroes',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionFriendlyColor', {
    name: 'VAGABOND.EncounterSettings.Factions.FriendlyColor',
    scope: 'world',
    config: false,
    type: String,
    default: '#7fbf7f',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionNeutral', {
    name: 'VAGABOND.EncounterSettings.Factions.Neutral',
    scope: 'world',
    config: false,
    type: String,
    default: 'Neutrals',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionNeutralColor', {
    name: 'VAGABOND.EncounterSettings.Factions.NeutralColor',
    scope: 'world',
    config: false,
    type: String,
    default: '#dfdf7f',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionHostile', {
    name: 'VAGABOND.EncounterSettings.Factions.Hostile',
    scope: 'world',
    config: false,
    type: String,
    default: 'NPCs',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionHostileColor', {
    name: 'VAGABOND.EncounterSettings.Factions.HostileColor',
    scope: 'world',
    config: false,
    type: String,
    default: '#df7f7f',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionSecret', {
    name: 'VAGABOND.EncounterSettings.Factions.Secret',
    scope: 'world',
    config: false,
    type: String,
    default: 'Secret',
    requiresReload: false
  });

  game.settings.register('vagabond', 'factionSecretColor', {
    name: 'VAGABOND.EncounterSettings.Factions.SecretColor',
    scope: 'world',
    config: false,
    type: String,
    default: '#bf7fdf',
    requiresReload: false
  });

  // Setting 13: Encounter Settings Button (Menu)
  game.settings.registerMenu('vagabond', 'encounterSettingsMenu', {
    name: 'VAGABOND.Settings.encounterSettings.name',
    label: 'VAGABOND.Settings.encounterSettings.label',
    hint: 'VAGABOND.Settings.encounterSettings.hint',
    icon: 'fas fa-swords',
    type: EncounterSettings,
    restricted: true
  });

  // Setting 14: Character Builder Compendiums (Data)
  game.settings.register('vagabond', 'characterBuilderCompendiums', {
    name: 'Character Builder Compendiums',
    scope: 'world',
    config: false,
    type: Object,
    default: {
      useAll: true,
      enabled: []
    },
    requiresReload: false
  });

  // Setting 15: Character Builder Compendiums (Menu)
  game.settings.registerMenu('vagabond', 'compendiumSettingsMenu', {
    name: 'VAGABOND.Settings.compendiumSettings.name',
    label: 'VAGABOND.Settings.compendiumSettings.label',
    hint: 'VAGABOND.Settings.compendiumSettings.hint',
    icon: 'fas fa-books',
    type: CompendiumSettings,
    restricted: true
  });

  // Setting 18: Homebrew Config (hidden data store)
  game.settings.register('vagabond', 'homebrewConfig', {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
    requiresReload: false,
  });

  // Setting 18b: ID of the currently active library entry (empty string = none / custom)
  // The library itself lives in assets/vagabond/homebrew/library.json (shared across worlds)
  game.settings.register('vagabond', 'activeHomebrewId', {
    scope: 'world',
    config: false,
    type: String,
    default: '',
    requiresReload: false,
  });

  // Setting 20a: Use Animations — world-level master switch (GM)
  game.settings.register('vagabond', 'useAnimations', {
    name: 'VAGABOND.Settings.useAnimations.name',
    hint: 'VAGABOND.Settings.useAnimations.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  // Setting 20: Sequencer spell FX (client-side toggle)
  game.settings.register('vagabond', 'useSequencerFX', {
    name: 'VAGABOND.Settings.useSequencerFX.name',
    hint: 'VAGABOND.Settings.useSequencerFX.hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

  // Setting 21: Sequencer FX animation config (hidden data store)
  game.settings.register('vagabond', 'sequencerFxConfig', {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
    requiresReload: false,
  });

  // Setting 21b: Sequencer FX Config menu button
  game.settings.registerMenu('vagabond', 'sequencerFxConfigMenu', {
    name: 'VAGABOND.Settings.sequencerFxConfig.name',
    label: 'VAGABOND.Settings.sequencerFxConfig.label',
    hint: 'VAGABOND.Settings.sequencerFxConfig.hint',
    icon: 'fas fa-wand-magic-sparkles',
    type: SequencerFxConfig,
    restricted: true,
  });

  // Setting 22: Use Item Animations — world-level master switch for weapon/alchemical/relic FX
  game.settings.register('vagabond', 'useItemAnimations', {
    name: 'VAGABOND.Settings.useItemAnimations.name',
    hint: 'VAGABOND.Settings.useItemAnimations.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  // Setting 19: Homebrew Settings Menu button
  game.settings.registerMenu('vagabond', 'homebrewSettingsMenu', {
    name: 'VAGABOND.Settings.homebrewSettings.name',
    label: 'VAGABOND.Settings.homebrewSettings.label',
    hint: 'VAGABOND.Settings.homebrewSettings.hint',
    icon: 'fas fa-flask-round-potion',
    type: HomebrewSettingsApp,
    restricted: true,
  });

  // Setting: Flanking
  game.settings.register('vagabond', 'flankingEnabled', {
    name: 'Flanking',
    hint: 'Automatically apply Vulnerable when 2+ allies are Close to a foe that is no more than one size larger. Disabled if the vagabond-crawler module provides its own flanking.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

  // Setting: Morale
  game.settings.register('vagabond', 'moraleEnabled', {
    name: 'Morale Checks',
    hint: 'Automatically trigger morale checks when: their leader is defeated, the first NPC dies, half the group is defeated, or a solo NPC drops to half HP. Results are whispered to the GM.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

  // Setting: Loot Drops
  game.settings.register('vagabond', 'lootDropEnabled', {
    name: 'Loot Drops',
    hint: 'Defeated NPCs automatically drop loot bags after combat ends. Each player gets personal loot they can take or pass to others.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  game.settings.register('vagabond', 'lootDropChance', {
    name: 'Loot Drop Chance (%)',
    hint: 'Global chance (0-100) that a defeated NPC drops loot. Individual NPCs can override this value. Set to 100 for guaranteed drops.',
    scope: 'world',
    config: true,
    type: Number,
    default: 50,
    range: { min: 0, max: 100, step: 5 },
    requiresReload: false,
  });

  // Setting: Light Tracking
  game.settings.register('vagabond', 'lightTrackingEnabled', {
    name: 'Light Tracking',
    hint: 'Track torch and lantern burn time automatically. Light sources can be toggled from the inventory context menu, dropped on the canvas, and picked up via the Token HUD. Disabled if the vagabond-crawler module provides its own light tracker.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

}

/* -------------------------------------------- */
/*  Template Preloading                         */
/* -------------------------------------------- */

// Track template loading state
let templatesReady = false;

/**
 * Preload Handlebars templates for partials
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Shared partials
    'systems/vagabond/templates/shared/damage-type-select.hbs',
    'systems/vagabond/templates/shared/size-select.hbs',
    'systems/vagabond/templates/shared/being-type-select.hbs',
    'systems/vagabond/templates/shared/weapon-skill-select.hbs',
    'systems/vagabond/templates/shared/bonus-stats-selector.hbs',
    // Item partials
    'systems/vagabond/templates/item/parts/grants-config.hbs',
    // Actor partials
    'systems/vagabond/templates/actor/parts/inventory-card.hbs',
    // Party sheet partials
    'systems/vagabond/templates/party/party-member-card.hbs',
    'systems/vagabond/templates/party/party-npc-card.hbs',
    'systems/vagabond/templates/party/vehicle-part-card.hbs',
    'systems/vagabond/templates/party/party-compact-view.hbs',
    'systems/vagabond/templates/party/notes-tab.hbs',
    'systems/vagabond/templates/party/notes-right.hbs',
    // Construct sheet partials
    'systems/vagabond/templates/construct/construct-tab.hbs',
    'systems/vagabond/templates/construct/construct-part-card.hbs',
    //Chat cards
    'systems/vagabond/templates/chat/damage-display.hbs',
    // Ongoing panel
    'systems/vagabond/templates/apps/ongoing-panel.hbs',
  ];

  // Load standard partials
  await foundry.applications.handlebars.loadTemplates(templatePaths);

  // Manually register character builder partials with simple names
  const builderParts = {
    'navigation': 'systems/vagabond/templates/apps/char-builder-parts/navigation.hbs',
    'sidebar': 'systems/vagabond/templates/apps/char-builder-parts/sidebar.hbs',
    'decision': 'systems/vagabond/templates/apps/char-builder-parts/decision.hbs',
    'tray': 'systems/vagabond/templates/apps/char-builder-parts/tray.hbs',
    'preview': 'systems/vagabond/templates/apps/char-builder-parts/preview.hbs',
    'reference': 'systems/vagabond/templates/apps/char-builder-parts/reference.hbs',
    'footer': 'systems/vagabond/templates/apps/char-builder-parts/footer.hbs'
  };

  // Register each builder part as a Handlebars partial (parallel instead of sequential)
  await Promise.all(
    Object.entries(builderParts).map(async ([name, path]) => {
      const template = await foundry.applications.handlebars.getTemplate(path);
      Handlebars.registerPartial(name, template);
    })
  );

  // Mark templates as ready (set both local and global flags)
  templatesReady = true;
  globalThis.vagabond.templatesReady = true;
}

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.vagabond = {
  templatesReady: false, // Track template loading state
  documents: {
    VagabondActor,
    VagabondItem,
    VagabondActiveEffect,
    ProgressClock,
    CountdownDice,
  },
  applications: {
    VagabondActorSheet,
    VagabondCharacterSheet,
    VagabondNPCSheet,
    VagabondItemSheet,
    ProgressClockConfig,
    ProgressClockDeleteDialog,
    CountdownDiceConfig,
    DowntimeApp,
    VagabondMeasureTemplates,
    VagabondCharBuilder,
    EncounterSettings,
    HomebrewSettingsApp,
    LevelUpDialog,
    PartyCompactView,
    RelicForge,
    OngoingPanel,
  },
  ui: {
    ProgressClockOverlay,
    CountdownDiceOverlay,
  },
  utils: {
    rollItemMacro,
    VagabondChatCard,
    VagabondDiceAppearance,
    EquipmentHelper,
    ContextMenuHelper,
    AccordionHelper,
    EnrichmentHelper,
    performWeaponAttack,
  },
  models,
};

Hooks.once('init', function () {
  console.log("Vagabond | Initializing System...");
  // Register game settings first to avoid preparation errors
  registerGameSettings();

  // Add custom constants for configuration.
  CONFIG.VAGABOND = VAGABOND;

  // Load homebrew config and store at CONFIG.VAGABOND.homebrew.
  // Must run before DataModel registration so schemas can read homebrew values.
  loadHomebrewConfig();

  // Apply custom status effects based on game setting
  const statusEffectsMode = game.settings.get('vagabond', 'statusEffectsMode');
  if (statusEffectsMode === 'vagabond') {
    // Sort status effects alphabetically by localized name
    const sortedEffects = [...VAGABOND.statusEffectDefinitions].sort((a, b) => {
      const nameA = game.i18n.localize(a.name);
      const nameB = game.i18n.localize(b.name);
      return nameA.localeCompare(nameB);
    });
    CONFIG.statusEffects = sortedEffects;
    console.log('Vagabond | Using custom Vagabond status conditions (sorted alphabetically)');
  }
  // If 'foundry', do nothing - Foundry's defaults will remain active

  // Loads placeholder images for character sheets
  CONFIG.Actor.typeImages = VAGABOND.actorTypeImages;

  // Preload Handlebars templates in the background — sheets don't render until
  // after the ready hook, so templates will be available in time.
  preloadHandlebarsTemplates();

  /**
   * Set default initiative formula for the system
   * Note: PCs and NPCs use separate custom formulas from settings (see VagabondCombatant.getInitiativeRoll)
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: game.settings.get('vagabond', 'initiativeFormula') || '3d6 + @dexterity.value + @awareness.value',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = VagabondActor;

  // Define custom Combat classes
  console.log("Vagabond | Registering Combat classes...");
  CONFIG.Combat.documentClass = VagabondCombat;
  CONFIG.Combatant.documentClass = VagabondCombatant;

  // Modify CombatTracker in place (Lancer Initiative pattern)
  console.log("Vagabond | Modifying CombatTracker in place...");
  const CombatTracker = foundry.applications.sidebar.tabs.CombatTracker;

  // Store original methods we'll wrap
  const originalPrepareTrackerContext = CombatTracker.prototype._prepareTrackerContext;
  const originalGetEntryContextOptions = CombatTracker.prototype._getEntryContextOptions;
  const originalActivateListeners = CombatTracker.prototype.activateListeners;

  // Replace template
  console.log("Vagabond | Setting custom combat tracker template");
  CombatTracker.PARTS.tracker.template = "systems/vagabond/templates/sidebar/combat-tracker.hbs";

  // Add custom actions
  console.log("Vagabond | Adding custom combat tracker actions");
  Object.assign(CombatTracker.DEFAULT_OPTIONS.actions, {
    activate: VagabondCombatTracker.onActivate,
    deactivate: VagabondCombatTracker.onDeactivate,
    rollDetect: VagabondCombatTracker.onRollDetect
  });

  // Wrap _prepareTrackerContext (NOT _prepareContext!)
  console.log("Vagabond | Wrapping _prepareTrackerContext method");
  CombatTracker.prototype._prepareTrackerContext = async function(context, options) {
    return VagabondCombatTracker.prepareTrackerContext.call(this, originalPrepareTrackerContext, context, options);
  };

  // Wrap _getEntryContextOptions
  console.log("Vagabond | Wrapping _getEntryContextOptions method");
  CombatTracker.prototype._getEntryContextOptions = function() {
    return VagabondCombatTracker.getEntryContextOptions.call(this, originalGetEntryContextOptions);
  };

  // Wrap activateListeners
  console.log("Vagabond | Wrapping activateListeners method");
  CombatTracker.prototype.activateListeners = function(html) {
    const jQueryHtml = html instanceof HTMLElement ? $(html) : html;
    return VagabondCombatTracker.activateListeners.call(this, originalActivateListeners, jQueryHtml);
  };

  console.log("Vagabond | Combat document class:", CONFIG.Combat.documentClass.name);
  console.log("Vagabond | Combatant document class:", CONFIG.Combatant.documentClass.name);
  console.log("Vagabond | Combat Tracker template:", CombatTracker.PARTS.tracker.template);
  console.log("Vagabond | Combat Tracker actions:", Object.keys(CombatTracker.DEFAULT_OPTIONS.actions));

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.VagabondCharacter,
    npc: models.VagabondNPC,
    party: models.VagabondParty,
    construct: models.VagabondConstruct,
  };
  CONFIG.Item.documentClass = VagabondItem;
  CONFIG.Item.dataModels = {
    equipment: models.VagabondEquipment,
    spell: models.VagabondSpell,
    ancestry: models.VagabondAncestry,
    class: models.VagabondClass,
    perk: models.VagabondPerk,
    starterPack: models.VagabondStarterPack,
    container: models.VagabondContainerData,
    vehiclePart: models.VagabondVehiclePart,
  };

  globalThis.vagabond.managers = {
    templates: new VagabondMeasureTemplates()
  };

  // Register custom ActiveEffect document class
  CONFIG.ActiveEffect.documentClass = VagabondActiveEffect;

  // Register custom ActiveEffectConfig sheet
  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, 'vagabond', VagabondActiveEffectConfig, {
    makeDefault: true,
    label: 'VAGABOND.Effect.ConfigSheet'
  });

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', sheets.ActorSheet);

  // Register character sheet
  collections.Actors.registerSheet('vagabond', VagabondCharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'VAGABOND.SheetLabels.Character',
  });

  // Register classic character sheet (alternative wide layout)
  collections.Actors.registerSheet('vagabond', VagabondClassicSheet, {
    types: ['character'],
    makeDefault: false,
    label: 'Vagabond Classic Sheet',
  });

  // Register NPC sheet
  collections.Actors.registerSheet('vagabond', VagabondNPCSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'VAGABOND.SheetLabels.NPC',
  });

  // Register Party sheet
  collections.Actors.registerSheet('vagabond', VagabondPartySheet, {
    types: ['party'],
    makeDefault: true,
    label: 'VAGABOND.SheetLabels.Party',
  });

  // Register Construct sheet
  collections.Actors.registerSheet('vagabond', VagabondConstructSheet, {
    types: ['construct'],
    makeDefault: true,
    label: 'VAGABOND.SheetLabels.Construct',
  });
  collections.Items.unregisterSheet('core', sheets.ItemSheet);
  collections.Items.registerSheet('vagabond', VagabondItemSheet, {
    makeDefault: true,
    label: 'VAGABOND.SheetLabels.Item',
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

// Capitalize first letter of a string
Handlebars.registerHelper('capitalize', function (str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
});

// Check if an array contains a value
Handlebars.registerHelper('contains', function (array, value) {
  if (!array || !Array.isArray(array)) return false;
  return array.includes(value);
});

Handlebars.registerHelper('add', (a, b) => a + b);

Handlebars.registerHelper('gte', (a, b) => a >= b);

Handlebars.registerHelper('and', function () {
  const args = Array.prototype.slice.call(arguments, 0, -1);
  return args.every(Boolean);
});

Handlebars.registerHelper('or', function () {
  const args = Array.prototype.slice.call(arguments, 0, -1);
  return args.some(Boolean);
});

Handlebars.registerHelper('not', (a) => !a);

// Stringify object to JSON for textarea display
Handlebars.registerHelper('json', function(context) {
  if (context === undefined || context === null) return '';
  if (typeof context === 'string') return context;
  try {
    return JSON.stringify(context, null, 2);
  } catch (e) {
    console.warn('Failed to stringify JSON:', e);
    return '';
  }
});
/* -------------------------------------------- */
/*  i18nInit Hook                               */
/* -------------------------------------------- */

// Apply custom term overrides after translations are loaded.
Hooks.once('i18nInit', function () {
  applyTermOverrides(CONFIG.VAGABOND.homebrew);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));
});

// Initialize flanking detection
Hooks.once('ready', () => {
  FlankingHelper.init();
});

// Initialize morale checks
Hooks.once('ready', () => {
  MoraleHelper.init();
});

// Initialize light tracker and item drop helper
Hooks.once('ready', () => {
  LightTracker.init();
  LightTracker.registerSocketListeners();
  ItemDropHelper.init();
  ItemDropHelper.registerSocketListeners();
  LootDropHelper.init();
  LootDropHelper.registerSocketListeners();
  // Expose for crawler crawl-bar integration
  globalThis.vagabond.lightTracker = LightTracker;
});

// Pre-load JB2A animation defaults when both Sequencer and JB2A are installed.
// Runs silently — no errors if modules are absent.
Hooks.once('ready', function () {
  if (VagabondSpellSequencer.isAvailable() && VagabondSpellSequencer.isJB2AAvailable()) {
    loadJB2ADefaults();
  }
});

// Register Dice So Nice colorsets when Dice So Nice is ready
Hooks.once('diceSoNiceReady', (dice3d) => {
  VagabondDiceAppearance.registerColorsets();
});

/* -------------------------------------------- */
/*  UI Hooks - Progress Clocks Overlay          */
/* -------------------------------------------- */

// Global overlay instance
let clockOverlay = null;

/**
 * Initialize the progress clocks HTML overlay when ready
 */
Hooks.once('ready', () => {
  clockOverlay = new ProgressClockOverlay();
  clockOverlay.initialize();

  // Store in global for easy access
  globalThis.vagabond.ui.clockOverlay = clockOverlay;
});

/**
 * Draw progress clocks when canvas is ready
 */
Hooks.on('canvasReady', async () => {
  // Ensure overlay is initialized
  if (!clockOverlay) {
    clockOverlay = new ProgressClockOverlay();
    clockOverlay.initialize();
    globalThis.vagabond.ui.clockOverlay = clockOverlay;
  }

  if (clockOverlay) {
    await clockOverlay.draw();
  }
});

/* -------------------------------------------- */
/*  Alchemy — Consumable Use Buttons on Sheets  */
/* -------------------------------------------- */

/**
 * Register a renderApplicationV2 hook that injects flask "Use" buttons
 * for alchemical consumables (Potions, Antitoxin, etc.) on character sheets.
 */
function registerConsumableContextMenuOnSheets() {
  Hooks.on("renderApplicationV2", (app, html) => {
    if (!app.actor) return;
    const el = html instanceof HTMLElement ? html : html?.[0] ?? app.element;
    if (!el) return;
    const actor = app.actor;

    // Find all equipment items in the inventory panel
    const itemRows = el.querySelectorAll("[data-item-id]");
    for (const row of itemRows) {
      const itemId = row.dataset.itemId;
      const actorItem = actor.items.get(itemId);
      if (!actorItem || actorItem.type !== "equipment") continue;
      const effect = getConsumableEffect(actorItem.name);
      if (!effect) continue;

      // Add a "Use" button if not already present
      if (row.querySelector(".vc-use-consumable")) continue;
      const useBtn = document.createElement("a");
      useBtn.className = "vc-use-consumable";
      useBtn.title = `Use ${actorItem.name}`;
      useBtn.innerHTML = '<i class="fas fa-flask"></i>';
      useBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await useConsumable(actor, actorItem);
        app.render();
      });

      // Insert the button near the item controls
      const controls = row.querySelector(".item-controls") ?? row.querySelector(".eq-controls");
      if (controls) {
        controls.prepend(useBtn);
      } else {
        row.appendChild(useBtn);
      }
    }
  });
  console.log("Vagabond | Consumable use buttons hook registered.");
}

/* -------------------------------------------- */
/*  UI Hooks - Countdown Dice Overlay           */
/* -------------------------------------------- */

// Global overlay instance
let diceOverlay = null;

/**
 * Initialize the countdown dice HTML overlay when ready
 */
Hooks.once('ready', () => {
  diceOverlay = new CountdownDiceOverlay();
  diceOverlay.initialize();

  // Store in global for easy access
  globalThis.vagabond.ui.countdownDiceOverlay = diceOverlay;

  // Verify Combat system registration
  console.log("Vagabond | System Ready - Verifying Combat registration:");
  console.log("  - CONFIG.Combat.documentClass:", CONFIG.Combat.documentClass?.name);
  console.log("  - CONFIG.Combatant.documentClass:", CONFIG.Combatant.documentClass?.name);
  console.log("  - ui.combat instance:", ui.combat?.constructor?.name);
  console.log("  - CombatTracker template:", foundry.applications.sidebar.tabs.CombatTracker.PARTS.tracker.template);

  // Check if methods are wrapped
  const hasCustomActions = 'activate' in foundry.applications.sidebar.tabs.CombatTracker.DEFAULT_OPTIONS.actions;
  console.log("  - Custom actions registered:", hasCustomActions);

  if (CONFIG.Combat.documentClass?.name === "VagabondCombat" &&
      CONFIG.Combatant.documentClass?.name === "VagabondCombatant" &&
      hasCustomActions) {
    console.log("Vagabond | Combat system successfully registered!");
  } else {
    console.warn("Vagabond | WARNING: Combat system not fully registered!");
  }

  // ── Alchemy System Hooks ──
  registerMaterialsHook();
  registerCountdownDamageHook();
  registerEffectExpirationHook();
  registerCountdownLinkedAEHook();
  registerOilBonusDamageHook();
  registerAlchemicalAttackHook();
  registerEurekaHook();
  registerConsumableUseHook();
  registerConsumableContextMenuOnSheets();

  // Expose alchemy API for macros/console
  globalThis.vagabond.alchemy = {
    openCookbook,
    populateAlchemicalFolder,
    useConsumable,
    getConsumableEffect,
    getAlchemistData,
    craftItem,
  };

  console.log("Vagabond | Alchemy system hooks registered.");

  // ── NPC Passive Abilities (Magic Ward) ──
  registerMagicWardHook();

  // Expose setCastCheckFlag so external modules (e.g. crawler spell dialog) can use it
  globalThis.vagabond.setCastCheckFlag = setCastCheckFlag;
});

/**
 * Draw countdown dice when canvas is ready
 */
Hooks.on('canvasReady', async () => {
  // Ensure overlay is initialized
  if (!diceOverlay) {
    diceOverlay = new CountdownDiceOverlay();
    diceOverlay.initialize();
    globalThis.vagabond.ui.countdownDiceOverlay = diceOverlay;
  }

  if (diceOverlay) {
    await diceOverlay.draw();
  }
});

/**
 * Auto-mark NPCs as defeated in combat when HP reaches 0.
 * Also clean up any countdown/burning dice linked to the dead NPC.
 * Handles both linked actors (updateActor) and unlinked tokens (updateToken).
 */
async function _checkNPCDefeated(combatant) {
  if (!combatant || combatant.defeated) return;
  const tokenActor = combatant.token?.actor ?? combatant.actor;
  if (!tokenActor || tokenActor.type !== 'npc') return;
  const hp = tokenActor.system?.health;
  if (!hp || hp.value > 0) return;

  await combatant.update({ defeated: true });
  const token = combatant.token?.object;
  if (token?.actor && !token.actor.statuses?.has('dead')) {
    await token.actor.toggleStatusEffect('dead', { active: true });
  }

  if (combatant.token?.id && canvas?.scene?.id) {
    try {
      const { VagabondCombat } = await import('./documents/combat.mjs');
      await VagabondCombat.cleanupDiceForToken(combatant.token.id, canvas.scene.id, tokenActor.name);
    } catch (e) { console.warn('Vagabond | Error cleaning up NPC countdown dice:', e); }
  }
}

// Auto-mark NPCs as defeated when HP reaches 0.
// Works for both linked and unlinked tokens by checking every NPC combatant's
// current HP after any actor update, matching by token actor identity.
Hooks.on('updateActor', async (actor, changes) => {
  if (!game.user.isGM || !game.combat) return;
  if (actor.type !== 'npc') return;
  const newHP = changes?.system?.health?.value;
  if (newHP === undefined || newHP > 0) return;

  // Find the combatant whose token's actor IS this actor (handles unlinked synthetic actors)
  for (const combatant of game.combat.combatants) {
    if (combatant.defeated) continue;
    const tokenActor = combatant.token?.actor;
    if (tokenActor === actor || (combatant.token?.actorLink && combatant.actorId === actor.id)) {
      await _checkNPCDefeated(combatant);
      break;
    }
  }
});

/**
 * Add scene controls for Vagabond tools
 */
Hooks.on('getSceneControlButtons', (controls) => {
  // Add Vagabond control group (v13 uses object structure)
  controls.vagabond = {
    name: 'vagabond',
    title: 'Vagabond Tools',
    icon: 'fas fa-circle-v',
    layer: 'tokens',
    activeTool: 'select',
    tools: {
      select: {
        name: 'select',
        title: 'Select/Interact',
        icon: 'fas fa-expand',
        onChange: () => {} // Empty handler for default tool
      },
      createClock: {
        name: 'createClock',
        title: game.i18n.localize('VAGABOND.ProgressClock.SceneControls.Create'),
        icon: 'fas fa-chart-pie',
        button: true,
        onClick: async () => {
          try {
            const { ProgressClockConfig } = globalThis.vagabond.applications;
            const dialog = new ProgressClockConfig(null);
            await dialog.render(true);
          } catch (error) {
            ui.notifications.error("Failed to open clock config: " + error.message);
          }
        }
      },
      createCountdownDice: {
        name: 'createCountdownDice',
        title: game.i18n.localize('VAGABOND.CountdownDice.SceneControls.Create'),
        icon: 'fas fa-dice-six',
        button: true,
        onClick: async () => {
          try {
            const { CountdownDiceConfig } = globalThis.vagabond.applications;
            const dialog = new CountdownDiceConfig(null);
            await dialog.render(true);
          } catch (error) {
            ui.notifications.error("Failed to open countdown dice config: " + error.message);
          }
        }
      },
      lightTracker: {
        name: 'lightTracker',
        title: 'Light Tracker',
        icon: 'fas fa-fire',
        button: true,
        visible: game.user.isGM && game.settings.get('vagabond', 'lightTrackingEnabled'),
        onClick: () => {
          LightTracker.openTracker();
        }
      },
      relicForge: {
        name: 'relicForge',
        title: 'Relic Forge',
        icon: 'fas fa-gem',
        button: true,
        visible: game.user.isGM,
        onClick: () => {
          RelicForge.open();
        }
      },
      ongoingPanel: {
        name:    'ongoingPanel',
        title:   game.i18n.localize('VAGABOND.OngoingPanel.SceneControl'),
        icon:    'fas fa-list-ul',
        button:  true,
        onClick: () => Hooks.callAll('vagabond.toggleOngoingPanel'),
      },
    }
  };
});

Hooks.on('vagabond.toggleOngoingPanel', () => {
  OngoingPanel.toggle();
});

/**
 * Refresh clock when journals are updated
 */
Hooks.on('updateJournalEntry', async (journal, changes, options, userId) => {
  // Handle progress clocks
  if (journal.flags?.vagabond?.progressClock?.type === 'progressClock') {
    if (clockOverlay) {
      const clockChanges = changes.flags?.vagabond?.progressClock;

      // If only positions changed (dragging), don't do anything - element already moved in DOM
      if (clockChanges?.positions !== undefined && Object.keys(clockChanges).length === 1 && !clockChanges.size && !clockChanges.segments && !clockChanges.defaultPosition && !clockChanges.faded) {
        // Position was already updated by drag handler, no need to redraw
        return;
      }
      // For any other changes (filled, name, size, segments, ownership, fade, etc.), redraw the clock
      else if (clockChanges || changes.name || changes.ownership) {
        await clockOverlay.draw();
      }
    }
  }

  // Handle countdown dice
  if (journal.flags?.vagabond?.countdownDice?.type === 'countdownDice') {
    if (diceOverlay) {
      const diceChanges = changes.flags?.vagabond?.countdownDice;

      // If only positions changed (dragging), don't do anything - element already moved in DOM
      if (diceChanges?.positions !== undefined && Object.keys(diceChanges).length === 1 && !diceChanges.diceType && !diceChanges.name && !diceChanges.size && !diceChanges.faded) {
        // Position was already updated by drag handler, no need to redraw
        return;
      }
      // For other changes (name, diceType, size, ownership, fade, etc.), refresh only this dice
      else if (diceChanges || changes.name || changes.ownership) {
        await diceOverlay.refreshDice(journal.id, journal);
      }
    }
  }
});

/**
 * Remove clock/dice when journal is deleted
 * Always attempt cleanup regardless of flags — after F5 refresh or in some
 * Foundry V13 scenarios, journal.flags may be stripped before the hook fires.
 * Both removeClock() and removeDice() are no-ops if no element exists.
 */

// Cache Starstruck link data before deletion, in case flags are stripped by the time
// the deleteJournalEntry hook fires (Foundry V13 edge case).
const _starstruckLinkCache = new Map();
Hooks.on('preDeleteJournalEntry', (journal) => {
  const starstruckLink = journal.flags?.vagabond?.starstruckLink;
  if (starstruckLink) {
    _starstruckLinkCache.set(journal.id, starstruckLink);
  }
});

Hooks.on('deleteJournalEntry', async (journal, options, userId) => {
  if (clockOverlay) {
    clockOverlay.removeClock(journal.id);
  }
  if (diceOverlay) {
    diceOverlay.removeDice(journal.id);
  }

  // Starstruck auto-cleanup (fallback): remove linked status effects when countdown die expires.
  // Primary cleanup happens in countdown-dice-overlay._cleanupLinkedEffects() before delete.
  // This hook serves as a safety net in case the overlay path is bypassed.
  if (game.user.isGM) {
    const starstruckLink = journal.flags?.vagabond?.starstruckLink
      || _starstruckLinkCache.get(journal.id);
    _starstruckLinkCache.delete(journal.id);

    if (starstruckLink) {
      const { status, tokenIds, sceneId } = starstruckLink;
      if (status && tokenIds?.length && sceneId) {
        const scene = game.scenes.get(sceneId);
        if (scene) {
          const clearedNames = [];
          for (const tokenId of tokenIds) {
            const tokenDoc = scene.tokens.get(tokenId);
            const actor = tokenDoc?.actor;
            if (!actor) continue;
            if (actor.statuses?.has(status)) {
              await actor.toggleStatusEffect(status);
              clearedNames.push(actor.name);
            }
          }
          if (clearedNames.length > 0) {
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            ui.notifications.info(`Starstruck expired — ${statusLabel} removed from ${clearedNames.join(', ')}.`);
          }
        }
      }
    }

    // Auto-remove linked status when its countdown die expires (generic)
    const cdFlags = journal.flags?.vagabond?.countdownDice;
    if (cdFlags?.linkedActorUuid && cdFlags?.linkedStatusId) {
      try {
        const actor = await fromUuid(cdFlags.linkedActorUuid);
        if (actor) {
          await actor.toggleStatusEffect(cdFlags.linkedStatusId, { active: false });

          const statusLabel = game.i18n.localize(
            CONFIG.VAGABOND?.statusConditions?.[cdFlags.linkedStatusId] ?? cdFlags.linkedStatusId
          );
          const { VagabondChatCard } = await import('./helpers/chat-card.mjs');
          const card = new VagabondChatCard();
          card.data.title = journal.name;
          card.data.subtitle = statusLabel;
          card.data.description = `<p><i class="fas fa-hourglass-end"></i> ${game.i18n.format('VAGABOND.Status.CountdownExpired', {
            actor: actor.name,
            status: statusLabel,
          })}</p>`;
          card.data.type = 'countdown-dice';
          card.data.alias = actor.name;
          const statusIcon = CONFIG.VAGABOND?.statusConditionIcons?.[cdFlags.linkedStatusId];
          if (statusIcon) {
            card.data.icon = statusIcon;
            if (statusIcon.endsWith('.svg')) card.data.iconBackground = '#000000';
          }
          await card.send();
        }
      } catch(err) {
        console.warn('Vagabond | Could not remove linked status on countdown expiry:', err);
      }
    }
  }
});

/**
 * Redraw clocks when a journal is created
 */
Hooks.on('createJournalEntry', async (journal, options, userId) => {
  // Handle progress clocks
  if (journal.flags?.vagabond?.progressClock?.type === 'progressClock') {
    if (clockOverlay) {
      await clockOverlay.draw();
    }
  }

  // Handle countdown dice
  if (journal.flags?.vagabond?.countdownDice?.type === 'countdownDice') {
    if (diceOverlay) {
      await diceOverlay.draw();
    }
  }
});


/* -------------------------------------------- */
/* Chat Message Hooks                           */
/* -------------------------------------------- */

// ---------------------------------------------------------
// Bard — Virtuoso: /virtuoso chat command
// ---------------------------------------------------------
Hooks.on('chatMessage', async (_chatLog, message, _chatData) => {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed.startsWith('/virtuoso')) return;

  // Find the player's owned character with Virtuoso
  const actor = canvas.tokens?.controlled?.[0]?.actor
    || game.actors.find(a => a.type === 'character' && a.isOwner && a.system.hasVirtuoso);

  if (!actor) {
    ui.notifications.warn('No character with the Virtuoso feature found.');
    return false;
  }

  if (!actor.system.hasVirtuoso) {
    ui.notifications.warn(`${actor.name} does not have the Virtuoso feature.`);
    return false;
  }

  const { performVirtuoso } = await import('./helpers/bard-helper.mjs');
  await performVirtuoso(actor);
  return false;
});

// ---------------------------------------------------------
// Dancer — Step Up: /stepup chat command
// ---------------------------------------------------------
Hooks.on('chatMessage', async (_chatLog, message, _chatData) => {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed.startsWith('/stepup')) return;

  const actor = canvas.tokens?.controlled?.[0]?.actor
    || game.actors.find(a => a.type === 'character' && a.isOwner && a.system.hasStepUp);

  if (!actor) {
    ui.notifications.warn('No character with the Step Up feature found.');
    return false;
  }

  if (!actor.system.hasStepUp) {
    ui.notifications.warn(`${actor.name} does not have the Step Up feature.`);
    return false;
  }

  const { performStepUp } = await import('./helpers/dancer-helper.mjs');
  await performStepUp(actor);
  return false;
});

// ---------------------------------------------------------
// Bard — Virtuoso: Auto-expire buffs at round change
// Dancer — Step Up: Auto-expire buffs at round change
// ---------------------------------------------------------
Hooks.on('updateCombat', async (combat, changed) => {
  if (!('round' in changed)) return;
  if (!game.user.isGM) return;

  const { expireVirtuosoBuffsByRound } = await import('./helpers/bard-helper.mjs');
  await expireVirtuosoBuffsByRound(combat.round);

  const { expireStepUpBuffsByRound } = await import('./helpers/dancer-helper.mjs');
  await expireStepUpBuffsByRound(combat.round);
});

// ---------------------------------------------------------
// Bard — Virtuoso: Clear buffs when combat ends
// Dancer — Step Up: Clear buffs when combat ends
// ---------------------------------------------------------
Hooks.on('deleteCombat', async (combat) => {
  if (!game.user.isGM) return;

  const { expireVirtuosoBuffs } = await import('./helpers/bard-helper.mjs');
  await expireVirtuosoBuffs();

  const { expireStepUpBuffs } = await import('./helpers/dancer-helper.mjs');
  await expireStepUpBuffs();
});

/* -------------------------------------------- */
/*  Actor Creation Hooks                        */
/* -------------------------------------------- */

// Party and construct actors default to neutral disposition (not hostile)
Hooks.on('preCreateActor', (actor, _data, _options, _userId) => {
  if (actor.type === 'party' || actor.type === 'construct') {
    actor.updateSource({ 'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.NEUTRAL });
  }
});

/* -------------------------------------------- */
/*  Item Creation Hooks                         */
/* -------------------------------------------- */

// Ensure new inventory items get proper gridPosition
Hooks.on('preCreateItem', (item, data, options, userId) => {
  // Only handle inventory items
  const isInventoryItem = ['equipment', 'weapon', 'armor', 'gear', 'container'].includes(item.type);
  if (!isInventoryItem) return;

  // If gridPosition not set, assign next available position
  if (item.system.gridPosition === undefined || item.system.gridPosition === null) {
    const actor = item.parent;
    if (actor) {
      // Find max gridPosition of existing items
      const existingItems = actor.items.filter(i =>
        ['equipment', 'weapon', 'armor', 'gear', 'container'].includes(i.type)
      );

      const maxPosition = existingItems.reduce((max, i) => {
        const pos = i.system.gridPosition ?? 0;
        return Math.max(max, pos);
      }, -1);

      // Assign next position
      item.updateSource({ 'system.gridPosition': maxPosition + 1 });
    }
  }
});

/* -------------------------------------------- */
/*  Chat Message Context Menu - Luck Reroll     */
/* -------------------------------------------- */

/**
 * Luck Reroll (Fluke) context menu entry definition.
 * Shared between hook and prototype override approaches.
 */
const FLUKE_REROLL_ENTRY = {
  name: 'Luck Reroll (Fluke)',
  icon: '<i class="fas fa-clover"></i>',
  classes: '',
  condition: function (li) {
    const messageId = li.dataset.messageId;
    const message = game.messages.get(messageId);
    if (!message?.flags?.vagabond?.rerollData) return false;
    const actor = game.actors.get(message.flags.vagabond.actorId);
    if (!actor || !actor.isOwner) return false;
    // Dynamically update name and classes based on current luck
    const currentLuck = actor.system.currentLuck || 0;
    const maxLuck = actor.system.maxLuck || 0;
    const flukeLabel = game.i18n.localize('VAGABOND.UI.Chat.FlukeReroll');
    const lt = CONFIG.VAGABOND.homebrew?.terms?.luckTerm || 'Luck';
    const pt = CONFIG.VAGABOND.homebrew?.terms?.poolTerm || 'Pool';
    const luckLabel = `${lt} ${pt}`;
    if (currentLuck > 0) {
      this.name = `${flukeLabel} (${luckLabel}: ${currentLuck}/${maxLuck})`;
      this.classes = '';
    } else {
      this.name = `${flukeLabel} (${luckLabel}: 0/${maxLuck})`;
      this.classes = 'vagabond-disabled';
    }
    return true;
  },
  callback: async (li) => {
    const messageId = li.dataset.messageId;
    const message = game.messages.get(messageId);
    const flags = message.flags.vagabond;
    const actor = game.actors.get(flags.actorId);
    const rerollData = flags.rerollData;

    if (!actor || !rerollData) return;

    // Deduct luck
    const currentLuck = actor.system.currentLuck || 0;
    if (currentLuck <= 0) {
      const luckTermWarn = CONFIG.VAGABOND.homebrew?.terms?.luckTerm || 'Luck';
      ui.notifications.warn(`${actor.name} has no ${luckTermWarn} points remaining.`);
      return;
    }
    const luckTerm = CONFIG.VAGABOND.homebrew?.terms?.luckTerm || 'Luck';
    const maxLuck = actor.system.maxLuck || 0;
    const newLuck = currentLuck - 1;
    await actor.update({ 'system.currentLuck': newLuck });

    // Post fluke notification
    const notifCard = new VagabondChatCard()
      .setType('generic')
      .setActor(actor)
      .setTitle('Fluke!')
      .setSubtitle(actor.name)
      .setDescription(`<p><i class="fas fa-clover"></i> <strong>${actor.name}</strong> spends a ${luckTerm} point to reroll.</p>`);
    notifCard.data.metadata = [{ label: `Remaining ${luckTerm}`, value: `${newLuck} / ${maxLuck}` }];
    await notifCard.send();

    // Detect favor/hinder from the stored formula
    const favorHinder = rerollData.formula.includes('[favored]') ? 'favor'
      : rerollData.formula.includes('[hindered]') ? 'hinder' : 'none';

    // Import helpers
    const { VagabondRollBuilder } = await import('./helpers/roll-builder.mjs');

    // Re-evaluate the roll with the same formula
    const roll = await VagabondRollBuilder.evaluateRoll(rerollData.formula, actor, favorHinder);

    // Determine success
    const isSuccess = roll.total >= rerollData.difficulty;

    // Route based on reroll type
    if (rerollData.type === 'attack') {
      // Weapon attack reroll - reconstruct full attack card
      const weapon = actor.items.get(rerollData.itemId);
      if (!weapon) {
        ui.notifications.error('Weapon not found.');
        return;
      }
      const weaponSkillKey = rerollData.weaponSkillKey;
      const weaponSkill = actor.system.skills?.[weaponSkillKey];
      const critType = ['melee', 'ranged', 'brawl', 'finesse'].includes(weaponSkillKey) ? weaponSkillKey : null;
      const critNumber = VagabondRollBuilder.calculateCritThreshold(actor.getRollData(), critType);
      const isCritical = VagabondChatCard.isRollCritical(roll, critNumber);

      const attackResult = {
        roll,
        difficulty: rerollData.difficulty,
        weaponSkill,
        weaponSkillKey,
        isHit: isSuccess,
        isCritical
      };

      // Roll damage if hit
      const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
      let damageRoll = null;
      if (VagabondDamageHelper.shouldRollDamage(isSuccess)) {
        const statKey = weaponSkill?.stat || null;
        damageRoll = await weapon.rollDamage(actor, isCritical, statKey);
      }

      const targetsAtRollTime = flags.targetsAtRollTime || [];
      await VagabondChatCard.weaponAttack(actor, weapon, attackResult, damageRoll, targetsAtRollTime);

    } else if (rerollData.type === 'cast') {
      // Spell cast reroll - show as a skill check with the mana skill
      const key = rerollData.manaSkillKey || 'magic';
      await VagabondChatCard._checkRoll(actor, 'skill', key, roll, rerollData.difficulty, isSuccess);

    } else {
      // Skill or save reroll
      await VagabondChatCard._checkRoll(actor, rerollData.type, rerollData.key, roll, rerollData.difficulty, isSuccess);
    }
  }
};

/* -------------------------------------------- */
/*  Chat Message Context Menu - Force Critical  */
/* -------------------------------------------- */

/**
 * Force Critical context menu entry. GM-only.
 * Replays the existing roll as a guaranteed critical hit, re-rolling damage with the crit bonus.
 */
const FORCE_CRIT_ENTRY = {
  name: 'Force Critical',
  icon: '<i class="fas fa-star"></i>',
  condition: (li) => {
    if (!game.user.isGM) return false;
    const message = game.messages.get(li.dataset.messageId);
    return !!message?.flags?.vagabond?.rerollData;
  },
  callback: async (li) => {
    const message = game.messages.get(li.dataset.messageId);
    const flags = message.flags.vagabond;
    const actor = game.actors.get(flags.actorId);
    const rerollData = flags.rerollData;
    if (!actor || !rerollData) return;

    // Reuse the original rolls exactly — no dice are re-rolled.
    // rolls[0] = d20, rolls[1] = damage (if it was auto-rolled on the original card).
    // Convert to Array first — in Foundry V13, message.rolls may be a Collection/iterable
    // where numeric index access ([0]) returns undefined instead of the first element.
    const rolls = Array.from(message.rolls ?? []);
    const roll = rolls[0] ?? null;
    if (!roll) { ui.notifications.error('No roll found on this card.'); return; }
    const existingDamageRoll = rolls[1] ?? null;

    const targetsAtRollTime = flags.targetsAtRollTime || [];

    if (rerollData.type === 'attack') {
      const weapon = actor.items.get(rerollData.itemId);
      if (!weapon) { ui.notifications.error('Weapon not found.'); return; }

      const weaponSkillKey = rerollData.weaponSkillKey;
      const weaponSkill = actor.system.skills?.[weaponSkillKey];
      const statKey = weaponSkill?.stat || null;

      const attackResult = {
        roll,
        difficulty: rerollData.difficulty,
        weaponSkill,
        weaponSkillKey,
        isHit: true,
        isCritical: true
      };

      // Build the crit damage roll:
      // - If damage was already rolled on the original card, carry those exact dice results
      //   over and append the crit stat bonus (Might, Dex, etc.) as a numeric term.
      //   This preserves the original rolled value (e.g. 2 on 1d4) and adds the stat on top.
      // - If there was no prior damage roll, pass null so weaponAttack handles it normally.
      let critDamageRoll = existingDamageRoll;
      if (existingDamageRoll && statKey) {
        const statValue = actor.system.stats[statKey]?.value || 0;
        if (statValue !== 0) {
          const rollJSON = existingDamageRoll.toJSON();
          const operator = statValue > 0 ? '+' : '-';
          const absValue = Math.abs(statValue);
          rollJSON.terms.push({ class: 'OperatorTerm', options: {}, evaluated: true, operator });
          rollJSON.terms.push({ class: 'NumericTerm', options: {}, evaluated: true, number: absValue });
          rollJSON.formula = `${rollJSON.formula} ${operator} ${absValue}`;
          rollJSON.total = (rollJSON.total ?? 0) + statValue;
          critDamageRoll = Roll.fromData(rollJSON);
        }
      }
      await VagabondChatCard.weaponAttack(actor, weapon, attackResult, critDamageRoll, targetsAtRollTime);

    } else if (rerollData.type === 'cast') {
      const spell = actor.items.get(rerollData.itemId);
      const manaSkillKey = rerollData.manaSkillKey || 'magic';
      const manaSkill = actor.system.skills?.[manaSkillKey] || null;

      const entityLabel = manaSkill?.label || manaSkillKey;
      const tags = [{ label: entityLabel, cssClass: 'tag-skill' }];
      if (manaSkill?.stat) {
        const statLabel = game.i18n.localize(CONFIG.VAGABOND.stats[manaSkill.stat]?.abbr) || manaSkill.stat;
        tags.push({ label: statLabel, cssClass: 'tag-stat' });
      }

      // Include crit effect text from the spell if it has one
      let critText = null;
      if (spell?.system?.crit) {
        critText = spell.system.formatDescription
          ? spell.system.formatDescription(spell.system.crit)
          : spell.system.crit;
      }

      // Carry over the existing damage roll and append the crit stat bonus as a numeric term —
      // same approach as weapons: no dice re-rolled, just the stat value appended on top.
      let critSpellDamageRoll = existingDamageRoll;
      if (existingDamageRoll && manaSkill?.stat) {
        const statValue = actor.system.stats[manaSkill.stat]?.value || 0;
        if (statValue !== 0) {
          const rollJSON = existingDamageRoll.toJSON();
          const operator = statValue > 0 ? '+' : '-';
          const absValue = Math.abs(statValue);
          rollJSON.terms.push({ class: 'OperatorTerm', options: {}, evaluated: true, operator });
          rollJSON.terms.push({ class: 'NumericTerm', options: {}, evaluated: true, number: absValue });
          rollJSON.formula = `${rollJSON.formula} ${operator} ${absValue}`;
          rollJSON.total = (rollJSON.total ?? 0) + statValue;
          critSpellDamageRoll = Roll.fromData(rollJSON);
        }
      }

      await VagabondChatCard.createActionCard({
        actor,
        item: spell || null,
        title: spell?.name || `${entityLabel} Check`,
        // isHit: true — always HIT for a forced crit, even if original roll missed
        rollData: { roll, difficulty: rerollData.difficulty, isSuccess: true, isCritical: true, isHit: true, manaSkill },
        tags,
        damageRoll: critSpellDamageRoll,
        damageType: spell?.system?.damageType,
        crit: critText,
        hasDefenses: true,
        attackType: 'cast',
        targetsAtRollTime
      });

    } else {
      // Skill or save — carry roll over, force crit marker only (no damage involved)
      const type = rerollData.type;
      const key = rerollData.key;
      const isSuccess = roll.total >= rerollData.difficulty;

      let entity, entityLabel, title, tags;
      switch (type) {
        case 'skill':
          entity = actor.system.skills?.[key];
          entityLabel = entity?.label || key;
          title = `${entityLabel} Check`;
          tags = [{ label: entityLabel, cssClass: 'tag-skill' }];
          if (entity?.stat) {
            const statLabel = game.i18n.localize(CONFIG.VAGABOND.stats[entity.stat]?.abbr) || entity.stat;
            tags.push({ label: statLabel, cssClass: 'tag-stat' });
          }
          if (entity) tags.push({ label: entity.trained ? 'Trained' : 'Untrained', cssClass: 'tag-info' });
          break;
        case 'save':
          entity = actor.system.saves?.[key];
          entityLabel = entity?.label || key;
          title = `${entityLabel} Save`;
          tags = [{ label: entityLabel, cssClass: 'tag-skill' }];
          break;
        default:
          entity = actor.system.stats[key];
          entityLabel = game.i18n.localize(CONFIG.VAGABOND.stats[key]?.long) || key;
          title = `${entityLabel} Check`;
          tags = [
            { label: entityLabel, cssClass: 'tag-skill' },
            { label: `${entity?.value || 0}`, icon: 'fas fa-hashtag' }
          ];
      }

      await VagabondChatCard.createActionCard({
        actor,
        title,
        rollData: { roll, difficulty: rerollData.difficulty, isSuccess, isCritical: true },
        tags
      });
    }
  }
};

/* -------------------------------------------- */
/*  Vehicle Crew — Auto Permission Sync          */
/* -------------------------------------------- */

/**
 * Recalculate which non-GM users should have Owner permission on a party actor
 * based on who is currently assigned as crew across all vehicle parts.
 * Grants Owner to players whose character is crew, revokes from those who are not.
 * Only runs on the GM client.
 */
async function syncVehicleCrewPermissions(partyActor) {
  if (!game.user.isGM) return;

  // Collect all crew actor UUIDs across every vehiclePart owned by this actor
  const allCrewUuids = new Set();
  for (const part of partyActor.items.filter(i => i.type === 'vehiclePart')) {
    for (const { uuid } of (part.system.crew ?? [])) {
      allCrewUuids.add(uuid);
    }
  }

  // Resolve each UUID → find the non-GM user whose character matches
  const crewUserIds = new Set();
  for (const uuid of allCrewUuids) {
    try {
      const actor = await fromUuid(uuid);
      if (!actor) continue;
      const user = game.users.find(u => !u.isGM && u.character?.id === actor.id);
      if (user) crewUserIds.add(user.id);
    } catch { /* UUID no longer valid — skip */ }
  }

  const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const noneLevel  = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  const current    = partyActor.ownership ?? {};
  const updates    = {};

  // Grant Owner to current crew users who don't already have it
  for (const userId of crewUserIds) {
    if (current[userId] !== ownerLevel) updates[userId] = ownerLevel;
  }

  // Revoke Owner from non-GM users no longer in the crew
  for (const [userId, level] of Object.entries(current)) {
    if (userId === 'default') continue;
    const user = game.users.get(userId);
    if (!user || user.isGM) continue;
    if (level === ownerLevel && !crewUserIds.has(userId)) updates[userId] = noneLevel;
  }

  if (Object.keys(updates).length > 0) await partyActor.updateOwnership(updates);
}

function _getPartyParent(item) {
  const parent = item.parent;
  return parent?.type === 'party' ? parent : null;
}

Hooks.on('createItem', (item) => {
  if (item.type !== 'vehiclePart') return;
  const party = _getPartyParent(item);
  if (party) syncVehicleCrewPermissions(party);
});

Hooks.on('updateItem', (item) => {
  if (item.type !== 'vehiclePart') return;
  const party = _getPartyParent(item);
  if (party) syncVehicleCrewPermissions(party);
});

Hooks.on('deleteItem', (item) => {
  if (item.type !== 'vehiclePart') return;
  const party = _getPartyParent(item);
  if (party) syncVehicleCrewPermissions(party);
});

// Hook: fires when ChatLog._createContextMenu dispatches "getChatMessageContextOptions" during _onFirstRender.
// Registered at module top level to guarantee it exists before ChatLog renders.
Hooks.on('getChatMessageContextOptions', (app, options) => {
  options.push(FLUKE_REROLL_ENTRY);
  options.push(FORCE_CRIT_ENTRY);
});

/**
 * V13 Standard: 'renderChatMessageHTML' hook.
 * The 'html' argument is a standard HTMLElement.
 */
Hooks.on('renderChatMessageHTML', (message, html) => {
  // Safety check: ensure html is a valid element
  if (!html || typeof html.querySelectorAll !== 'function') {
    return;
  }

  // ---------------------------------------------------------
  // 1. Accordion Toggle Handler (Properties)
  // ---------------------------------------------------------
  // 1. Accordion Toggle Handler (Properties)
  // Handles triggers whether they are inside or outside the container
  const propertyToggles = html.querySelectorAll('[data-action="toggleProperties"]');

  propertyToggles.forEach(toggle => {
    toggle.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const trigger = ev.currentTarget;
      let container = null;

      // Strategy A: Is the trigger directly inside the box? (Old style)
      if (trigger.closest('.metadata-item-expandable')) {
          container = trigger.closest('.metadata-item-expandable');
      } 
      // Strategy B: Trigger is in Header -> Find the box inside the main card
      else {
          const card = trigger.closest('.vagabond-chat-card-v2');
          if (card) {
              container = card.querySelector('.metadata-item-expandable');
          }
      }

      if (container) {
        container.classList.toggle('expanded');
      }
    });
  });

  // ---------------------------------------------------------
  // 2. Accordion Toggle Handler (Defend Info) - FIXED
  // Replaced jQuery .find() with native .querySelectorAll()
  // ---------------------------------------------------------
  const defendToggles = html.querySelectorAll('.defend-header');

  defendToggles.forEach(toggle => {
    toggle.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const header = ev.currentTarget;
      const box = header.closest('.defend-info-box');

      if (box) {
        box.classList.toggle('expanded');
      }
    });
  });

  // ---------------------------------------------------------
  // 3. Damage Roll Button Handler
  // ---------------------------------------------------------
  const damageButtons = html.querySelectorAll('.vagabond-damage-button');

  damageButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      // Disable immediately to prevent double-clicks
      button.disabled = true;

      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.rollDamageFromButton(button, message.id);
      });
    });
  });

  // ---------------------------------------------------------
  // 4. Save Button Handler (Roll to Save)
  // ---------------------------------------------------------
  const saveButtons = html.querySelectorAll('.vagabond-save-button');

  saveButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleSaveRoll(button, ev);
      });
    });
  });

  // ---------------------------------------------------------
  // 4b. Save Reminder Button Handler (Roll Save Without Damage)
  // ---------------------------------------------------------
  const saveReminderButtons = html.querySelectorAll('.vagabond-save-reminder-button');

  saveReminderButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleSaveReminderRoll(button, ev);
      });
    });
  });

  // ---------------------------------------------------------
  // 5. Apply Direct Damage Button Handler
  // ---------------------------------------------------------
  const applyDirectButtons = html.querySelectorAll('.vagabond-apply-direct-button');

  applyDirectButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleApplyDirect(button);
      });
    });
  });

  // ---------------------------------------------------------
  // 6. Apply Restorative Effects Button Handlers
  // ---------------------------------------------------------
  const healingButtons = html.querySelectorAll('.vagabond-apply-healing-button');
  const recoverButtons = html.querySelectorAll('.vagabond-apply-recover-button');
  const rechargeButtons = html.querySelectorAll('.vagabond-apply-recharge-button');

  healingButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleApplyRestorative(button);
      });
    });
  });

  recoverButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleApplyRestorative(button);
      });
    });
  });

  rechargeButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleApplyRestorative(button);
      });
    });
  });

  // ---------------------------------------------------------
  // 7. Countdown Dice Trigger Handler (Chat Card Descriptions)
  // ---------------------------------------------------------
  const countdownTriggers = html.querySelectorAll('.countdown-dice-trigger');

  countdownTriggers.forEach(trigger => {
    trigger.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      // Extract dice type from data attribute
      let diceType = trigger.dataset.diceType || trigger.dataset.diceSize;

      // If we got just a number (from data-dice-size), add the "d" prefix
      if (diceType && !diceType.startsWith('d')) {
        diceType = 'd' + diceType;
      }

      if (!diceType) return;

      // Validate dice type
      const validDiceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      if (!validDiceTypes.includes(diceType)) {
        console.warn(`Invalid dice type for countdown: ${diceType}`);
        return;
      }

      // Get spell/item name from message flags or use a default
      const itemId = message.flags?.vagabond?.itemId;
      let name = 'Countdown';

      if (itemId) {
        const actorId = message.flags?.vagabond?.actorId;
        const actor = game.actors.get(actorId);
        if (actor) {
          const item = actor.items.get(itemId);
          if (item) {
            name = item.name;
          }
        }
      }

      // Create countdown dice
      const { CountdownDice } = globalThis.vagabond.documents;
      await CountdownDice.create({
        name: name,
        diceType: diceType,
        size: 'S', // Small size
      });
    });
  });

  // ---------------------------------------------------------
  // 8. Tick Damage Apply Button (Countdown Dice, manual-apply mode)
  // ---------------------------------------------------------
  const tickDamageButtons = html.querySelectorAll('.vagabond-tick-damage-button');

  tickDamageButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;
      try {
        const actorUuid = button.dataset.actorUuid;
        const amount = parseInt(button.dataset.damageAmount);
        if (!actorUuid || isNaN(amount) || amount <= 0) return;
        const actor = await fromUuid(actorUuid);
        if (!actor) { ui.notifications.warn('Target actor not found.'); return; }
        const currentHP = actor.system.health?.value ?? 0;
        const newHP = Math.max(0, currentHP - amount);
        await actor.update({ 'system.health.value': newHP });
        ui.notifications.info(`Applied ${amount} damage to ${actor.name}.`);
        const { VagabondChatCard } = await import('./helpers/chat-card.mjs');
        await VagabondChatCard.applyResult(actor, {
          type: 'damage',
          rawAmount: amount,
          finalAmount: amount,
          previousValue: currentHP,
          newValue: newHP,
        });
      } catch (err) {
        console.error('Vagabond | Tick damage apply failed:', err);
        button.disabled = false;
      }
    });
  });

  // ---------------------------------------------------------
  // 8. [REMOVED] Favor/Hinder Dice Styling
  // This logic is now handled server-side in chat-card.mjs
  // (formatRollWithDice) and styled via CSS classes.
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // 9. NPC Damage Button Handler (GM Only)
  // ---------------------------------------------------------
  const npcButtons = html.querySelectorAll('.vagabond-npc-damage-button');

  npcButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleNPCDamageButton(button, message.id);
      });
    });
  });

  // ---------------------------------------------------------
  // 9.5 Item Damage Button Handler (for healing potions, bombs, etc)
  // ---------------------------------------------------------
  const itemButtons = html.querySelectorAll('.vagabond-item-damage-button');

  itemButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleItemDamageButton(button, message.id);
      });
    });
  });

  // ---------------------------------------------------------
  // 10. Apply Save Damage Button Handler
  // ---------------------------------------------------------
  const applySaveButtons = html.querySelectorAll('.vagabond-apply-save-damage-button');

  applySaveButtons.forEach(button => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      import('./helpers/damage-helper.mjs').then(({ VagabondDamageHelper }) => {
        VagabondDamageHelper.handleApplySaveDamage(button);
      });
    });
  });

  // ---------------------------------------------------------
  // 10. Template Trigger Handler
  // ---------------------------------------------------------
  const templateTriggers = html.querySelectorAll('.template-trigger');

  templateTriggers.forEach(trigger => {
    trigger.addEventListener('click', async (ev) => {
      ev.preventDefault();

      const deliveryType = trigger.dataset.deliveryType;
      const deliveryText = trigger.dataset.deliveryText;

      if (!deliveryType) return;

      // Call the template manager to create the template from chat
      if (globalThis.vagabond?.managers?.templates) {
        await globalThis.vagabond.managers.templates.fromChat(deliveryType, deliveryText, message);
      } else {
        console.warn("VagabondSystem | Template manager not found.");
      }
    });
  });

  // ---------------------------------------------------------
  // 11. Target Token Click Handler (Ping & Pan)
  // ---------------------------------------------------------
  const targetTokens = html.querySelectorAll('.target-token');

  targetTokens.forEach(targetElement => {
    targetElement.addEventListener('click', async (ev) => {
      ev.preventDefault();

      const tokenId = targetElement.dataset.tokenId;
      const sceneId = targetElement.dataset.sceneId;

      if (!tokenId || !sceneId) return;

      // Check if target is on a different scene
      if (sceneId !== canvas.scene?.id) {
        ui.notifications.warn('Target is on a different scene. Switching scenes...');
        const scene = game.scenes.get(sceneId);
        if (scene) {
          await scene.view();
          // Wait a moment for scene to load
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          ui.notifications.error('Target scene not found.');
          return;
        }
      }

      // Get the token on the current scene
      const token = canvas.tokens.get(tokenId);
      if (!token) {
        ui.notifications.warn('Target token not found on scene.');
        return;
      }

      // Pan to token
      await canvas.animatePan({
        x: token.center.x,
        y: token.center.y,
        duration: 250
      });

      // Ping the token location
      canvas.ping(token.center, {
        style: canvas.grid.type === 0 ? 'pulse' : 'alert',
        color: game.user.color
      });
    });
  });

  // ---------------------------------------------------------
  // 12. Brawl — Push 5' Button Handler
  // ---------------------------------------------------------
  const pushButtons = html.querySelectorAll('.vagabond-brawl-push-button');

  pushButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const targetIds = button.dataset.targetIds?.split(',').filter(Boolean) || [];
      const attackerTokenId = button.dataset.attackerTokenId;
      const attackerToken = canvas.tokens.get(attackerTokenId);
      const appliedNames = [];

      for (const tokenId of targetIds) {
        const token = canvas.tokens.get(tokenId);
        if (!token || !attackerToken) continue;

        // Push 5' away from attacker (1 grid square)
        const dx = token.document.x - attackerToken.document.x;
        const dy = token.document.y - attackerToken.document.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const gridSize = canvas.grid.size;
        const nx = Math.round(dx / dist);
        const ny = Math.round(dy / dist);
        await token.document.update({
          x: token.document.x + nx * gridSize,
          y: token.document.y + ny * gridSize
        });
        appliedNames.push(token.name);
      }

      if (appliedNames.length > 0) {
        ChatMessage.create({
          content: `<p><strong>Shove!</strong> ${appliedNames.join(', ')} pushed 5'.</p>`,
          speaker: ChatMessage.getSpeaker({ actor: game.actors.get(button.dataset.actorId) })
        });
      }
    });
  });

  // ---------------------------------------------------------
  // 13. Brawl — Prone Button Handler
  // ---------------------------------------------------------
  const proneButtons = html.querySelectorAll('.vagabond-brawl-prone-button');

  proneButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const targetIds = button.dataset.targetIds?.split(',').filter(Boolean) || [];
      const appliedNames = [];
      const immuneNames = [];

      for (const tokenId of targetIds) {
        const token = canvas.tokens.get(tokenId);
        if (token?.actor) {
          const immunities = token.actor.system.statusImmunities ?? [];
          if (immunities.includes('prone')) {
            immuneNames.push(token.name);
          } else {
            await token.actor.toggleStatusEffect('prone', { active: true });
            appliedNames.push(token.name);
          }
        }
      }

      let proneMsg = '';
      if (appliedNames.length > 0) {
        proneMsg += `<strong>Shove!</strong> ${appliedNames.join(', ')} knocked <em>Prone</em>.`;
      }
      if (immuneNames.length > 0) {
        if (proneMsg) proneMsg += '<br>';
        proneMsg += `<i class="fas fa-shield-halved"></i> ${immuneNames.join(', ')} ${immuneNames.length === 1 ? 'is' : 'are'} <strong>immune</strong> to Prone!`;
      }
      if (proneMsg) {
        ChatMessage.create({
          content: `<p>${proneMsg}</p>`,
          speaker: ChatMessage.getSpeaker({ actor: game.actors.get(button.dataset.actorId) })
        });
      }
    });
  });

  // ---------------------------------------------------------
  // 14. Fisticuffs — Post-Hit Grapple Button Handler
  // ---------------------------------------------------------
  const grappleButtons = html.querySelectorAll('.vagabond-brawl-grapple-button');

  grappleButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const targetIds = button.dataset.targetIds?.split(',').filter(Boolean) || [];
      const actorId = button.dataset.actorId;
      const actor = game.actors.get(actorId);
      const appliedNames = [];
      const immuneNames = [];
      const hasBully = actor?.system.hasBully || false;

      // Get Restrained status effect definition for manual AE creation (grappler tracking)
      const restrainedDef = CONFIG.statusEffects.find(e => e.id === 'restrained');

      for (const tokenId of targetIds) {
        const token = canvas.tokens.get(tokenId);
        if (token?.actor) {
          const immunities = token.actor.system.statusImmunities ?? [];
          if (immunities.includes('restrained')) {
            immuneNames.push(token.name);
          } else {
            // Create Restrained AE manually with grappler tracking
            await token.actor.createEmbeddedDocuments('ActiveEffect', [{
              name: game.i18n.localize(restrainedDef.name),
              img: restrainedDef.img,
              disabled: false,
              statuses: ['restrained'],
              changes: restrainedDef.changes || [],
              description: restrainedDef.description || '',
              duration: { rounds: 99, startRound: game.combat?.round ?? 0 },
              flags: {
                vagabond: {
                  grappledBy: actorId
                }
              }
            }]);
            appliedNames.push(token.name);

            // Bully perk: auto-create "Grappled Creature" weapon on the grappler
            if (hasBully && actor) {
              const existingWeapon = actor.items.find(i =>
                i.flags?.vagabond?.bullyWeapon && i.flags?.vagabond?.grappledActorId === token.actor.id
              );
              if (existingWeapon) await existingWeapon.delete();

              await actor.createEmbeddedDocuments('Item', [{
                name: `${token.name} (Grappled)`,
                type: 'equipment',
                img: token.actor.img || 'icons/skills/melee/unarmed-punch-fist.webp',
                system: {
                  equipmentType: 'weapon',
                  weaponSkill: 'brawl',
                  range: 'close',
                  grip: '2H',
                  damageOneHand: 'd8',
                  damageTwoHands: 'd8',
                  damageTypeOneHand: 'physical',
                  damageTypeTwoHands: 'physical',
                  equipmentState: 'twoHands',
                  equipped: true,
                  properties: ['Brawl'],
                  quantity: 1,
                  baseSlots: 0
                },
                flags: {
                  vagabond: {
                    bullyWeapon: true,
                    grappledActorId: token.actor.id
                  }
                }
              }]);
            }
          }
        }
      }

      let grappleMsg = '';
      if (appliedNames.length > 0) {
        grappleMsg += `<strong>Grapple!</strong> ${appliedNames.join(', ')} ${appliedNames.length === 1 ? 'is' : 'are'} now <em>Restrained</em>.`;
        if (hasBully) {
          grappleMsg += `<br><i class="fas fa-hand-back-fist"></i> ${appliedNames.join(', ')} can be used as a <strong>Greatclub</strong>!`;
        }
      }
      if (immuneNames.length > 0) {
        if (grappleMsg) grappleMsg += '<br>';
        grappleMsg += `<i class="fas fa-shield-halved"></i> ${immuneNames.join(', ')} ${immuneNames.length === 1 ? 'is' : 'are'} <strong>immune</strong> to Restrained!`;
      }
      if (grappleMsg) {
        ChatMessage.create({
          content: `<p>${grappleMsg}</p>`,
          speaker: ChatMessage.getSpeaker({ actor })
        });
      }
    });
  });

  // ---------------------------------------------------------
  // 15. Fisticuffs — Post-Hit Shove Button Handler
  // ---------------------------------------------------------
  const shoveButtons = html.querySelectorAll('.vagabond-brawl-shove-button');

  shoveButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      // Show sub-choice: Push 5' or Prone
      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Shove Effect' },
        content: '<p>Choose the shove effect:</p>',
        buttons: [
          { action: 'push', label: "Push 5'", icon: 'fas fa-arrow-right' },
          { action: 'prone', label: 'Prone', icon: 'fas fa-person-falling' }
        ]
      });

      if (!choice) {
        button.disabled = false;
        return;
      }

      const targetIds = button.dataset.targetIds?.split(',').filter(Boolean) || [];
      const attackerTokenId = button.dataset.attackerTokenId;
      const attackerToken = canvas.tokens.get(attackerTokenId);
      const appliedNames = [];
      const immuneNames = [];

      for (const tokenId of targetIds) {
        const token = canvas.tokens.get(tokenId);
        if (!token) continue;

        if (choice === 'push' && attackerToken) {
          const dx = token.document.x - attackerToken.document.x;
          const dy = token.document.y - attackerToken.document.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const gridSize = canvas.grid.size;
          const nx = Math.round(dx / dist);
          const ny = Math.round(dy / dist);
          await token.document.update({
            x: token.document.x + nx * gridSize,
            y: token.document.y + ny * gridSize
          });
          appliedNames.push(token.name);
        } else if (choice === 'prone' && token.actor) {
          const immunities = token.actor.system.statusImmunities ?? [];
          if (immunities.includes('prone')) {
            immuneNames.push(token.name);
          } else {
            await token.actor.toggleStatusEffect('prone', { active: true });
            appliedNames.push(token.name);
          }
        }
      }

      let shoveMsg = '';
      if (appliedNames.length > 0) {
        const effectLabel = choice === 'push' ? "pushed 5'" : 'knocked <em>Prone</em>';
        shoveMsg += `<strong>Shove!</strong> ${appliedNames.join(', ')} ${effectLabel}.`;
      }
      if (immuneNames.length > 0) {
        if (shoveMsg) shoveMsg += '<br>';
        shoveMsg += `<i class="fas fa-shield-halved"></i> ${immuneNames.join(', ')} ${immuneNames.length === 1 ? 'is' : 'are'} <strong>immune</strong> to Prone!`;
      }
      if (shoveMsg) {
        ChatMessage.create({
          content: `<p>${shoveMsg}</p>`,
          speaker: ChatMessage.getSpeaker({ actor: game.actors.get(button.dataset.actorId) })
        });
      }
    });
  });

  // ---------------------------------------------------------
  // 16. Imbue — Spell Damage Roll Button Handler
  // ---------------------------------------------------------
  const imbueDamageButtons = html.querySelectorAll('.vagabond-imbue-damage-button');

  imbueDamageButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const formula = button.dataset.formula;
      const damageType = button.dataset.damageType;
      const casterId = button.dataset.casterId;
      const isCritical = button.dataset.isCritical === 'true';
      const canExplode = button.dataset.canExplode === 'true';
      const explodeValues = button.dataset.explodeValues;
      const attackType = button.dataset.attackType || 'melee';

      let targetsAtRollTime = [];
      try { targetsAtRollTime = JSON.parse(button.dataset.targets || '[]'); } catch (e) { /* ignore */ }

      const caster = game.actors.get(casterId);
      if (!caster) { button.disabled = false; return; }

      // Roll the spell damage
      const roll = new Roll(formula, caster.getRollData());
      await roll.evaluate();

      // Manual explosion if enabled
      if (canExplode && explodeValues) {
        const vals = explodeValues.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n));
        if (vals.length > 0) {
          const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
          await VagabondDamageHelper._manuallyExplodeDice(roll, vals);
        }
      }

      // Create damage chat card with save buttons
      const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
      const { VagabondChatCard } = await import('./helpers/chat-card.mjs');

      const dLabel = game.i18n.localize(CONFIG.VAGABOND.damageTypes?.[damageType] || damageType);
      const btns = VagabondDamageHelper.createSaveButtons(roll.total, damageType, roll, casterId, null, attackType, targetsAtRollTime);

      const card = new VagabondChatCard()
        .setType('generic')
        .setActor(caster)
        .setTitle('Imbue — Spell Damage')
        .setSubtitle(caster.name);
      card.addDamage(roll, dLabel, isCritical, damageType);
      card.addFooterAction(btns);

      if (targetsAtRollTime.length > 0) card.setTargets(targetsAtRollTime);
      await card.send();
    });
  });

  // ---------------------------------------------------------
  // 17. Imbue — Spell Status Effect Button Handler
  // ---------------------------------------------------------
  const imbueStatusButtons = html.querySelectorAll('.vagabond-imbue-status-button');

  imbueStatusButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const statusCondition = button.dataset.status;
      const casterId = button.dataset.casterId;
      const spellId = button.dataset.spellId;
      const spellName = button.dataset.spellName;
      const casterName = button.dataset.casterName;
      const isContinual = button.dataset.continual === 'true';
      const countdownDie = button.dataset.countdownDie || '';
      const countdownDamageType = button.dataset.countdownDamageType || '';
      const targetIds = button.dataset.targetIds?.split(',').filter(Boolean) || [];

      const caster = game.actors.get(casterId);
      const appliedNames = [];

      for (const tokenId of targetIds) {
        const token = canvas.tokens.get(tokenId);
        const targetActor = token?.actor;
        if (!targetActor) continue;

        // Skip dead
        if (targetActor.statuses?.has('dead')) continue;

        // Check immunity
        const immunities = targetActor.system.immunities || [];
        const statusImmunities = targetActor.system.statusImmunities ?? [];
        if (immunities.includes(statusCondition) || statusImmunities.includes(statusCondition)) {
          ui.notifications.info(`${targetActor.name} is immune to ${statusCondition}.`);
          continue;
        }

        // Burning with countdown die — use the burning/countdown system
        if (statusCondition === 'burning' && countdownDie) {
          const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
          await VagabondDamageHelper.checkOnHitBurning(
            targetActor,
            caster,
            countdownDamageType || 'fire',
            countdownDie,
            null // no sourceItem — spell-driven
          );
          appliedNames.push(targetActor.name);
          continue;
        }

        // Non-burning status: use checkOnHitBurning for statuses with countdown dice too
        if (statusCondition !== 'burning' && countdownDie) {
          // Status with countdown die (e.g., Sickened with Cd4)
          const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
          // Build a fake sourceItem with the right flags for _applyStatusDie
          const fakeItem = {
            system: { properties: ['Status'] },
            flags: {
              vagabond: {
                onHitBurning: {
                  dieType: countdownDie,
                  statusCondition: statusCondition
                }
              }
            }
          };
          await VagabondDamageHelper.checkOnHitBurning(
            targetActor,
            caster,
            null,
            null,
            fakeItem
          );
          appliedNames.push(targetActor.name);
          continue;
        }

        // Simple status toggle (no countdown die)
        if (!targetActor.statuses?.has(statusCondition)) {
          await targetActor.toggleStatusEffect(statusCondition);

          // Track for Focus/round-start cleanup
          const existing = targetActor.getFlag('vagabond', 'spellStatuses') || [];
          const entry = {
            statusCondition,
            spellId,
            spellName,
            casterId,
            casterName,
            continual: isContinual,
            roundApplied: game.combat?.round ?? 0
          };
          await targetActor.setFlag('vagabond', 'spellStatuses', [...existing, entry]);
          appliedNames.push(targetActor.name);
        }
      }

      if (appliedNames.length > 0) {
        const condLabel = game.i18n.localize(CONFIG.VAGABOND.onHitStatusConditions?.[statusCondition] || statusCondition);
        const continualText = isContinual ? ' <em>(Continual)</em>' : '';
        const dieText = countdownDie ? ` (${countdownDie})` : '';
        ChatMessage.create({
          content: `<p><i class="fas fa-bolt"></i> <strong>${appliedNames.join(', ')}</strong> ${appliedNames.length === 1 ? 'is' : 'are'} now <strong>${condLabel}</strong>${dieText} from Imbue!${continualText}</p>`,
          speaker: { alias: casterName }
        });
      }
    });
  });
  // ---------------------------------------------------------
  // 18. Focus Maintenance — Cast Check for Hostile Targets
  // ---------------------------------------------------------
  const focusMaintainButtons = html.querySelectorAll('.vagabond-focus-maintain-button');

  focusMaintainButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const casterId = button.dataset.casterId;
      const manaSkill = button.dataset.manaSkill;
      const difficulty = parseInt(button.dataset.difficulty) || 10;
      let prompts = [];
      try { prompts = JSON.parse(button.dataset.prompts || '[]'); } catch (e) { /* ignore */ }

      const caster = game.actors.get(casterId);
      if (!caster) return;

      // Check mana
      const currentMana = caster.system.mana?.current ?? 0;
      if (currentMana < 1) {
        ui.notifications.warn(`${caster.name} doesn't have enough mana to maintain Focus!`);
        // Drop all statuses
        await VagabondCombat._dropFocusStatuses(caster, prompts);
        return;
      }

      // Roll Cast Check: d20 vs difficulty
      const roll = new Roll('1d20');
      await roll.evaluate();
      const isSuccess = roll.total >= difficulty;

      const { VagabondChatCard } = await import('./helpers/chat-card.mjs');

      if (isSuccess) {
        // Deduct 1 mana
        const newMana = caster.system.mana.current - 1;
        await caster.update({ 'system.mana.current': newMana });

        const targetNames = prompts.map(p => p.targetName).join(', ');
        const condLabels = prompts.map(p => {
          return game.i18n.localize(CONFIG.VAGABOND.onHitStatusConditions?.[p.statusCondition] || p.statusCondition);
        }).join(', ');

        // Build the result card with optional extra damage
        const card = new VagabondChatCard()
          .setType('generic')
          .setActor(caster)
          .setTitle('Focus Maintained')
          .setSubtitle(caster.name);
        card.addRoll(roll, difficulty).setOutcome('PASS', false);
        card.setDescription(`
          <p><i class="fas fa-magic"></i> Focus maintained on <strong>${targetNames}</strong> (${condLabels})</p>
          <p>1 mana spent (${newMana} remaining)</p>
        `);

        // Add optional extra damage button if caster has mana left
        if (newMana > 0) {
          const targetData = JSON.stringify(prompts.map(p => ({
            tokenId: p.targetTokenId,
            sceneId: p.sceneId,
            actorId: p.targetActorId,
            actorName: p.targetName
          }))).replace(/"/g, '&quot;');

          card.addFooterAction(`
            <div class="save-buttons-row">
              <button class="vagabond-focus-damage-button vagabond-save-button"
                data-vagabond-button="true"
                data-caster-id="${casterId}"
                data-mana-remaining="${newMana}"
                data-targets="${targetData}">
                <i class="fas fa-dice"></i> Spend Mana for Damage (1d6 per mana)
              </button>
            </div>
          `);
        }

        await card.send();
      } else {
        // Failed — remove all spell statuses from these targets
        await VagabondCombat._dropFocusStatuses(caster, prompts);

        const card = new VagabondChatCard()
          .setType('generic')
          .setActor(caster)
          .setTitle('Focus Lost')
          .setSubtitle(caster.name);
        card.addRoll(roll, difficulty).setOutcome('FAIL', false);

        const droppedLines = prompts.map(p => {
          const condLabel = game.i18n.localize(CONFIG.VAGABOND.onHitStatusConditions?.[p.statusCondition] || p.statusCondition);
          return `<strong>${p.targetName}</strong> is no longer <strong>${condLabel}</strong>`;
        });
        card.setDescription(droppedLines.join('<br>'));
        await card.send();
      }
    });
  });

  // ---------------------------------------------------------
  // 19. Focus Drop — Voluntarily Drop Focus on Hostile Targets
  // ---------------------------------------------------------
  const focusDropButtons = html.querySelectorAll('.vagabond-focus-drop-button');

  focusDropButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const casterId = button.dataset.casterId;
      let prompts = [];
      try { prompts = JSON.parse(button.dataset.prompts || '[]'); } catch (e) { /* ignore */ }

      const caster = game.actors.get(casterId);
      if (!caster) return;

      await VagabondCombat._dropFocusStatuses(caster, prompts);

      const droppedNames = prompts.map(p => p.targetName).join(', ');
      ChatMessage.create({
        content: `<p><i class="fas fa-times"></i> <strong>${caster.name}</strong> dropped Focus. Effects removed from <strong>${droppedNames}</strong>.</p>`,
        speaker: ChatMessage.getSpeaker({ actor: caster })
      });
    });
  });

  // ---------------------------------------------------------
  // 20. Focus Damage — Spend Extra Mana for Damage on Maintained Focus
  // ---------------------------------------------------------
  const focusDamageButtons = html.querySelectorAll('.vagabond-focus-damage-button');

  focusDamageButtons.forEach(button => {
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();
      button.disabled = true;

      const casterId = button.dataset.casterId;
      const manaRemaining = parseInt(button.dataset.manaRemaining) || 0;
      let targets = [];
      try { targets = JSON.parse(button.dataset.targets || '[]'); } catch (e) { /* ignore */ }

      const caster = game.actors.get(casterId);
      if (!caster || manaRemaining < 1) return;

      // Ask how many mana to spend (1d6 per mana)
      const maxMana = Math.min(manaRemaining, caster.system.mana?.castingMax ?? 99);
      const buttons = [];
      for (let i = 1; i <= Math.min(maxMana, 6); i++) {
        buttons.push({ action: String(i), label: `${i} mana (${i}d6)`, icon: 'fas fa-dice' });
      }
      buttons.push({ action: '0', label: 'Cancel', icon: 'fas fa-times' });

      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Focus Damage — Spend Mana' },
        content: `<p>Spend mana to deal damage (1d6 per mana). You have ${manaRemaining} mana remaining.</p>`,
        buttons
      });

      if (!choice || choice === '0') {
        button.disabled = false;
        return;
      }

      const manaSpent = parseInt(choice);
      if (isNaN(manaSpent) || manaSpent < 1) { button.disabled = false; return; }

      // Deduct mana
      const newMana = Math.max(0, caster.system.mana.current - manaSpent);
      await caster.update({ 'system.mana.current': newMana });

      // Roll damage
      const formula = `${manaSpent}d6`;
      const roll = new Roll(formula);
      await roll.evaluate();

      // Post damage card with save buttons
      const { VagabondDamageHelper } = await import('./helpers/damage-helper.mjs');
      const { VagabondChatCard } = await import('./helpers/chat-card.mjs');

      // Use the spell's damage type from the caster's focused spell
      const focusedSpellIds = caster.system.focus?.spellIds || [];
      let damageType = 'fire'; // fallback
      for (const spellId of focusedSpellIds) {
        const spell = caster.items.get(spellId);
        if (spell?.system?.damageType && spell.system.damageType !== '-') {
          damageType = spell.system.damageType;
          break;
        }
      }

      const dLabel = game.i18n.localize(CONFIG.VAGABOND.damageTypes?.[damageType] || damageType);
      const btns = VagabondDamageHelper.createSaveButtons(roll.total, damageType, roll, casterId, null, 'melee', targets);

      const card = new VagabondChatCard()
        .setType('generic')
        .setActor(caster)
        .setTitle('Focus Damage')
        .setSubtitle(caster.name);
      card.addDamage(roll, dLabel, false, damageType);
      card.addFooterAction(btns);
      if (targets.length > 0) card.setTargets(targets);
      await card.send();
    });
  });

  // ---------------------------------------------------------
  // 21. Dice Hover Tooltips — show dice formula + individual results
  // ---------------------------------------------------------

  // Damage dice tooltips: "2d6 → [4, 2]"
  const diceLists = html.querySelectorAll('.damage-dice-list');
  for (const list of diceLists) {
    const wrappers = list.querySelectorAll('.vb-die-wrapper');
    if (!wrappers.length) continue;
    const diceByFaces = new Map();
    for (const w of wrappers) {
      const faces = w.dataset.faces;
      if (!faces) continue;
      const val = w.querySelector('.vb-die-val')?.textContent?.trim();
      if (!val) continue;
      if (!diceByFaces.has(faces)) diceByFaces.set(faces, []);
      diceByFaces.get(faces).push(val);
    }
    const parts = [];
    for (const [faces, results] of diceByFaces) {
      parts.push(`${results.length}d${faces} \u2192 [${results.join(', ')}]`);
    }
    const tooltip = parts.join('  +  ');
    for (const w of wrappers) {
      w.title = tooltip;
      w.style.cursor = 'help';
    }
  }

  // Roll dice tooltips (d20 + favor/hinder): full formula + breakdown + total
  const rollContainers = html.querySelectorAll('.roll-dice-container');
  for (const container of rollContainers) {
    const parts = [];
    for (const child of container.children) {
      if (child.classList.contains('roll-operator')) {
        parts.push(child.textContent.trim());
      } else if (child.classList.contains('roll-modifier')) {
        parts.push(child.textContent.trim());
      } else if (child.classList.contains('vb-die-wrapper')) {
        const faces = child.dataset.faces;
        const val = child.querySelector('.vb-die-val')?.textContent?.trim();
        if (faces && val) parts.push(`d${faces} \u2192 [${val}]`);
      }
    }
    if (!parts.length) continue;

    let formulaLine = '';
    if (message?.rolls?.length) {
      const roll = message.rolls[0];
      if (roll?.formula) formulaLine = roll.formula;
    }

    const breakdown = parts.join('  ');
    let tooltip = '';
    if (formulaLine) tooltip += formulaLine + '\n';
    tooltip += breakdown;
    if (message?.rolls?.[0]) tooltip += '\n= ' + message.rolls[0].total;

    container.title = tooltip;
    container.style.cursor = 'help';
    for (const w of container.querySelectorAll('.vb-die-wrapper')) {
      w.title = tooltip;
      w.style.cursor = 'help';
    }
  }
});

// ---------------------------------------------------------
// Bully Perk — Auto-remove "Grappled Creature" weapon when Restrained is removed
// ---------------------------------------------------------
Hooks.on('deleteActiveEffect', async (effect) => {
  if (!effect.statuses?.has('restrained')) return;
  const grappledBy = effect.flags?.vagabond?.grappledBy;
  if (!grappledBy) return;

  const grappler = game.actors.get(grappledBy);
  if (!grappler) return;

  const victimId = effect.parent?.id;
  if (!victimId) return;

  const bullyWeapon = grappler.items.find(i =>
    i.flags?.vagabond?.bullyWeapon && i.flags?.vagabond?.grappledActorId === victimId
  );
  if (bullyWeapon) {
    await bullyWeapon.delete();
    ui.notifications.info(`${bullyWeapon.name} removed from ${grappler.name}'s inventory.`);
  }
});


// ---------------------------------------------------------
// Fearmonger — Auto-expire Frightened effects from Fearmonger at round change
// ---------------------------------------------------------
Hooks.on('updateCombat', async (combat, changed) => {
  if (!('round' in changed)) return;
  if (!game.user.isGM) return;

  const currentRound = combat.round;
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    const effectsToRemove = [];
    for (const effect of actor.effects) {
      if (!effect.statuses?.has('frightened')) continue;
      const expireRound = effect.flags?.vagabond?.fearmongerExpireRound;
      if (expireRound != null && currentRound > expireRound) {
        effectsToRemove.push(effect.id);
      }
    }

    if (effectsToRemove.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', effectsToRemove);
      ui.notifications.info(`Fearmonger Frightened expired on ${actor.name}`);
    }
  }
});

// ---------------------------------------------------------
// Aggressor — Refresh actor data on combat round/start so speed updates
// ---------------------------------------------------------
Hooks.on('updateCombat', async (combat, changed) => {
  if (!('round' in changed)) return;
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || actor.type !== 'character') continue;
    if (actor.system.hasAggressor) {
      actor.prepareData();
      if (actor.sheet?.rendered) actor.sheet.render(false);
    }
  }
});

Hooks.on('combatStart', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || actor.type !== 'character') continue;
    if (actor.system.hasAggressor) {
      actor.prepareData();
      if (actor.sheet?.rendered) actor.sheet.render(false);
    }
  }
});

// ---------------------------------------------------------
// Rage — Auto-remove Berserk status when combat ends
// ---------------------------------------------------------
Hooks.on('deleteCombat', async (combat) => {
  if (!game.user.isGM) return;

  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;
    if (!actor.statuses?.has('berserk')) continue;

    await actor.toggleStatusEffect('berserk');
    ui.notifications.info(`${actor.name}'s Rage (Berserk) ended with combat.`);
  }
});

/* -------------------------------------------- */
/*  Active Effect Configuration Hook            */
/* -------------------------------------------- */

/**
 * Inject attribute choices into the ActiveEffect configuration form.
 * This provides autocomplete for the "Attribute Key" field.
 */
Hooks.on('renderActiveEffectConfig', (app, html, data) => {
  // Get attribute choices from the VagabondActiveEffect class
  const choices = VagabondActiveEffect.getAttributeChoices();

  // Create a unique datalist ID for this form
  const datalistId = `ae-attribute-choices-${app.document.id}`;

  // Convert html to HTMLElement if it's not already (handle both v11 and v13)
  const element = html instanceof HTMLElement ? html : html[0];
  if (!element) return;

  // Find all attribute key input fields (there can be multiple effect changes)
  const keyInputs = element.querySelectorAll('input[name*=".key"]');

  keyInputs.forEach(keyInput => {
    // Add datalist reference to the input
    keyInput.setAttribute('list', datalistId);
    keyInput.setAttribute('autocomplete', 'off');

    // Add a helpful title/placeholder
    if (!keyInput.getAttribute('placeholder')) {
      keyInput.setAttribute('placeholder', 'Start typing to see suggestions...');
    }
  });

  // Check if datalist already exists (to avoid duplicates)
  if (element.querySelector(`#${datalistId}`)) return;

  // Create the datalist element
  const datalist = document.createElement('datalist');
  datalist.id = datalistId;

  // Add all choices as options
  for (const [key, label] of Object.entries(choices)) {
    const option = document.createElement('option');
    option.value = key;
    option.label = label;
    option.textContent = label;
    datalist.appendChild(option);
  }

  // Append the datalist to the form
  const form = element.querySelector('form');
  if (form) {
    form.appendChild(datalist);
  } else {
    element.appendChild(datalist);
  }

  // Update the first attribute key hint to indicate autocomplete is available
  const firstKeyInput = element.querySelector('input[name="changes.0.key"]');
  if (firstKeyInput) {
    const formGroup = firstKeyInput.closest('.form-group');
    if (formGroup) {
      const hint = formGroup.querySelector('.hint, .notes');
      if (hint && !hint.dataset.updated) {
        hint.textContent = 'Start typing to see autocomplete suggestions for available system variables.';
        hint.dataset.updated = 'true';
      }
    }
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.vagabond.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'vagabond.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

/* -------------------------------------------- */
/* Vagabond System - Secure Content Manager     */
/* -------------------------------------------- */

const SYSTEM_ID = "vagabond";
const SETTING_KEY = "contentUnlocked";

/* -------------------------------------------- */
/* CHALLENGE DATABASE (Base64 Method)           */
/* -------------------------------------------- */
const CHALLENGES = [
  {
    "id": "x7k9p", // Answer: ruin
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGNhdXNlcyB5b3UgdG8gbG9zZSBhbGwgbGFuZCwgcG9zc2Vzc2lvbnMsIGFuZCB3ZWFsdGg/",
    "h": ["cnVpbg=="] 
  },
  {
    "id": "m2j4q", // Answer: fool
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIG1ha2VzIHlvdSBsb3NlIDEgTGV2ZWwgYW5kIGRyYXcgYW5vdGhlciBjYXJkPw==",
    "h": ["Zm9vbA=="]
  },
  {
    "id": "b5v8n", // Answer: rogue
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGNhdXNlcyBhIGZyaWVuZCB0byBwZXJtYW5lbnRseSBoYXRlIHlvdT8=",
    "h": ["cm9ndWU="]
  },
  {
    "id": "w9c1r", // Answer: flames
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGNyZWF0ZXMgYSBwb3dlcmZ1bCBIZWxsc3Bhd24gZW5lbXk/",
    "h": ["ZmxhbWVz"]
  },
  {
    "id": "q3z6l", // Answer: key
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGdyYW50cyB5b3UgYSBGYWJsZWQgUmVsaWMgb2YgeW91ciBjaG9pY2U/",
    "h": ["a2V5"]
  },
  {
    "id": "p0o5t", // Answer: knight
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGdyYW50cyB0aGUgc2VydmljZSBvZiBhbiBBbGx5IGNoYW1waW9uIGNvbXBhbmlvbj8=",
    "h": ["a25pZ2h0"]
  },
  {
    "id": "y2x4u", // Answer: idiot
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGRlY3JlYXNlcyB5b3VyIFJlYXNvbiBieSBkNj8=",
    "h": ["aWRpb3Q="]
  },
  {
    "id": "r8n1s", // Answer: comet
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIHJlcXVpcmVzIHlvdSB0byBkZWZlYXQgdGhlIG5leHQgRW5lbXkgYWxvbmUgdG8gZ2FpbiBhIExldmVsPw==",
    "h": ["Y29tZXQ="]
  },
  {
    "id": "k6m3d", // Answer: jester
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGdyYW50cyB5b3UgMSBMZXZlbCBvciBsZXRzIHlvdSBkcmF3IHR3byBjYXJkcz8=",
    "h": ["amVzdGVy"]
  },
  {
    "id": "g4h7j", // Answer: omlarcat
    "q": "SW4gdGhlIHJlbGljIENsb2FrIG9mIERpc3BsYWNlbWVudCB3aGF0IGNyZWF0dXJlJ3MgZnVyIGlzIHRoZSBjb2F0IG1hZGUgZnJvbT8=",
    "h": ["b21sYXJjYXQ="]
  },
  {
    "id": "l9k2p", // Answer: darksight
    "q": "SW4gdGhlIHJlbGljIEJsYWNrIFdpbmcgd2hhdCB2aXNpb24gYWJpbGl0eSBkb2VzIGl0IGdyYW50IHdoaWxlIGVxdWlwcGVkPw==",
    "h": ["ZGFya3NpZ2h0"]
  },
  {
    "id": "v1f5c", // Answer: balance
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGluY3JlYXNlcyB0aGUgYm9udXMgb2YgdGhyZWUgUmVsaWNzIGJ5IDE/",
    "h": ["YmFsYW5jZQ=="]
  },
  {
    "id": "d3s9a", // Answer: moon
    "q": "SW4gdGhlIHJlbGljIERlY2sgb2YgTWFueSBUaGluZ3Mgd2hhdCBjYXJkIGdyYW50cyB0aHJlZSB3aXNoZXMgdGhhdCBtdXN0IGJlIG1hZGUgd2l0aGluIDEwIG1pbnV0ZXM/",
    "h": ["bW9vbg=="]
  }
];

/* -------------------------------------------- */
/* Initialization & Settings                   */
/* -------------------------------------------- */

Hooks.once('init', () => {
  game.settings.register(SYSTEM_ID, SETTING_KEY, {
    name: 'Content Unlocked',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });
});

/* -------------------------------------------- */
/* UI Interaction (Compendium Directory)       */
/* -------------------------------------------- */

Hooks.on('renderCompendiumDirectory', (app, html, data) => {
  const isUnlocked = game.settings.get(SYSTEM_ID, SETTING_KEY);
  const directoryElement = html instanceof HTMLElement ? html : html[0];
  
  if (isUnlocked) {
    const existingBtn = directoryElement.querySelector('#vagabond-unlock-btn');
    if (existingBtn) existingBtn.remove();
    return;
  }

  // Hide Packs
  game.packs.forEach(pack => {
    if (pack.metadata.packageName === SYSTEM_ID) {
      const packElement = directoryElement.querySelector(`[data-pack="${pack.collection}"]`);
      if (packElement) packElement.remove();
    }
  });

  // Cleanup folders
  directoryElement.querySelectorAll('.directory-group').forEach(dir => {
    const list = dir.querySelector('ol');
    if (list && list.children.length === 0) dir.style.display = 'none';
  });

  // Only show unlock button to GMs — players get access once the GM unlocks
  if (!game.user.isGM) return;

  // Inject Button
  if (!directoryElement.querySelector('#vagabond-unlock-btn')) {
    const unlockBtn = document.createElement("button");
    unlockBtn.id = "vagabond-unlock-btn";
    unlockBtn.innerHTML = `<i class="fas fa-key"></i> Unlock System Content`;
    unlockBtn.style.cssText = `
      width: 96%; margin: 10px 2%; padding: 8px;
      background: #222; color: #fff; border: 1px solid #444;
      cursor: pointer; font-family: monospace; text-transform: uppercase;
    `;
    unlockBtn.onclick = (e) => {
      e.preventDefault();
      promptRandomChallenge();
    };

    const header = directoryElement.querySelector('.directory-header');
    if (header) header.after(unlockBtn);
    else directoryElement.prepend(unlockBtn);
  }
});

/* -------------------------------------------- */
/* Token HUD — Party Gather / Release           */
/* -------------------------------------------- */

/**
 * Compute spread positions for released party members.
 * Returns {x, y} pixel offsets relative to the party token, radiating outward ring by ring.
 */
function _partyReleaseOffsets(count, gridSize) {
  const offsets = [];
  for (let ring = 1; offsets.length < count; ring++) {
    for (let dx = -ring; dx <= ring && offsets.length < count; dx++) {
      for (let dy = -ring; dy <= ring && offsets.length < count; dy++) {
        if (Math.abs(dx) === ring || Math.abs(dy) === ring) {
          offsets.push({ x: dx * gridSize, y: dy * gridSize });
        }
      }
    }
  }
  return offsets;
}

async function _gatherParty(token, actor) {
  const members = actor.system.members ?? [];
  if (!members.length) {
    ui.notifications.warn(game.i18n.localize('VAGABOND.Actor.Party.TokenHUD.NoMembers'));
    return false;
  }

  const { x: px, y: py } = token.document;

  // Collect all member tokens currently on the scene
  const memberTokens = [];
  const gatheredUuids = [];
  for (const memberUuid of members) {
    const memberActor = await fromUuid(memberUuid);
    if (!memberActor) continue;
    for (const mt of canvas.tokens.placeables.filter(t => t.document.actorId === memberActor.id)) {
      memberTokens.push(mt);
      gatheredUuids.push(memberUuid);
    }
  }

  if (!memberTokens.length) {
    ui.notifications.warn(game.i18n.localize('VAGABOND.Actor.Party.TokenHUD.NoTokens'));
    return false;
  }

  // Warn about unlinked tokens before any movement — their delta data (HP, conditions, etc.)
  // will be preserved via the saved token snapshot, but the user should know.
  const unlinkedNames = memberTokens.filter(mt => !mt.document.actorLink).map(mt => mt.name);
  if (unlinkedNames.length) {
    ui.notifications.warn(game.i18n.format('VAGABOND.Actor.Party.TokenHUD.UnlinkedWarning', { names: unlinkedNames.join(', ') }));
  }

  // Snapshot the full token document data (including delta for unlinked tokens)
  // so Release can recreate exact copies, not fresh prototypes.
  const savedTokenData = memberTokens.map(mt => {
    const { _id, ...data } = mt.document.toObject();
    return data;
  });

  // Move all tokens to the party token (triggers the animation)
  await Promise.all(memberTokens.map(mt => mt.document.update({ x: px, y: py })));

  // Wait for the movement animation to finish before deleting
  await new Promise(resolve => setTimeout(resolve, 700));

  // Delete the tokens from the scene
  await canvas.scene.deleteEmbeddedDocuments('Token', memberTokens.map(mt => mt.id));

  // Store full snapshots so Release recreates the exact same tokens
  await actor.setFlag('vagabond', 'gatheredTokenData', savedTokenData);
  await actor.setFlag('vagabond', 'partyGathered', true);

  ui.notifications.info(game.i18n.format('VAGABOND.Actor.Party.TokenHUD.GatherDone', { count: memberTokens.length }));
  return true;
}

async function _releaseParty(token, actor) {
  const savedTokenData = actor.getFlag('vagabond', 'gatheredTokenData') ?? [];
  if (!savedTokenData.length) {
    ui.notifications.warn(game.i18n.localize('VAGABOND.Actor.Party.TokenHUD.NoMembers'));
    return false;
  }

  const { x: px, y: py } = token.document;
  const gridSize = canvas.grid.size;
  const offsets = _partyReleaseOffsets(savedTokenData.length, gridSize);

  // Recreate each token from its full snapshot, placed at a spread position.
  // This restores everything — including delta data for unlinked tokens.
  const tokenDataArray = savedTokenData.map((data, i) => {
    const off = offsets[i] ?? { x: 0, y: 0 };
    return { ...data, x: px + off.x, y: py + off.y };
  });

  await canvas.scene.createEmbeddedDocuments('Token', tokenDataArray);

  await actor.unsetFlag('vagabond', 'gatheredTokenData');
  await actor.setFlag('vagabond', 'partyGathered', false);

  ui.notifications.info(game.i18n.localize('VAGABOND.Actor.Party.TokenHUD.ReleaseDone'));
  return true;
}

Hooks.on('renderTokenHUD', (hud, html) => {
  // In Foundry v13, TokenHUD is ApplicationV2: token is hud.object (not hud.token)
  const token = hud.object;
  if (token?.actor?.type !== 'party') return;

  const leftCol = html.querySelector('.col.left');
  if (!leftCol) return;

  const actor = token.actor;
  const isGathered = actor.getFlag('vagabond', 'partyGathered') ?? false;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.classList.add('control-icon', 'vagabond-party-gather-toggle');
  if (isGathered) btn.classList.add('active');
  btn.setAttribute('data-tooltip', game.i18n.localize(
    isGathered ? 'VAGABOND.Actor.Party.TokenHUD.ReleaseTooltip' : 'VAGABOND.Actor.Party.TokenHUD.GatherTooltip'
  ));
  btn.innerHTML = isGathered
    ? '<i class="fas fa-expand-arrows-alt"></i>'
    : '<i class="fas fa-compress-arrows-alt"></i>';

  btn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const gathered = actor.getFlag('vagabond', 'partyGathered') ?? false;
    const success = gathered ? await _releaseParty(token, actor) : await _gatherParty(token, actor);
    if (success) hud.render();
  });

  leftCol.appendChild(btn);
});

/* -------------------------------------------- */
/* Logic & Dialogs (BASE64 METHOD)             */
/* -------------------------------------------- */

async function promptRandomChallenge() {
  if (CHALLENGES.length === 0) {
    ui.notifications.warn("No challenges configured.");
    return;
  }

  const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  const questionText = decodeURIComponent(escape(window.atob(challenge.q)));
  
  const { DialogV2 } = foundry.applications.api;

  const userResponse = await DialogV2.wait({
    window: { 
        title: "Security Check",
        icon: "fas fa-user-secret"
    },
    content: `
      <div style="text-align: center; padding: 10px;">
        <h5 style="font-weight: bold; margin-bottom: 10px;">${questionText}</h5>
        <p style="margin-bottom: 10px;">One word answer:</p>
        <div class="form-group">
            <input type="password" name="unlock-attempt" id="secret-attempt" placeholder="Answer..." style="text-align: center; width: 100%;" autofocus>
        </div>
      </div>
    `,
    buttons: [{
      action: "submit",
      label: "Verify",
      icon: "fas fa-check",
      callback: (event, button, dialog) => {
        return dialog.element.querySelector('#secret-attempt').value;
      }
    }],
    submit: (result) => {
        return result["unlock-attempt"]; 
    },
    close: () => { return null; }
  });

  if (!userResponse) return;

  const cleanInput = userResponse.trim().toLowerCase();

  // -- MASTER OVERRIDE --
  if (cleanInput === "vagabond_override") {
      ui.notifications.info("Master Key Accepted.");
      await game.settings.set(SYSTEM_ID, SETTING_KEY, true);
      ui.sidebar.render();
      return;
  }
  
  // -- BASE64 CONVERSION --
  // This uses standard browser encoding. It is consistent everywhere.
  const encodedAttempt = window.btoa(cleanInput);

  if (challenge.h.includes(encodedAttempt)) {
    ui.notifications.info("Access Granted.");
    await game.settings.set(SYSTEM_ID, SETTING_KEY, true);
    ui.sidebar.render(); 
  } else {
    ui.notifications.error("Access Denied.");
  }
}